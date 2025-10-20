// OAuth helper functions to replace @cloudflare/workers-oauth-provider dependency

import type { Env } from "./types/env";

// Type definitions that were previously imported from @cloudflare/workers-oauth-provider
export interface AuthRequest {
	clientId: string;
	redirectUri: string;
	state?: string;
	scope?: string;
	responseType?: string;
	codeChallenge?: string;
	codeChallengeMethod?: string;
}

export interface ClientInfo {
	clientId: string;
	clientName?: string;
	clientUri?: string;
	redirectUris?: string[];
	scope?: string;
}

export interface OAuthHelpers {
	parseAuthRequest(request: Request): Promise<AuthRequest>;
	lookupClient(clientId: string): Promise<ClientInfo | null>;
	completeAuthorization(
		options: CompleteAuthorizationOptions,
	): Promise<{ redirectTo: string }>;
}

export interface CompleteAuthorizationOptions {
	request: AuthRequest;
	userId: string;
	scope: string | undefined;
	props: Record<string, unknown>;
	metadata?: {
		label?: string;
	};
}

/**
 * Creates OAuth helper functions bound to an environment
 */
export function createOAuthHelpers(env: Env): OAuthHelpers {
	return {
		/**
		 * Parse OAuth authorization request from URL parameters
		 */
		async parseAuthRequest(request: Request): Promise<AuthRequest> {
			const url = new URL(request.url);
			const params = url.searchParams;

			const clientId = params.get("client_id");
			if (!clientId) {
				throw new Error("Missing client_id parameter");
			}

			const authRequest: AuthRequest = {
				clientId,
				redirectUri: params.get("redirect_uri") || "",
				scope: params.get("scope") || "meraki:read",
				responseType: params.get("response_type") || "code",
			};

			const state = params.get("state");
			if (state) {
				authRequest.state = state;
			}

			const codeChallenge = params.get("code_challenge");
			if (codeChallenge) {
				authRequest.codeChallenge = codeChallenge;
			}

			const codeChallengeMethod = params.get("code_challenge_method");
			if (codeChallengeMethod) {
				authRequest.codeChallengeMethod = codeChallengeMethod;
			}

			return authRequest;
		},

		/**
		 * Look up client information from KV storage
		 */
		async lookupClient(clientId: string): Promise<ClientInfo | null> {
			if (!env.OAUTH_KV) {
				// If no KV storage, return a default client for development
				return {
					clientId,
					clientName: clientId,
					scope: "meraki:read",
				};
			}

			try {
				const clientData = await env.OAUTH_KV.get(`client:${clientId}`);
				if (!clientData) {
					// Return basic info if client not found in KV
					return {
						clientId,
						clientName: clientId,
						scope: "meraki:read",
					};
				}

				const client = JSON.parse(clientData);
				return {
					clientId: client.client_id,
					clientName: client.client_name || clientId,
					clientUri: client.client_uri,
					redirectUris: client.redirect_uris,
					scope: client.scope || "meraki:read",
				};
			} catch (error) {
				console.error("Error looking up client:", clientId, error);
				// Return basic info on error
				return {
					clientId,
					clientName: clientId,
					scope: "meraki:read",
				};
			}
		},

		/**
		 * Complete OAuth authorization and generate redirect URL with code
		 */
		async completeAuthorization(
			options: CompleteAuthorizationOptions,
		): Promise<{ redirectTo: string }> {
			const { request, userId, scope, props, metadata } = options;
			const finalScope = scope || "meraki:read";

			// Generate authorization code
			const code = crypto.randomUUID();

			// Store authorization details in KV for later token exchange
			if (env.OAUTH_KV) {
				const authData = {
					clientId: request.clientId,
					userId,
					scope: finalScope,
					props,
					metadata,
					createdAt: Date.now(),
					expiresAt: Date.now() + 600000, // 10 minutes
				};

				// Store with TTL
				await env.OAUTH_KV.put(
					`auth_code:${code}`,
					JSON.stringify(authData),
					{ expirationTtl: 600 }, // 10 minutes
				);
			}

			// Build redirect URL with authorization code
			const redirectUrl = new URL(request.redirectUri);
			redirectUrl.searchParams.set("code", code);

			if (request.state) {
				redirectUrl.searchParams.set("state", request.state);
			}

			return {
				redirectTo: redirectUrl.toString(),
			};
		},
	};
}
