import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	authenticateMcpRequest,
	createUnauthorizedResponse,
	type AuthResult,
} from "../src/middleware/auth";
import type { Env } from "../src/types/env";

describe("MCP Authentication", () => {
	let mockEnv: Env;

	beforeEach(() => {
		mockEnv = {
			MERAKI_API_KEY: "test-api-key",
			ACCESS_JWKS_URL: "https://test.cloudflareaccess.com/cdn-cgi/access/certs",
			CACHE_KV: {} as KVNamespace,
			OAUTH_KV: {} as KVNamespace,
		} as Env;
	});

	describe("authenticateMcpRequest", () => {
		it("should reject requests without Authorization header", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("missing_token");
			expect(result.error?.message).toBe("Authorization header is required");
		});

		it("should reject malformed Authorization header (no Bearer)", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "InvalidFormat token123",
				},
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("invalid_format");
			expect(result.error?.message).toBe(
				"Authorization must be 'Bearer <token>'",
			);
		});

		it("should reject malformed Authorization header (Bearer only)", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "Bearer",
				},
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("invalid_format");
		});

		it("should reject Authorization header with empty token", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "Bearer ",
				},
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("invalid_format");
		});

		it("should reject invalid JWT tokens", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "Bearer invalid.jwt.token",
				},
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("invalid_token");
		});

		it("should extract token from valid Authorization header", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid.sig",
				},
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("invalid_token");
		});
	});

	describe("createUnauthorizedResponse", () => {
		it("should include WWW-Authenticate header", async () => {
			const baseUrl = "https://meraki-mcp.macharpe.com";
			const error = {
				code: "missing_token",
				message: "Authorization header is required",
			};

			const response = createUnauthorizedResponse(baseUrl, error);

			expect(response.status).toBe(401);

			const wwwAuth = response.headers.get("WWW-Authenticate");
			expect(wwwAuth).toBeTruthy();
			expect(wwwAuth).toContain('Bearer realm="Meraki MCP Server"');
			expect(wwwAuth).toContain(`authorization_uri="${baseUrl}/authorize"`);
			expect(wwwAuth).toContain(`error="${error.code}"`);
			expect(wwwAuth).toContain(`error_description="${error.message}"`);
		});

		it("should include OAuth endpoints in response body", async () => {
			const baseUrl = "https://meraki-mcp.macharpe.com";
			const error = {
				code: "invalid_token",
				message: "Token verification failed",
			};

			const response = createUnauthorizedResponse(baseUrl, error);

			const body = await response.json();

			expect(body.jsonrpc).toBe("2.0");
			expect(body.error.code).toBe(-32001);
			expect(body.error.message).toBe("Authentication required");
			expect(body.error.data.authorization_uri).toBe(
				`${baseUrl}/authorize`,
			);
			expect(body.error.data.token_endpoint).toBe(`${baseUrl}/token`);
			expect(body.error.data.error).toBe(error.code);
			expect(body.error.data.error_description).toBe(error.message);
		});

		it("should include CORS headers", async () => {
			const baseUrl = "https://meraki-mcp.macharpe.com";
			const error = {
				code: "expired_token",
				message: "Token has expired",
			};

			const response = createUnauthorizedResponse(baseUrl, error);

			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
				"POST",
			);
			expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
				"Authorization",
			);
			expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
				"mcp-protocol-version",
			);
		});

		it("should include Content-Type header", async () => {
			const baseUrl = "https://meraki-mcp.macharpe.com";
			const error = {
				code: "invalid_token",
				message: "Invalid token",
			};

			const response = createUnauthorizedResponse(baseUrl, error);

			expect(response.headers.get("Content-Type")).toBe("application/json");
		});

		it("should handle different error codes correctly", async () => {
			const baseUrl = "https://meraki-mcp.macharpe.com";
			const testCases = [
				{ code: "missing_token", message: "No token provided" },
				{ code: "invalid_format", message: "Wrong format" },
				{ code: "expired_token", message: "Token expired" },
				{ code: "invalid_token", message: "Invalid signature" },
			];

			for (const error of testCases) {
				const response = createUnauthorizedResponse(baseUrl, error);
				const body = await response.json();

				expect(body.error.data.error).toBe(error.code);
				expect(body.error.data.error_description).toBe(error.message);
			}
		});
	});

	describe("Integration Tests", () => {
		it("should properly format error responses for missing tokens", async () => {
			const request = new Request("https://meraki-mcp.macharpe.com/mcp", {
				method: "POST",
			});

			const authResult = await authenticateMcpRequest(request, mockEnv);
			expect(authResult.authenticated).toBe(false);

			if (!authResult.authenticated) {
				const baseUrl = new URL(request.url).origin;
				const response = createUnauthorizedResponse(baseUrl, authResult.error!);

				expect(response.status).toBe(401);

				const body = await response.json();
				expect(body.jsonrpc).toBe("2.0");
				expect(body.error.code).toBe(-32001);

				const wwwAuth = response.headers.get("WWW-Authenticate");
				expect(wwwAuth).toContain("missing_token");
			}
		});

		it("should properly format error responses for malformed tokens", async () => {
			const request = new Request("https://meraki-mcp.macharpe.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "NotBearer token123",
				},
			});

			const authResult = await authenticateMcpRequest(request, mockEnv);
			expect(authResult.authenticated).toBe(false);

			if (!authResult.authenticated) {
				const baseUrl = new URL(request.url).origin;
				const response = createUnauthorizedResponse(baseUrl, authResult.error!);

				const wwwAuth = response.headers.get("WWW-Authenticate");
				expect(wwwAuth).toContain("invalid_format");
			}
		});
	});

	describe("Token Extraction Edge Cases", () => {
		it("should handle case-insensitive Bearer token", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "bearer test.token.here",
				},
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("invalid_token");
		});

		it("should handle Bearer with mixed case", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "BeArEr test.token.here",
				},
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("invalid_token");
		});

		it("should reject Authorization with extra whitespace", async () => {
			const request = new Request("https://example.com/mcp", {
				method: "POST",
				headers: {
					Authorization: "Bearer   test.token.here",
				},
			});

			const result = await authenticateMcpRequest(request, mockEnv);

			expect(result.authenticated).toBe(false);
			expect(result.error?.code).toBe("invalid_token");
		});
	});
});
