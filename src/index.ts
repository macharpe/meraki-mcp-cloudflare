import { MerakiAPIService } from "./services/merakiapi";

// Environment interface
interface Env {
	MERAKI_API_KEY: string;
	MERAKI_BASE_URL?: string;
	CF_ACCESS_AUD?: string;
	CF_ACCESS_TEAM_DOMAIN?: string;
}

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

// Cloudflare Access Service Token validation
function validateServiceToken(request: Request, _env: Env): boolean {
	// When CF Access validates service tokens, it provides a JWT assertion
	// instead of the original CF-Access-Client-Id/CF-Access-Client-Secret headers
	const jwtAssertion = request.headers.get("cf-access-jwt-assertion");
	const cfAuthCookie = request.headers
		.get("cookie")
		?.includes("CF_Authorization=");

	// Check if we have CF Access JWT (indicates successful service token validation)
	if (!jwtAssertion && !cfAuthCookie) {
		return false;
	}

	// If we have JWT, Cloudflare has already validated the service token
	// Additional validation can be done by decoding the JWT if needed
	console.log("Service token validation successful - CF Access JWT present");
	return true;
}

// Tool handler mapping for cleaner code
async function executeTool(
	toolName: string,
	args: Record<string, unknown>,
	merakiService: MerakiAPIService,
): Promise<unknown> {
	const toolMap: Record<string, () => Promise<unknown>> = {
		get_organizations: () => merakiService.getOrganizations(),
		get_organization: () =>
			merakiService.getOrganization(args.organizationId as string),
		get_networks: () =>
			merakiService.getNetworks(args.organizationId as string),
		get_network: () => merakiService.getNetwork(args.networkId as string),
		get_devices: () => merakiService.getDevices(args.networkId as string),
		get_device: () => merakiService.getDevice(args.serial as string),
		get_clients: () =>
			merakiService.getClients(
				args.networkId as string,
				args.timespan as number,
			),
		get_device_statuses: () =>
			merakiService.getDeviceStatuses(args.organizationId as string),
		get_switch_ports: () => merakiService.getSwitchPorts(args.serial as string),
		get_switch_port_statuses: () =>
			merakiService.getSwitchPortStatuses(
				args.serial as string,
				args.timespan as number,
			),
		get_management_interface: () =>
			merakiService.getManagementInterface(args.serial as string),
		get_wireless_radio_settings: () =>
			merakiService.getWirelessRadioSettings(args.serial as string),
		get_wireless_status: () =>
			merakiService.getWirelessStatus(args.serial as string),
		get_wireless_latency_stats: () =>
			merakiService.getWirelessLatencyStats(
				args.serial as string,
				args.timespan as number,
			),
		get_switch_routing_interfaces: () =>
			merakiService.getSwitchRoutingInterfaces(args.serial as string),
		get_switch_static_routes: () =>
			merakiService.getSwitchStaticRoutes(args.serial as string),
		get_network_traffic: () =>
			merakiService.getNetworkTraffic(
				args.networkId as string,
				args.timespan as number,
			),
		get_network_events: () =>
			merakiService.getNetworkEvents(
				args.networkId as string,
				args.perPage as number,
			),
	};

	const handler = toolMap[toolName];
	if (!handler) {
		throw new Error(`Unknown tool: ${toolName}`);
	}

	return await handler();
}

