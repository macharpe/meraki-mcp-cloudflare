import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { handleAccessRequest } from "./access-handler";
import {
	authenticateMcpRequest,
	createUnauthorizedResponse,
} from "./middleware/auth";
import { CacheKeys, CacheService, CacheTTL } from "./services/cache";
import { MerakiAPIService } from "./services/merakiapi";
import type { Env } from "./types/env";

export class MerakiMCPAgent extends McpAgent<
	Env,
	Record<string, never>,
	{ accessToken: string; email: string; login: string; name: string }
> {
	server = new McpServer({
		name: "Cisco Meraki MCP Server",
		version: "1.0.0",
	});

	private initialized = false;

	async fetch(request: Request): Promise<Response> {
		if (!this.initialized) {
			await this.init();
			this.initialized = true;
		}

		const { pathname } = new URL(request.url);

		// Handle SSE endpoints for supergateway compatibility
		if (pathname === "/sse") {
			// For GET requests, return SSE stream
			if (request.method === "GET") {
				let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

				const stream = new ReadableStream({
					start(controller) {
						// Send initial connection message
						controller.enqueue(
							new TextEncoder().encode(
								'data: {"jsonrpc":"2.0","method":"notification","params":{"type":"initialized"}}\n\n',
							),
						);

						// Keep connection alive with periodic pings
						keepAliveInterval = setInterval(() => {
							try {
								controller.enqueue(new TextEncoder().encode(": ping\n\n"));
							} catch (_e) {
								if (keepAliveInterval) {
									clearInterval(keepAliveInterval);
									keepAliveInterval = null;
								}
							}
						}, 30000); // Every 30 seconds
					},
					cancel() {
						if (keepAliveInterval) {
							clearInterval(keepAliveInterval);
							keepAliveInterval = null;
						}
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
						"Access-Control-Allow-Headers":
							"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
					},
				});
			}
		}

		if (pathname === "/sse/message") {
			// Handle POST requests to /sse/message (for sending MCP requests via SSE)
			if (request.method === "POST") {
				// This endpoint would normally handle MCP requests sent via POST
				// and return responses that get sent over the SSE stream
				// For now, redirect to regular MCP handling
				const body = await request.text();

				// Process the MCP request and return JSON response
				// This should be the same logic as the /mcp POST handler
				try {
					const mcpRequest = JSON.parse(body);

					// Use the same MCP handling logic as /mcp endpoint
					// For now, redirect to a simple response
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: mcpRequest.id,
							result: { success: true, message: "SSE message received" },
						}),
						{
							status: 200,
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
								"Access-Control-Allow-Headers":
									"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
							},
						},
					);
				} catch (_error) {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: null,
							error: { code: -32700, message: "Parse error" },
						}),
						{
							status: 200,
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
								"Access-Control-Allow-Headers":
									"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
							},
						},
					);
				}
			}
		}

		if (pathname === "/mcp") {
			// Helper function to create responses with consistent CORS headers
			const createMcpResponse = (data: unknown, status = 200) => {
				return new Response(JSON.stringify(data), {
					status,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
						"Access-Control-Allow-Headers":
							"Content-Type, Authorization, Cache-Control",
					},
				});
			};

			// Handle basic MCP protocol messages directly
			const body = await request.text();

			// Handle GET requests - return SSE stream for SSE transport
			if (request.method === "GET" || !body.trim()) {
				let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

				// Create a proper SSE stream
				const stream = new ReadableStream({
					start(controller) {
						// Send initial connection message
						controller.enqueue(
							new TextEncoder().encode(
								'data: {"jsonrpc":"2.0","method":"notification","params":{"type":"initialized"}}\n\n',
							),
						);

						// Keep connection alive with periodic pings
						keepAliveInterval = setInterval(() => {
							try {
								controller.enqueue(new TextEncoder().encode(": ping\n\n"));
							} catch (_e) {
								if (keepAliveInterval) {
									clearInterval(keepAliveInterval);
									keepAliveInterval = null;
								}
							}
						}, 30000); // Every 30 seconds
					},
					cancel() {
						if (keepAliveInterval) {
							clearInterval(keepAliveInterval);
							keepAliveInterval = null;
						}
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
						"Access-Control-Allow-Headers":
							"Content-Type, Authorization, Cache-Control",
					},
				});
			}

			try {
				const mcpRequest = JSON.parse(body);

				if (mcpRequest.method === "initialize") {
					// Match the client's protocol version
					const clientProtocolVersion =
						mcpRequest.params?.protocolVersion || "2024-11-05";
					return createMcpResponse({
						jsonrpc: "2.0",
						id: mcpRequest.id,
						result: {
							protocolVersion: clientProtocolVersion,
							capabilities: {
								tools: {},
								logging: {},
								resources: {},
								prompts: {},
							},
							serverInfo: {
								name: "Cisco Meraki MCP Server",
								version: "1.0.0",
							},
						},
					});
				}

				if (mcpRequest.method === "tools/list") {
					const toolsList = [
						{
							name: "meraki_get_organizations",
							description: "Get all Meraki organizations",
							inputSchema: { type: "object", properties: {} },
						},
						{
							name: "meraki_get_organization",
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
							name: "meraki_get_networks",
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
							name: "meraki_get_network",
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
							name: "meraki_get_network_traffic",
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
							name: "meraki_get_network_events",
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
						{
							name: "meraki_get_devices",
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
							name: "meraki_get_device",
							description: "Get details for a specific device",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
								},
								required: ["serial"],
							},
						},
						{
							name: "meraki_get_clients",
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
							name: "meraki_get_device_statuses",
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
							name: "meraki_get_management_interface",
							description: "Get management interface settings for a device",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
								},
								required: ["serial"],
							},
						},
						{
							name: "meraki_get_switch_ports",
							description: "Get switch ports for a device",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
								},
								required: ["serial"],
							},
						},
						{
							name: "meraki_get_switch_port_statuses",
							description: "Get switch port statuses for a device",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
									timespan: {
										type: "number",
										description: "Time span in seconds (default 300)",
									},
								},
								required: ["serial"],
							},
						},
						{
							name: "meraki_get_switch_routing_interfaces",
							description: "Get routing interfaces for a switch",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
								},
								required: ["serial"],
							},
						},
						{
							name: "meraki_get_switch_static_routes",
							description: "Get static routes for a switch",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
								},
								required: ["serial"],
							},
						},
						{
							name: "meraki_get_wireless_radio_settings",
							description: "Get wireless radio settings for an access point",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
								},
								required: ["serial"],
							},
						},
						{
							name: "meraki_get_wireless_status",
							description: "Get wireless status of an access point",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
								},
								required: ["serial"],
							},
						},
						{
							name: "meraki_get_wireless_latency_stats",
							description:
								"Get wireless latency statistics for an access point",
							inputSchema: {
								type: "object",
								properties: {
									serial: {
										type: "string",
										description: "The device serial number",
									},
									timespan: {
										type: "number",
										description: "Time span in seconds (default 86400)",
									},
								},
								required: ["serial"],
							},
						},
						// Appliance Management Tools
						{
							name: "meraki_get_appliance_vpn_site_to_site",
							description: "Get appliance VPN site-to-site configuration",
							inputSchema: {
								type: "object",
								properties: {
									networkId: { type: "string", description: "The network ID" },
								},
								required: ["networkId"],
							},
						},
						{
							name: "meraki_get_appliance_content_filtering",
							description: "Get appliance content filtering settings",
							inputSchema: {
								type: "object",
								properties: {
									networkId: { type: "string", description: "The network ID" },
								},
								required: ["networkId"],
							},
						},
						{
							name: "meraki_get_appliance_security_events",
							description: "Get appliance security events",
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
							name: "meraki_get_appliance_traffic_shaping",
							description: "Get appliance traffic shaping settings",
							inputSchema: {
								type: "object",
								properties: {
									networkId: { type: "string", description: "The network ID" },
								},
								required: ["networkId"],
							},
						},
						// Additional Wireless Management Tools
						{
							name: "meraki_get_wireless_rf_profiles",
							description: "Get wireless RF profiles for a network",
							inputSchema: {
								type: "object",
								properties: {
									networkId: { type: "string", description: "The network ID" },
								},
								required: ["networkId"],
							},
						},
						{
							name: "meraki_get_wireless_channel_utilization",
							description: "Get wireless channel utilization history",
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
							name: "meraki_get_wireless_signal_quality",
							description: "Get wireless signal quality history",
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
							name: "meraki_get_wireless_connection_stats",
							description: "Get wireless connection statistics",
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
							name: "meraki_get_wireless_client_connectivity_events",
							description: "Get wireless client connectivity events",
							inputSchema: {
								type: "object",
								properties: {
									networkId: { type: "string", description: "The network ID" },
									clientId: { type: "string", description: "The client ID" },
									timespan: {
										type: "number",
										description: "Time span in seconds (default 86400)",
									},
								},
								required: ["networkId", "clientId"],
							},
						},
					];

					return createMcpResponse({
						jsonrpc: "2.0",
						id: mcpRequest.id,
						result: { tools: toolsList },
					});
				}

				if (mcpRequest.method === "tools/call") {
					const merakiService = new MerakiAPIService(
						this.env.MERAKI_API_KEY,
						this.env.MERAKI_BASE_URL,
						this.env,
					);

					try {
						let result: unknown;
						switch (mcpRequest.params.name) {
							case "meraki_get_organizations":
								result = await merakiService.getOrganizations();
								break;
							case "meraki_get_organization":
								result = await merakiService.getOrganization(
									mcpRequest.params.arguments.organizationId,
								);
								break;
							case "meraki_get_networks":
								result = await merakiService.getNetworks(
									mcpRequest.params.arguments.organizationId,
								);
								break;
							case "meraki_get_network":
								result = await merakiService.getNetwork(
									mcpRequest.params.arguments.networkId,
								);
								break;
							case "meraki_get_network_traffic":
								result = await merakiService.getNetworkTraffic(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_network_events":
								result = await merakiService.getNetworkEvents(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.perPage,
								);
								break;
							case "meraki_get_devices":
								result = await merakiService.getDevices(
									mcpRequest.params.arguments.networkId,
								);
								break;
							case "meraki_get_device":
								result = await merakiService.getDevice(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_clients":
								result = await merakiService.getClients(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_device_statuses":
								result = await merakiService.getDeviceStatuses(
									mcpRequest.params.arguments.organizationId,
								);
								break;
							case "meraki_get_management_interface":
								result = await merakiService.getManagementInterface(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_switch_ports":
								result = await merakiService.getSwitchPorts(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_switch_port_statuses":
								result = await merakiService.getSwitchPortStatuses(
									mcpRequest.params.arguments.serial,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_switch_routing_interfaces":
								result = await merakiService.getSwitchRoutingInterfaces(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_switch_static_routes":
								result = await merakiService.getSwitchStaticRoutes(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_wireless_radio_settings":
								result = await merakiService.getWirelessRadioSettings(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_wireless_status":
								result = await merakiService.getWirelessStatus(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_wireless_latency_stats":
								result = await merakiService.getWirelessLatencyStats(
									mcpRequest.params.arguments.serial,
									mcpRequest.params.arguments.timespan,
								);
								break;
							// Appliance Management Tools
							case "meraki_get_appliance_vpn_site_to_site":
								result = await merakiService.getApplianceVpnSiteToSite(
									mcpRequest.params.arguments.networkId,
								);
								break;
							case "meraki_get_appliance_content_filtering":
								result = await merakiService.getApplianceContentFiltering(
									mcpRequest.params.arguments.networkId,
								);
								break;
							case "meraki_get_appliance_security_events":
								result = await merakiService.getApplianceSecurityEvents(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_appliance_traffic_shaping":
								result = await merakiService.getApplianceTrafficShaping(
									mcpRequest.params.arguments.networkId,
								);
								break;
							// Additional Wireless Management Tools
							case "meraki_get_wireless_rf_profiles":
								result = await merakiService.getWirelessRfProfiles(
									mcpRequest.params.arguments.networkId,
								);
								break;
							case "meraki_get_wireless_channel_utilization":
								result = await merakiService.getWirelessChannelUtilization(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_wireless_signal_quality":
								result = await merakiService.getWirelessSignalQuality(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_wireless_connection_stats":
								result = await merakiService.getWirelessConnectionStats(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_wireless_client_connectivity_events":
								result =
									await merakiService.getWirelessClientConnectivityEvents(
										mcpRequest.params.arguments.networkId,
										mcpRequest.params.arguments.clientId,
										mcpRequest.params.arguments.timespan,
									);
								break;
							default:
								throw new Error(
									`Tool ${mcpRequest.params.name} not implemented yet`,
								);
						}

						const response = {
							jsonrpc: "2.0",
							id: mcpRequest.id,
							result: {
								content: [
									{ type: "text", text: JSON.stringify(result, null, 2) },
								],
							},
						};
						const responseBody = JSON.stringify(response);
						const finalResponse = new Response(responseBody, {
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
								"Access-Control-Allow-Headers":
									"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
								"X-Cache-Status": merakiService.cacheStatus, // Track cache hit/miss for monitoring
							},
						});

						return finalResponse;
					} catch (error) {
						return new Response(
							JSON.stringify({
								jsonrpc: "2.0",
								id: mcpRequest.id,
								error: {
									code: -32000,
									message: `Tool execution failed: ${error}`,
								},
							}),
							{
								status: 200,
								headers: {
									"Content-Type": "application/json",
									"Access-Control-Allow-Origin": "*",
									"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
									"Access-Control-Allow-Headers":
										"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
								},
							},
						);
					}
				}

				if (mcpRequest.method === "prompts/list") {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: mcpRequest.id,
							result: { prompts: [] },
						}),
						{
							status: 200,
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
								"Access-Control-Allow-Headers":
									"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
							},
						},
					);
				}

				if (mcpRequest.method === "resources/list") {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: mcpRequest.id,
							result: { resources: [] },
						}),
						{
							status: 200,
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
								"Access-Control-Allow-Headers":
									"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
							},
						},
					);
				}

				if (mcpRequest.method === "resources/templates/list") {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: mcpRequest.id,
							result: { resourceTemplates: [] },
						}),
						{
							status: 200,
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
								"Access-Control-Allow-Headers":
									"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
							},
						},
					);
				}

				if (mcpRequest.method === "notifications/initialized") {
					// Notifications don't need a response
					return new Response("", {
						status: 204,
						headers: {
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
							"Access-Control-Allow-Headers":
								"Content-Type, Authorization, Cache-Control",
						},
					});
				}

				// Handle notifications (no response expected)
				if (!mcpRequest.id && mcpRequest.method) {
					return new Response("", {
						status: 204,
						headers: {
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
							"Access-Control-Allow-Headers":
								"Content-Type, Authorization, Cache-Control",
						},
					});
				}

				// Handle other notifications that might be sent during connection
				if (mcpRequest.method?.startsWith("notifications/")) {
					return new Response("", {
						status: 204,
						headers: {
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
							"Access-Control-Allow-Headers":
								"Content-Type, Authorization, Cache-Control",
						},
					});
				}

				// Default response for unhandled methods
				// Only return error for requests (with ID), not notifications
				if (mcpRequest.id !== undefined) {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							id: mcpRequest.id,
							error: {
								code: -32601,
								message: `Method not found: ${mcpRequest.method}`,
							},
						}),
						{
							status: 200,
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
								"Access-Control-Allow-Headers":
									"Content-Type, Authorization, Cache-Control",
							},
						},
					);
				} else {
					// For notifications without ID, just return 204
					return new Response("", {
						status: 204,
						headers: {
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
							"Access-Control-Allow-Headers":
								"Content-Type, Authorization, Cache-Control",
						},
					});
				}
			} catch (_error) {
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: { code: -32700, message: "Parse error" },
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
							"Access-Control-Allow-Headers":
								"Content-Type, Authorization, Cache-Control",
						},
					},
				);
			}
		}

		return new Response("Not Found", { status: 404 });
	}

	async init() {
		// Initialize MCP server - tool handling is done via direct JSON-RPC in fetch()
	}
}

