export interface Env {
	MERAKI_API_KEY: string;
	MERAKI_BASE_URL?: string;

	// Cache TTL configuration (optional)
	CACHE_TTL_ORGANIZATIONS?: string;
	CACHE_TTL_NETWORKS?: string;

	// KV namespace for API response caching
	CACHE_KV: KVNamespace;

	// Durable Object binding for MCP Agent
	MCP_OBJECT: DurableObjectNamespace;
}
