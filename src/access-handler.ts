// Simplified base64url utilities for Cloudflare Workers
function base64urlDecode(input: string): string {
	const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
	const padding = "=".repeat((4 - (base64.length % 4)) % 4);
	return atob(base64 + padding);
}

function base64urlEncode(input: string): string {
	return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function stringToArrayBuffer(str: string): ArrayBuffer {
	const buf = new ArrayBuffer(str.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

import type { AuthRequest } from "./oauth-helpers";
import { createOAuthHelpers } from "./oauth-helpers";
import { CacheKeys, CacheService, CacheTTL } from "./services/cache";
import type { Env } from "./types/env";
import {
	clientIdAlreadyApproved,
	fetchUpstreamAuthToken,
	getUpstreamAuthorizeUrl,
	parseRedirectApproval,
	renderApprovalDialog,
} from "./workers-oauth-utils";

type EnvWithOauth = Env;

export async function handleAccessRequest(
	request: Request,
	env: EnvWithOauth,
	_ctx: ExecutionContext,
) {
	const { pathname, searchParams } = new URL(request.url);

	if (request.method === "GET" && pathname === "/authorize") {
		const oauthHelpers = createOAuthHelpers(env);
		const oauthReqInfo = await oauthHelpers.parseAuthRequest(request);
		const { clientId } = oauthReqInfo;
		if (!clientId) {
			return new Response("Invalid request", { status: 400 });
		}

		// Check if client was already approved
		if (
			await clientIdAlreadyApproved(
				request,
				oauthReqInfo.clientId,
				env.COOKIE_ENCRYPTION_KEY,
			)
		) {
			return redirectToAccess(request, env, oauthReqInfo);
		}

		// Show approval dialog
		return renderApprovalDialog(request, {
			client: await oauthHelpers.lookupClient(clientId),
			server: {
				name: "Cisco Meraki MCP Server",
				logo: "https://avatars.githubusercontent.com/u/314135?s=200&v=4",
				description:
					"This MCP server provides AI assistants with direct access to Cisco Meraki network management capabilities.",
			},
			state: { oauthReqInfo },
		});
	}

	if (request.method === "POST" && pathname === "/authorize") {
		// Process approval form submission
		const { state, headers } = await parseRedirectApproval(
			request,
			env.COOKIE_ENCRYPTION_KEY,
		);
		if (!state || typeof state !== "object" || !("oauthReqInfo" in state)) {
			return new Response("Invalid request", { status: 400 });
		}

		return redirectToAccess(request, env, (state as any).oauthReqInfo, headers);
	}

	if (request.method === "GET" && pathname === "/callback") {
		// Get the oauthReqInfo out of state parameter
		const state = searchParams.get("state");
		if (!state) {
			return new Response("Missing state parameter", { status: 400 });
		}
		const oauthReqInfo = JSON.parse(base64urlDecode(state)) as AuthRequest;
		if (!oauthReqInfo.clientId) {
			return new Response("Invalid state", { status: 400 });
		}

		// Retrieve code verifier from KV storage using the same key format used for storage
		// The storage key is created by base64url encoding the oauthReqInfo, so we recreate it here
		const stateKey = base64urlEncode(JSON.stringify(oauthReqInfo));
		const codeVerifier = await env.OAUTH_KV.get(`code_verifier:${stateKey}`);
		if (!codeVerifier) {
			return new Response("Missing code verifier", { status: 400 });
		}

		// Exchange the code for an access token with PKCE
		const [accessToken, idToken, errResponse] = await fetchUpstreamAuthToken({
			client_id: env.ACCESS_CLIENT_ID,
			client_secret: env.ACCESS_CLIENT_SECRET,
			code: searchParams.get("code") ?? undefined,
			redirect_uri: new URL("/callback", request.url).href,
			upstream_url: env.ACCESS_TOKEN_URL,
			codeVerifier,
		});
		if (errResponse) {
			return errResponse;
		}

		// Clean up code verifier from KV
		await env.OAUTH_KV.delete(`code_verifier:${stateKey}`);

		const idTokenClaims = await verifyToken(env, idToken);
		const user = {
			email: idTokenClaims.email,
			name: idTokenClaims.name,
			sub: idTokenClaims.sub,
		};

		// Return back to the MCP client a new token
		const oauthHelpers = createOAuthHelpers(env);
		const { redirectTo } = await oauthHelpers.completeAuthorization({
			metadata: {
				label: user.name,
			},
			// This will be available as props in the MCP agent
			props: {
				accessToken,
				email: user.email,
				login: user.sub,
				name: user.name,
			},
			request: oauthReqInfo,
			scope: oauthReqInfo.scope,
			userId: user.sub,
		});
		return Response.redirect(redirectTo);
	}

	// Handle dynamic client registration
	if (request.method === "POST" && pathname === "/register") {
		console.error(`[DEBUG] Client registration request`);

		try {
			const body = (await request.json()) as any;
			const { client_name, redirect_uris, scope, grant_types } = body;

			// Generate a new client ID and secret
			const clientId = `meraki_mcp_${crypto.randomUUID()}`;
			const clientSecret = crypto.randomUUID();

			// Store client registration in KV
			const clientData = {
				client_id: clientId,
				client_secret: clientSecret,
				client_name: client_name || "MCP Client",
				redirect_uris: redirect_uris || [
					`${new URL(request.url).origin}/callback`,
				],
				scope: scope || "meraki:read",
				grant_types: grant_types || ["authorization_code"],
				registered_at: new Date().toISOString(),
			};

			await env.OAUTH_KV.put(`client:${clientId}`, JSON.stringify(clientData));

			// Return client credentials (following RFC 7591)
			return new Response(
				JSON.stringify({
					client_id: clientId,
					client_secret: clientSecret,
					client_name: clientData.client_name,
					redirect_uris: clientData.redirect_uris,
					grant_types: clientData.grant_types,
					scope: clientData.scope,
					token_endpoint_auth_method: "client_secret_post",
				}),
				{
					status: 201,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
						"Cache-Control": "no-store",
					},
				},
			);
		} catch (error) {
			console.error(`[ERROR] Client registration failed:`, error);
			return new Response(
				JSON.stringify({
					error: "invalid_request",
					error_description: "Invalid registration request",
				}),
				{
					status: 400,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
		}
	}

	if (pathname === "/health") {
		return new Response(
			JSON.stringify({
				status: "OK",
				service: "Cisco Meraki MCP Server",
				timestamp: new Date().toISOString(),
				oauthEnabled: !!(env.ACCESS_CLIENT_ID && env.ACCESS_CLIENT_SECRET),
				version: "1.0.0",
				endpoints: [
					"/mcp",
					"/sse",
					"/health",
					"/authorize",
					"/callback",
					"/token",
					"/register",
					"/.well-known/oauth-authorization-server",
					"/.well-known/jwks.json",
				],
			}),
			{
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
					"Cache-Control": "public, max-age=300, s-maxage=600", // 5min browser, 10min edge
				},
			},
		);
	}

	if (pathname === "/") {
		return Response.redirect(`${new URL(request.url).origin}/authorize`, 302);
	}

	return new Response("Not Found", { status: 404 });
}

async function redirectToAccess(
	request: Request,
	env: Env,
	oauthReqInfo: AuthRequest,
	headers: Record<string, string> = {},
) {
	// Generate PKCE code verifier and challenge
	const { url, codeVerifier } = await getUpstreamAuthorizeUrl({
		client_id: env.ACCESS_CLIENT_ID,
		redirect_uri: new URL("/callback", request.url).href,
		scope: "openid email profile",
		state: base64urlEncode(JSON.stringify(oauthReqInfo)),
		upstream_url: env.ACCESS_AUTHORIZATION_URL,
	});

	// Store code verifier in KV for use in callback
	const stateKey = base64urlEncode(JSON.stringify(oauthReqInfo));
	await env.OAUTH_KV.put(
		`code_verifier:${stateKey}`,
		codeVerifier,
		{ expirationTtl: 600 }, // 10 minutes
	);

	return new Response(null, {
		headers: {
			...headers,
			location: url,
		},
		status: 302,
	});
}

/**
 * Helper to get the Access public keys from the certs endpoint with caching
 */
async function fetchAccessPublicKey(env: Env, kid: string) {
	if (!env.ACCESS_JWKS_URL) {
		throw new Error("access jwks url not provided");
	}

	const cache = new CacheService(env);
	const cacheKey = CacheKeys.jwks(env.ACCESS_JWKS_URL);

	// Try to get cached JWKS
	let keys = await cache.get<{ keys: (JsonWebKey & { kid: string })[] }>(
		cacheKey,
	);

	if (!keys) {
		// Cache miss - fetch fresh JWKS
		const resp = await fetch(env.ACCESS_JWKS_URL);
		keys = (await resp.json()) as {
			keys: (JsonWebKey & { kid: string })[];
		};

		// Cache the JWKS with TTL
		await cache.set(cacheKey, keys, { ttl: CacheTTL.JWKS_KEYS(env) });
	}

	const jwk = keys.keys.filter((key) => key.kid === kid)[0];
	if (!jwk) {
		throw new Error(`Key with kid ${kid} not found`);
	}

	const key = await crypto.subtle.importKey(
		"jwk",
		jwk,
		{
			hash: "SHA-256",
			name: "RSASSA-PKCS1-v1_5",
		},
		false,
		["verify"],
	);
	return key;
}

/**
 * Parse a JWT into its respective pieces. Does not do any validation other than form checking.
 */
function parseJWT(token: string) {
	const tokenParts = token.split(".");

	if (
		tokenParts.length !== 3 ||
		!tokenParts[0] ||
		!tokenParts[1] ||
		!tokenParts[2]
	) {
		throw new Error("token must have 3 parts");
	}

	return {
		data: `${tokenParts[0]}.${tokenParts[1]}`,
		header: JSON.parse(base64urlDecode(tokenParts[0])) as { kid: string },
		payload: JSON.parse(base64urlDecode(tokenParts[1])),
		signature: tokenParts[2],
	};
}

/**
 * Validates the provided token using the Access public key set
 */
export async function verifyToken(env: Env, token: string) {
	const jwt = parseJWT(token);
	const key = await fetchAccessPublicKey(env, jwt.header.kid);

	const verified = await crypto.subtle.verify(
		"RSASSA-PKCS1-v1_5",
		key,
		stringToArrayBuffer(base64urlDecode(jwt.signature)),
		stringToArrayBuffer(jwt.data),
	);

	if (!verified) {
		throw new Error("failed to verify token");
	}

	const claims = jwt.payload;
	const now = Math.floor(Date.now() / 1000);
	// Validate expiration
	if (claims.exp < now) {
		throw new Error("expired token");
	}

	return claims;
}