async function handleMcpRequest(
	req: Request,
	env: Env,
	_ctx: ExecutionContext,
): Promise<Response> {
	if (!env?.MCP_OBJECT) {
		return new Response("MCP_OBJECT not available", { status: 500 });
	}

	// Use a consistent ID so we always get the same Durable Object instance
	// Changed ID to force new instance with updated code (v2)
	const durableObjectId = env.MCP_OBJECT.idFromName("meraki-mcp-agent-v2");
	const stub = env.MCP_OBJECT.get(durableObjectId);

	return stub.fetch(req);
}

// Create the main handler that routes between OAuth and MCP endpoints
async function mainHandler(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	const { pathname } = new URL(request.url);

	// Handle OAuth discovery endpoints
	if (pathname === "/.well-known/oauth-authorization-server") {
		const baseUrl = new URL(request.url).origin;

		const discoveryMetadata = {
			issuer: baseUrl,
			authorization_endpoint: `${baseUrl}/authorize`,
			token_endpoint: `${baseUrl}/token`,
			jwks_uri: `${baseUrl}/.well-known/jwks.json`,
			registration_endpoint: `${baseUrl}/register`,
			scopes_supported: ["meraki:read", "meraki:write"],
			response_types_supported: ["code"],
			response_modes_supported: ["query"],
			grant_types_supported: ["authorization_code", "refresh_token"],
			token_endpoint_auth_methods_supported: [
				"client_secret_post",
				"client_secret_basic",
			],
			code_challenge_methods_supported: ["S256"],
			subject_types_supported: ["public"],
			id_token_signing_alg_values_supported: ["RS256"],
			claims_supported: ["sub", "aud", "iss", "iat", "exp", "email", "name"],
			// MCP-specific metadata
			mcp_server_info: {
				name: "Cisco Meraki MCP Server",
				version: "1.0.0",
				tools_count: 27,
				mcp_endpoint: `${baseUrl}/mcp`,
				mcp_sse_endpoint: `${baseUrl}/sse`,
				authentication_required: true,
				supported_auth_methods: ["Bearer"],
			},
		};

		return new Response(JSON.stringify(discoveryMetadata, null, 2), {
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": "public, max-age=3600, s-maxage=3600", // 1 hour browser + edge cache
			},
		});
	}

	if (pathname === "/.well-known/jwks.json") {
		// Proxy Cloudflare Access JWKS endpoint
		if (env.ACCESS_JWKS_URL) {
			try {
				const cache = new CacheService(env);
				const cacheKey = CacheKeys.jwks(env.ACCESS_JWKS_URL);

				let jwks = await cache.get(cacheKey);

				if (!jwks) {
					const resp = await fetch(env.ACCESS_JWKS_URL);
					jwks = await resp.json();
					await cache.set(cacheKey, jwks, { ttl: CacheTTL.JWKS_KEYS(env) });
				}

				return new Response(JSON.stringify(jwks, null, 2), {
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
						"Cache-Control": "public, max-age=3600, s-maxage=3600",
					},
				});
			} catch (_error) {
				// Fall through to empty JWKS
			}
		}

		// Fallback: return empty JWKS if Access not configured
		const jwks = { keys: [] };
		return new Response(JSON.stringify(jwks, null, 2), {
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": "public, max-age=3600, s-maxage=3600",
			},
		});
	}

	// Handle CORS preflight requests for MCP endpoints
	if (
		request.method === "OPTIONS" &&
		(pathname === "/sse" || pathname === "/sse/message" || pathname === "/mcp")
	) {
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers":
					"Content-Type, Authorization, Cache-Control, mcp-protocol-version",
				"Access-Control-Max-Age": "86400", // 24 hours
			},
		});
	}

	// Handle MCP endpoints with OAuth protection
	if (
		pathname === "/sse" ||
		pathname === "/sse/message" ||
		pathname === "/mcp"
	) {
		// Authenticate request
		const authResult = await authenticateMcpRequest(request, env);

		if (!authResult.authenticated) {
			const baseUrl = new URL(request.url).origin;
			const error = authResult.error ?? {
				code: "unknown_error",
				message: "Authentication failed",
			};
			return createUnauthorizedResponse(baseUrl, error);
		}

		// Forward to MCP handler
		return handleMcpRequest(request, env, ctx);
	}

	// All other routes go through OAuth handling
	return handleAccessRequest(request, env as any, ctx);
}

export default {
	fetch: mainHandler,
};
