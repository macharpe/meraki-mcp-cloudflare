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

import type { ClientInfo } from "@cloudflare/workers-oauth-provider";

const COOKIE_NAME = "meraki-mcp-approved-clients";
const ONE_YEAR_IN_SECONDS = 31536000;

/**
 * Generates a cryptographically random string for PKCE code verifier
 */
function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return base64urlEncode(String.fromCharCode(...array));
}

/**
 * Generates PKCE code challenge from code verifier using SHA256
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return base64urlEncode(String.fromCharCode(...new Uint8Array(digest)));
}

/**
 * Imports a secret key string for HMAC-SHA256 signing.
 */
async function importKey(secret: string): Promise<CryptoKey> {
	if (!secret) {
		throw new Error(
			"COOKIE_ENCRYPTION_KEY is not defined. A secret key is required for signing cookies.",
		);
	}
	return crypto.subtle.importKey(
		"raw",
		stringToArrayBuffer(secret),
		{ hash: "SHA-256", name: "HMAC" },
		false, // not extractable
		["sign", "verify"], // key usages
	);
}

/**
 * Parses the signed cookie and verifies its integrity.
 */
async function getApprovedClientsFromCookie(
	cookieHeader: string | null,
	secret: string,
): Promise<string[] | null> {
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";").map((c) => c.trim());
	const targetCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

	if (!targetCookie) return null;

	const cookieValue = targetCookie.substring(COOKIE_NAME.length + 1);
	const parts = cookieValue.split(".");

	if (parts.length !== 2) {
		console.warn("Invalid cookie format received.");
		return null; // Invalid format
	}

	const signatureHex = parts[0];
	const base64Payload = parts[1];
	if (!signatureHex || !base64Payload) {
		console.warn("Invalid cookie parts.");
		return null;
	}

	const payload = stringToArrayBuffer(base64urlDecode(base64Payload));

	const key = await importKey(secret);
	const signatureBuffer = new ArrayBuffer(signatureHex.length / 2);
	const signatureView = new Uint8Array(signatureBuffer);
	for (let i = 0; i < signatureHex.length; i += 2) {
		signatureView[i / 2] = parseInt(signatureHex.substr(i, 2), 16);
	}

	const isValid = await crypto.subtle.verify(
		"HMAC",
		key,
		signatureBuffer,
		payload,
	);

	if (!isValid) {
		console.warn("Cookie signature verification failed.");
		return null; // Signature invalid
	}

	try {
		const approvedClients = JSON.parse(new TextDecoder().decode(payload));
		if (!Array.isArray(approvedClients)) {
			console.warn("Cookie payload is not an array.");
			return null; // Payload isn't an array
		}
		// Ensure all elements are strings
		if (!approvedClients.every((item) => typeof item === "string")) {
			console.warn("Cookie payload contains non-string elements.");
			return null;
		}
		return approvedClients as string[];
	} catch (e) {
		console.error("Error parsing cookie payload:", e);
		return null; // JSON parsing failed
	}
}

/**
 * Checks if a given client ID has already been approved by the user,
 * based on a signed cookie.
 */
export async function clientIdAlreadyApproved(
	request: Request,
	clientId: string,
	cookieSecret: string,
): Promise<boolean> {
	if (!clientId) return false;
	const cookieHeader = request.headers.get("cookie");
	const approvedClients = await getApprovedClientsFromCookie(
		cookieHeader,
		cookieSecret,
	);
	return approvedClients?.includes(clientId) ?? false;
}

/**
 * Configuration for the approval dialog
 */
export interface ApprovalDialogOptions {
	/**
	 * Client information to display in the approval dialog
	 */
	client: ClientInfo | null;
	/**
	 * Server information to display in the approval dialog
	 */
	server: {
		name: string;
		logo?: string;
		description?: string;
	};
	/**
	 * Arbitrary state data to pass through the approval flow
	 * Will be encoded in the form and returned when approval is complete
	 */
	state: any;
}

/**
 * Renders an approval dialog for OAuth authorization
 */
