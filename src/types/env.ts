export interface Env {
	MERAKI_API_KEY: string;
	MERAKI_BASE_URL?: string;

	// OAuth-related secrets for Cloudflare Access integration
	ACCESS_CLIENT_ID: string;
	ACCESS_CLIENT_SECRET: string;
	ACCESS_TOKEN_URL: string;
	ACCESS_AUTHORIZATION_URL: string;
	ACCESS_JWKS_URL: string;
	COOKIE_ENCRYPTION_KEY: string;

	// KV namespace for OAuth session storage
	OAUTH_KV: KVNamespace;

	// Durable Object binding for MCP Agent
	MCP_OBJECT: DurableObjectNamespace;
}
