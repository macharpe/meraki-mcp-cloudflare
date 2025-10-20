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

	constructor(env: Env) {
		this.kv = env.CACHE_KV;
		this.env = env;
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
}

// Cache key generators for consistent naming
export const CacheKeys = {
	// Meraki API caching
	organizations: () => "meraki:organizations",
	networks: (orgId: string) => `meraki:networks:${orgId}`,
	devices: (networkId: string) => `meraki:devices:${networkId}`,
	clients: (networkId: string, timespan: number) =>
		`meraki:clients:${networkId}:${timespan}`,

	// JWKS caching
	jwks: (url: string) => `jwks:${btoa(url)}`, // base64 encode URL for safe key

	// OAuth client caching
	oauthClient: (clientId: string) => `oauth:client:${clientId}`,
} as const;

// Cache TTL helper functions
export const CacheTTL = {
	// Get TTL values from environment or use defaults
	ORGANIZATIONS: (env: Env) =>
		parseInt(env.CACHE_TTL_ORGANIZATIONS || "1800", 10), // 30 minutes default
	NETWORKS: (env: Env) => parseInt(env.CACHE_TTL_NETWORKS || "900", 10), // 15 minutes default
	JWKS_KEYS: (env: Env) => parseInt(env.CACHE_TTL_JWKS || "3600", 10), // 1 hour default

	// Fixed TTL values for other data types
	DEVICES: 300, // 5 minutes
	CLIENTS: 300, // 5 minutes - clients change frequently
	OAUTH_CLIENTS: 1800, // 30 minutes
	API_RESPONSES: 60, // 1 minute for general API responses
} as const;