export function renderApprovalDialog(
	request: Request,
	options: ApprovalDialogOptions,
): Response {
	const { client, server, state } = options;

	// Encode state for form submission
	const encodedState = base64urlEncode(JSON.stringify(state));

	// Sanitize any untrusted content
	const serverName = sanitizeHtml(server.name);
	const clientName = client?.clientName
		? sanitizeHtml(client.clientName)
		: "Unknown MCP Client";
	const serverDescription = server.description
		? sanitizeHtml(server.description)
		: "";

	// Safe URLs
	const logoUrl = server.logo ? sanitizeHtml(server.logo) : "";
	const clientUri = client?.clientUri ? sanitizeHtml(client.clientUri) : "";

	// Generate HTML for the approval dialog
	const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${clientName} | Authorization Request</title>
        <style>
          /* Modern, responsive styling */
          :root {
            --primary-color: #0070f3;
            --border-color: #e5e7eb;
            --text-color: #333;
            --background-color: #fff;
            --card-shadow: 0 8px 36px 8px rgba(0, 0, 0, 0.1);
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                         Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
          }

          .container {
            max-width: 600px;
            margin: 2rem auto;
            padding: 1rem;
          }

          .precard {
            padding: 2rem;
            text-align: center;
          }

          .card {
            background-color: var(--background-color);
            border-radius: 8px;
            box-shadow: var(--card-shadow);
            padding: 2rem;
          }

          .header {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
          }

          .logo {
            width: 48px;
            height: 48px;
            margin-right: 1rem;
            border-radius: 8px;
            object-fit: contain;
          }

          .title {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 400;
          }

          .alert {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 400;
            margin: 1rem 0;
            text-align: center;
          }

          .description {
            color: #555;
          }

          .client-info {
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 1rem 1rem 0.5rem;
            margin-bottom: 1.5rem;
          }

          .client-name {
            font-weight: 600;
            font-size: 1.2rem;
            margin: 0 0 0.5rem 0;
          }

          .client-detail {
            display: flex;
            margin-bottom: 0.5rem;
            align-items: baseline;
          }

          .detail-label {
            font-weight: 500;
            min-width: 120px;
          }

          .detail-value {
            font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            word-break: break-all;
          }

          .actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 2rem;
          }

          .button {
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            font-size: 1rem;
          }

          .button-primary {
            background-color: var(--primary-color);
            color: white;
          }

          .button-secondary {
            background-color: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
          }

          @media (max-width: 640px) {
            .container {
              margin: 1rem auto;
              padding: 0.5rem;
            }

            .card {
              padding: 1.5rem;
            }

            .actions {
              flex-direction: column;
            }

            .button {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="precard">
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${serverName} Logo" class="logo">` : ""}
            <h1 class="title"><strong>${serverName}</strong></h1>
            </div>

            ${serverDescription ? `<p class="description">${serverDescription}</p>` : ""}
          </div>

          <div class="card">
            <h2 class="alert"><strong>${clientName}</strong> is requesting access</h2>

            <div class="client-info">
              <div class="client-detail">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${clientName}</div>
              </div>

              ${
								clientUri
									? `
                <div class="client-detail">
                  <div class="detail-label">Website:</div>
                  <div class="detail-value">
                    <a href="${clientUri}" target="_blank" rel="noopener noreferrer">
                      ${clientUri}
                    </a>
                  </div>
                </div>
              `
									: ""
							}
            </div>

            <p>This MCP Client is requesting to be authorized on ${serverName}. If you approve, you will be redirected to complete authentication with Cloudflare Access.</p>

            <form method="post" action="${new URL(request.url).pathname}">
              <input type="hidden" name="state" value="${encodedState}">

              <div class="actions">
                <button type="button" class="button button-secondary" onclick="window.history.back()">Cancel</button>
                <button type="submit" class="button button-primary">Approve</button>
              </div>
            </form>
          </div>
        </div>
      </body>
    </html>
  `;

	return new Response(htmlContent, {
		headers: {
			"content-type": "text/html; charset=utf-8",
		},
	});
}

/**
 * Result of parsing the approval form submission.
 */
export interface ParsedApprovalResult {
	/** The original state object passed through the form. */
	state: any;
	/** Headers to set on the redirect response, including the Set-Cookie header. */
	headers: Record<string, string>;
}

/**
 * Parses the form submission from the approval dialog
 */
export async function parseRedirectApproval(
	request: Request,
	cookieSecret: string,
): Promise<ParsedApprovalResult> {
	if (request.method !== "POST") {
		throw new Error("Invalid request method. Expected POST.");
	}

	let state: any;
	let clientId: string | undefined;

	try {
		const formData = await request.formData();
		const encodedState = formData.get("state");

		if (typeof encodedState !== "string" || !encodedState) {
			throw new Error("Missing or invalid 'state' in form data.");
		}

		state = JSON.parse(base64urlDecode(encodedState));
		clientId = state?.oauthReqInfo?.clientId;

		if (!clientId) {
			throw new Error("Could not extract clientId from state object.");
		}
	} catch (e) {
		console.error("Error processing form submission:", e);
		throw new Error(
			`Failed to parse approval form: ${e instanceof Error ? e.message : String(e)}`,
		);
	}

	// Get existing approved clients
	const cookieHeader = request.headers.get("cookie");
	const existingApprovedClients =
		(await getApprovedClientsFromCookie(cookieHeader, cookieSecret)) || [];

	// Add the newly approved client ID (avoid duplicates)
	const updatedApprovedClients = Array.from(
		new Set([...existingApprovedClients, clientId]),
	);

	// Sign the updated list
	const payload = stringToArrayBuffer(JSON.stringify(updatedApprovedClients));
	const key = await importKey(cookieSecret);
	const signature = await crypto.subtle.sign("HMAC", key, payload);

	// Convert signature to hex string
	const signatureArray = new Uint8Array(signature);
	const signatureHex = Array.from(signatureArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	const payloadBase64 = base64urlEncode(new TextDecoder().decode(payload));
	const newCookieValue = `${signatureHex}.${payloadBase64}`;

	// Generate Set-Cookie header
	const headers: Record<string, string> = {
		"set-cookie": `${COOKIE_NAME}=${newCookieValue}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${ONE_YEAR_IN_SECONDS}`,
	};

	return { headers, state };
}

/**
 * Constructs an authorization URL for an upstream service with PKCE support.
 */
export async function getUpstreamAuthorizeUrl({
	upstream_url,
	client_id,
	scope,
	redirect_uri,
	state,
	codeVerifier,
}: {
	upstream_url: string;
	client_id: string;
	scope: string;
	redirect_uri: string;
	state?: string;
	codeVerifier?: string;
}): Promise<{ url: string; codeVerifier: string }> {
	const verifier = codeVerifier || generateCodeVerifier();
	const challenge = await generateCodeChallenge(verifier);

	const upstream = new URL(upstream_url);
	upstream.searchParams.set("client_id", client_id);
	upstream.searchParams.set("redirect_uri", redirect_uri);
	upstream.searchParams.set("scope", scope);
	upstream.searchParams.set("response_type", "code");
	upstream.searchParams.set("code_challenge", challenge);
	upstream.searchParams.set("code_challenge_method", "S256");
	if (state) upstream.searchParams.set("state", state);

	return { url: upstream.href, codeVerifier: verifier };
}

/**
 * Fetches an authorization token from an upstream service.
 */
export async function fetchUpstreamAuthToken({
	client_id,
	client_secret,
	code,
	redirect_uri,
	upstream_url,
	codeVerifier,
}: {
	code: string | undefined;
	upstream_url: string;
	client_secret: string;
	redirect_uri: string;
	client_id: string;
	codeVerifier?: string;
}): Promise<[string, string, null] | [null, null, Response]> {
	if (!code) {
		return [null, null, new Response("Missing code", { status: 400 })];
	}
	const data: Record<string, string> = {
		client_id,
		client_secret,
		code,
		grant_type: "authorization_code",
		redirect_uri,
	};

	// Add PKCE code verifier if provided
	if (codeVerifier) {
		data.code_verifier = codeVerifier;
	}
	const resp = await fetch(upstream_url, {
		body: new URLSearchParams(data).toString(),
		headers: {
			"content-type": "application/x-www-form-urlencoded",
		},
		method: "POST",
	});
	if (!resp.ok) {
		console.log(await resp.text());
		return [
			null,
			null,
			new Response(`Failed to exchange code ${resp.status}`, { status: 500 }),
		];
	}
	const body = (await resp.json()) as {
		access_token?: string;
		id_token?: string;
	};

	const accessToken = body.access_token as string;
	if (!accessToken) {
		return [null, null, new Response("Missing access token", { status: 400 })];
	}

	const idToken = body.id_token as string;
	if (!idToken) {
		return [null, null, new Response("Missing id token", { status: 400 })];
	}
	return [accessToken, idToken, null];
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
function sanitizeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// Context from the auth process, encrypted & stored in the auth token
export type Props = {
	login: string;
	name: string;
	email: string;
	accessToken: string;
};
