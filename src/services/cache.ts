// Cache service for optimizing API responses and external data
import type { Env } from "../types/env";

export interface CacheOptions {
	ttl?: number; // Time to live in seconds
	namespace?: string; // Cache namespace prefix
}

export class CacheService {
	private kv: KVNamespace;
	private defaultTtl: number = 300; // 5 minutes default
	private env: Env;
	private workersCache: Cache;

	constructor(env: Env) {
		this.kv = env.CACHE_KV;
		this.env = env;
		this.workersCache = (caches as any).default as Cache;
	}

	/**
	 * Generate cache key with namespace prefix
	 */
	private getCacheKey(key: string, namespace?: string): string {
		return namespace ? `${namespace}:${key}` : key;
	}

	/**
	 * Get cached value with optional type safety
	 */
	async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
		if (!this.kv) {
			return null;
		}

		try {
			const cacheKey = this.getCacheKey(key, options?.namespace);
			const cached = await this.kv.get(cacheKey, "json");

			if (cached) {
				console.log("[CACHE] Hit for key:", cacheKey);
				return cached as T;
			}

			console.log("[CACHE] Miss for key:", cacheKey);
			return null;
		} catch (error) {
			console.error("[CACHE] Error getting key:", key, error);
			return null;
		}
	}

	/**
	 * Set cached value with TTL
	 */
	async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
		if (!this.kv) {
			return;
		}

		try {
			const cacheKey = this.getCacheKey(key, options?.namespace);
			const ttl = options?.ttl || this.defaultTtl;

			await this.kv.put(cacheKey, JSON.stringify(value), {
				expirationTtl: ttl,
			});

			console.log("[CACHE] Set key:", cacheKey, "(TTL:", `${ttl}s)`);
		} catch (error) {
			console.error("[CACHE] Error setting key:", key, error);
		}
	}

	/**
	 * Delete cached value
	 */
	async delete(key: string, options?: CacheOptions): Promise<void> {
		if (!this.kv) {
			return;
		}

		try {
			const cacheKey = this.getCacheKey(key, options?.namespace);
			await this.kv.delete(cacheKey);
			console.log("[CACHE] Deleted key:", cacheKey);
		} catch (error) {
			console.error("[CACHE] Error deleting key:", key, error);
		}
	}

	/**
	 * Get or set pattern - fetch from cache or execute function and cache result
	 */
	async getOrSet<T>(
		key: string,
		fetchFunction: () => Promise<T>,
		options?: CacheOptions,
	): Promise<T> {
		// Try to get from cache first
		const cached = await this.get<T>(key, options);
		if (cached !== null) {
			return cached;
		}

		// Cache miss - execute function and cache result
		try {
			const result = await fetchFunction();
			await this.set(key, result, options);
			return result;
		} catch (error) {
			console.error("[CACHE] Error in getOrSet for key:", key, error);
			throw error;
		}
	}

	/**
	 * Workers Cache API layer - faster than KV for frequently accessed data
	 * Provides two-tier caching: Workers Cache (edge) -> KV (persistent)
	 */
	async getWithWorkersCache<T>(
		key: string,
		fetchFunction: () => Promise<T>,
		options?: CacheOptions,
	): Promise<{ data: T; cacheStatus: "HIT" | "MISS" }> {
		const cacheKey = new Request(
			`https://cache.internal/${this.getCacheKey(key, options?.namespace)}`,
		);

		try {
			// Layer 1: Try Workers Cache API first (fastest - sub-millisecond)
			const cachedResponse = await this.workersCache.match(cacheKey);
			if (cachedResponse) {
				const data = (await cachedResponse.json()) as T;
				console.log("[WORKERS_CACHE] HIT for key:", key);
				return { data, cacheStatus: "HIT" };
			}

			console.log("[WORKERS_CACHE] MISS for key:", key);

			// Layer 2: Try KV cache (medium speed - 10-50ms)
			const kvCached = await this.get<T>(key, options);
			if (kvCached !== null) {
				console.log("[KV_CACHE] HIT for key:", key);

				// Store in Workers Cache for next request (non-blocking)
				const response = new Response(JSON.stringify(kvCached), {
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": `max-age=${options?.ttl || this.defaultTtl}`,
					},
				});
				await this.workersCache.put(cacheKey, response);

				return { data: kvCached, cacheStatus: "MISS" };
			}

			console.log("[KV_CACHE] MISS for key:", key);

			// Layer 3: Complete cache miss - fetch from origin (slowest)
			const result = await fetchFunction();

			// Store in both caches (non-blocking for Workers Cache)
			const ttl = options?.ttl || this.defaultTtl;
			await this.set(key, result, options); // Store in KV

			const response = new Response(JSON.stringify(result), {
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": `max-age=${ttl}`,
				},
			});
			await this.workersCache.put(cacheKey, response); // Store in Workers Cache

			return { data: result, cacheStatus: "MISS" };
		} catch (error) {
			console.error(
				"[CACHE] Error in getWithWorkersCache for key:",
				key,
				error,
			);
			// Fallback to direct fetch on cache error
			const result = await fetchFunction();
			return { data: result, cacheStatus: "MISS" };
		}
	}
}

// Cache key generators for consistent naming
export const CacheKeys = {
	// Meraki API caching
	organizations: () => "meraki:organizations",
	networks: (orgId: string) => `meraki:networks:${orgId}`,
	devices: (networkId: string) => `meraki:devices:${networkId}`,
	clients: (networkId: string, timespan: number) =>
		`meraki:clients:${networkId}:${timespan}`,
} as const;

// Cache TTL helper functions
export const CacheTTL = {
	// Get TTL values from environment or use defaults
	ORGANIZATIONS: (env: Env) =>
		parseInt(env.CACHE_TTL_ORGANIZATIONS || "1800", 10), // 30 minutes default
	NETWORKS: (env: Env) => parseInt(env.CACHE_TTL_NETWORKS || "900", 10), // 15 minutes default

	// Fixed TTL values for other data types
	DEVICES: 300, // 5 minutes
	CLIENTS: 300, // 5 minutes - clients change frequently
	API_RESPONSES: 60, // 1 minute for general API responses
} as const;