// Shared tools list
function getToolsList() {
	return [
		{
			name: "get_organizations",
			description: "Get all Meraki organizations",
			inputSchema: { type: "object", properties: {} },
		},
		{
			name: "get_organization",
			description: "Get details for a specific organization",
			inputSchema: {
				type: "object",
				properties: {
					organizationId: {
						type: "string",
						description: "The organization ID",
					},
				},
				required: ["organizationId"],
			},
		},
		{
			name: "get_networks",
			description: "Get all networks in an organization",
			inputSchema: {
				type: "object",
				properties: {
					organizationId: {
						type: "string",
						description: "The organization ID",
					},
				},
				required: ["organizationId"],
			},
		},
		{
			name: "get_network",
			description: "Get details for a specific network",
			inputSchema: {
				type: "object",
				properties: {
					networkId: { type: "string", description: "The network ID" },
				},
				required: ["networkId"],
			},
		},
		{
			name: "get_devices",
			description: "Get all devices in a network",
			inputSchema: {
				type: "object",
				properties: {
					networkId: { type: "string", description: "The network ID" },
				},
				required: ["networkId"],
			},
		},
		{
			name: "get_device",
			description: "Get details for a specific device",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
				},
				required: ["serial"],
			},
		},
		{
			name: "get_clients",
			description: "Get clients connected to a network",
			inputSchema: {
				type: "object",
				properties: {
					networkId: { type: "string", description: "The network ID" },
					timespan: {
						type: "number",
						description: "Time span in seconds (max 31 days)",
					},
				},
				required: ["networkId"],
			},
		},
		{
			name: "get_device_statuses",
			description: "Get device statuses for an organization",
			inputSchema: {
				type: "object",
				properties: {
					organizationId: {
						type: "string",
						description: "The organization ID",
					},
				},
				required: ["organizationId"],
			},
		},
		{
			name: "get_switch_ports",
			description: "Get switch ports for a device",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
				},
				required: ["serial"],
			},
		},
		{
			name: "get_switch_port_statuses",
			description: "Get switch port statuses for a device",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
					timespan: {
						type: "number",
						description: "Time span in seconds (default 300)",
					},
				},
				required: ["serial"],
			},
		},
		{
			name: "get_management_interface",
			description: "Get management interface settings for a device",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
				},
				required: ["serial"],
			},
		},
		{
			name: "get_wireless_radio_settings",
			description: "Get wireless radio settings for an access point",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
				},
				required: ["serial"],
			},
		},
		{
			name: "get_wireless_status",
			description: "Get wireless status of an access point",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
				},
				required: ["serial"],
			},
		},
		{
			name: "get_wireless_latency_stats",
			description: "Get wireless latency statistics for an access point",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
					timespan: {
						type: "number",
						description: "Time span in seconds (default 86400)",
					},
				},
				required: ["serial"],
			},
		},
		{
			name: "get_switch_routing_interfaces",
			description: "Get routing interfaces for a switch",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
				},
				required: ["serial"],
			},
		},
		{
			name: "get_switch_static_routes",
			description: "Get static routes for a switch",
			inputSchema: {
				type: "object",
				properties: {
					serial: { type: "string", description: "The device serial number" },
				},
				required: ["serial"],
			},
		},
		{
			name: "get_network_traffic",
			description: "Get network traffic statistics",
			inputSchema: {
				type: "object",
				properties: {
					networkId: { type: "string", description: "The network ID" },
					timespan: {
						type: "number",
						description: "Time span in seconds (default 86400)",
					},
				},
				required: ["networkId"],
			},
		},
		{
			name: "get_network_events",
			description: "Get recent network events",
			inputSchema: {
				type: "object",
				properties: {
					networkId: { type: "string", description: "The network ID" },
					perPage: {
						type: "number",
						description: "Number of events per page (default 10)",
					},
				},
				required: ["networkId"],
			},
		},
	];
}

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext,
	): Promise<Response> {
		const { pathname } = new URL(request.url);

		// Handle SSE endpoint
		if (pathname === "/sse") {
			if (!env.MERAKI_API_KEY) {
				return new Response("MERAKI_API_KEY not configured", { status: 500 });
			}

			// Cloudflare Access Service Token validation
			if (!validateServiceToken(request, env)) {
				return new Response("Unauthorized - Valid service token required", {
					status: 401,
					headers: { "Content-Type": "application/json" },
				});
			}

			try {
				// Handle SSE connections
				if (request.method === "GET") {
					// Create a readable stream for SSE that stays open
					let controller: ReadableStreamDefaultController;
					const readable = new ReadableStream({
						start(controllerParam) {
							controller = controllerParam;

							// Send SSE header to keep connection alive
							const encoder = new TextEncoder();
							controller.enqueue(encoder.encode("retry: 1000\n\n"));

							// Keep the connection alive with periodic pings
							const interval = setInterval(() => {
								try {
									controller.enqueue(
										encoder.encode("event: ping\ndata: {}\n\n"),
									);
								} catch (_error) {
									clearInterval(interval);
								}
							}, 30000); // ping every 30 seconds

							// Clean up interval when connection closes
							return () => {
								clearInterval(interval);
							};
						},
					});

					return new Response(readable, {
						headers: {
							"Content-Type": "text/event-stream",
							"Cache-Control": "no-cache",
							Connection: "keep-alive",
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
							"Access-Control-Allow-Headers":
								"Content-Type, CF-Access-Client-Id, CF-Access-Client-Secret",
						},
					});
				}

				// Handle POST requests with MCP messages
				if (request.method === "POST") {
					let message: {
						method?: string;
						id?: string | number;
						params?: { name?: string; arguments?: Record<string, unknown> };
					};

					try {
						message = (await request.json()) as typeof message;
					} catch (_error) {
						return new Response(
							JSON.stringify({
								jsonrpc: "2.0",
								error: {
									code: -32700,
									message: "Parse error: Invalid JSON",
								},
							}),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}
					// Log request method and tool name (not full message to avoid exposing sensitive data)
					console.log(
						`[MCP] ${message.method} ${message.params?.name || ""}`.trim(),
					);

					let response: unknown;

					if (message.method === "initialize") {
						response = {
							jsonrpc: "2.0",
							id: message.id,
							result: {
								protocolVersion: "2024-11-05",
								capabilities: {
									tools: {},
								},
								serverInfo: {
									name: "Cisco Meraki MCP Server",
									version: "1.0.0",
								},
							},
						};
					} else if (message.method === "tools/list") {
						response = {
							jsonrpc: "2.0",
							id: message.id,
							result: {
								tools: getToolsList(),
							},
						};
					} else if (message.method === "tools/call") {
						// Call the tool directly using the service
						const toolName = message.params?.name;
						const args = message.params?.arguments || {};

						if (!toolName) {
							response = {
								jsonrpc: "2.0",
								id: message.id,
								error: {
									code: -32602,
									message: "Tool name is required",
								},
							};
						} else {
							try {
								// Create service instance once for this request
								const merakiService = new MerakiAPIService(
									env.MERAKI_API_KEY,
									env.MERAKI_BASE_URL,
								);
								const result = await executeTool(toolName, args, merakiService);

								response = {
									jsonrpc: "2.0",
									id: message.id,
									result: {
										content: [
											{ type: "text", text: JSON.stringify(result, null, 2) },
										],
									},
								};
							} catch (error) {
								response = {
									jsonrpc: "2.0",
									id: message.id,
									error: {
										code: -32603,
										message: `Tool execution failed: ${getErrorMessage(error)}`,
									},
								};
							}
						}
					} else {
						response = {
							jsonrpc: "2.0",
							id: message.id,
							error: {
								code: -32601,
								message: `Method not found: ${message.method}`,
							},
						};
					}

					return new Response(JSON.stringify(response), {
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
						},
					});
				}

				return new Response("Method not allowed", { status: 405 });
			} catch (error) {
				console.error("SSE endpoint error:", error);
				return new Response(
					`Internal server error: ${getErrorMessage(error)}`,
					{ status: 500 },
				);
			}
		}

		// Handle health check
		if (pathname === "/health") {
			return new Response(
				JSON.stringify({
					status: "healthy",
					timestamp: new Date().toISOString(),
					service: "meraki-mcp-server",
					hasApiKey: !!env.MERAKI_API_KEY,
					authEnabled: true,
					cfAccessAudEnabled: !!env.CF_ACCESS_AUD,
					cfAccessTeamDomainEnabled: !!env.CF_ACCESS_TEAM_DOMAIN,
					version: "1.0.0",
					tools: getToolsList().length,
					endpoints: ["/sse", "/health", "/"],
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers":
						"Content-Type, CF-Access-Client-Id, CF-Access-Client-Secret",
				},
			});
		}

		// Default response
		return new Response(
			"Cisco Meraki MCP Server - Use /sse for MCP connection or /health for status",
			{
				headers: { "Content-Type": "text/plain" },
			},
		);
	},
};
