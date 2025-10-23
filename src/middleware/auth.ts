import { verifyToken } from "../access-handler";
import type { Env } from "../types/env";

export interface AuthResult {
	authenticated: boolean;
	token?: string;
	claims?: {
		sub: string;
		email: string;
		name: string;
		exp: number;
	};
	error?: {
		code: string;
		message: string;
	};
}

/**
 * Authenticates MCP requests by extracting and verifying Bearer tokens.
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Worker environment bindings
 * @returns AuthResult indicating success or failure with error details
 */
export async function authenticateMcpRequest(
	request: Request,
	env: Env,
): Promise<AuthResult> {
	// 1. Extract Authorization header
	const authHeader = request.headers.get("Authorization");
	if (!authHeader) {
		return {
			authenticated: false,
			error: {
				code: "missing_token",
				message: "Authorization header is required",
			},
		};
	}

	// 2. Parse Bearer token
	const match = authHeader.match(/^Bearer\s+(\S+)$/i);
	if (!match || !match[1]) {
		return {
			authenticated: false,
			error: {
				code: "invalid_format",
				message: "Authorization must be 'Bearer <token>'",
			},
		};
	}

	const token: string = match[1];

	// 3. Verify token using existing verifyToken function
	try {
		const claims = await verifyToken(env, token);

		// Extract standard claims
		const sub = claims.sub || "";
		const email = claims.email || "";
		const name = claims.name || "";
		const exp = claims.exp || 0;

		return {
			authenticated: true,
			token,
			claims: {
				sub,
				email,
				name,
				exp,
			},
		};
	} catch (error) {
		console.error("[AUTH] Token verification failed:", error);

		// Determine error code based on error type
		const errorMessage =
			error instanceof Error ? error.message : "Token verification failed";
		const errorCode = errorMessage.toLowerCase().includes("expired")
			? "expired_token"
			: "invalid_token";

		return {
			authenticated: false,
			error: {
				code: errorCode,
				message: errorMessage,
			},
		};
	}
}

/**
 * Creates a standards-compliant 401 Unauthorized response with proper OAuth headers.
 *
 * @param baseUrl - The base URL of the server (e.g., "https://meraki-mcp.macharpe.com")
 * @param error - Error details including code and message
 * @returns Response object with 401 status and WWW-Authenticate header
 */
export function createUnauthorizedResponse(
	baseUrl: string,
	error: { code: string; message: string },
): Response {
	// Construct WWW-Authenticate header per RFC 6750
	const authHeader = [
		'Bearer realm="Meraki MCP Server"',
		`authorization_uri="${baseUrl}/authorize"`,
		`error="${error.code}"`,
		`error_description="${error.message}"`,
	].join(", ");

	// Return JSON-RPC 2.0 error response
	return new Response(
		JSON.stringify({
			jsonrpc: "2.0",
			error: {
				code: -32001,
				message: "Authentication required",
				data: {
					authorization_uri: `${baseUrl}/authorize`,
					token_endpoint: `${baseUrl}/token`,
					error: error.code,
					error_description: error.message,
				},
			},
		}),
		{
			status: 401,
			headers: {
				"Content-Type": "application/json",
				"WWW-Authenticate": authHeader,
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers":
					"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
			},
		},
	);
}
