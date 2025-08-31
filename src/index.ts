import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { handleAccessRequest } from "./access-handler";
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
		console.error(
			`[DEBUG] MerakiMCPAgent.fetch called with ${request.method} ${new URL(request.url).pathname}`,
		);
		console.error(
			`[DEBUG] Authorization header:`,
			request.headers.get("Authorization"),
		);
		console.error(`[DEBUG] this.env available:`, !!this.env);

		if (!this.initialized) {
			console.error(`[DEBUG] Initializing MerakiMCPAgent in fetch`);
			await this.init();
			this.initialized = true;
		}

		const { pathname } = new URL(request.url);

		if (pathname === "/sse" || pathname === "/sse/message") {
			console.error(
				`[DEBUG] Handling SSE request - using direct server response`,
			);
			// For now, return a simple SSE-compatible response
			return new Response(
				'data: {"jsonrpc":"2.0","method":"notification","params":{"type":"initialized"}}\n\n',
				{
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				},
			);
		}

		if (pathname === "/mcp") {
			console.error(
				`[DEBUG] Handling MCP request - using direct server response`,
			);

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
			console.error(`[DEBUG] MCP request body:`, body);

			// Handle GET requests (for SSE) - return SSE stream
			if (request.method === "GET" || !body.trim()) {
				console.error(
					`[DEBUG] Handling GET request or empty body - returning SSE stream`,
				);
				return new Response(
					'data: {"jsonrpc":"2.0","method":"notification","params":{"type":"initialized"}}\n\n',
					{
						headers: {
							"Content-Type": "text/event-stream",
							"Cache-Control": "no-cache",
							Connection: "keep-alive",
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
							"Access-Control-Allow-Headers":
								"Content-Type, Authorization, Cache-Control",
						},
					},
				);
			}

			try {
				const mcpRequest = JSON.parse(body);
				console.error(`[DEBUG] Parsed MCP request:`, mcpRequest);

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
					];

					return createMcpResponse({
						jsonrpc: "2.0",
						id: mcpRequest.id,
						result: { tools: toolsList },
					});
				}

				if (mcpRequest.method === "tools/call") {
					console.error(`[DEBUG] ========== TOOL CALL START ==========`);
					console.error(`[DEBUG] Tool call method:`, mcpRequest.params.name);
					console.error(
						`[DEBUG] Tool call arguments:`,
						JSON.stringify(mcpRequest.params.arguments),
					);
					console.error(`[DEBUG] Request ID:`, mcpRequest.id);

					const merakiService = new MerakiAPIService(
						this.env.MERAKI_API_KEY,
						this.env.MERAKI_BASE_URL,
					);

					try {
						let result: unknown;
						const startTime = Date.now();
						switch (mcpRequest.params.name) {
							case "meraki_get_organizations":
								console.error(`[DEBUG] Executing meraki_get_organizations`);
								result = await merakiService.getOrganizations();
								console.error(
									`[DEBUG] meraki_get_organizations completed in ${Date.now() - startTime}ms`,
								);
								console.error(
									`[DEBUG] Result type:`,
									typeof result,
									`Array:`,
									Array.isArray(result),
									`Length:`,
									Array.isArray(result) ? result.length : "N/A",
								);
								break;
							case "meraki_get_organization":
								console.error(`[DEBUG] Executing meraki_get_organization`);
								result = await merakiService.getOrganization(
									mcpRequest.params.arguments.organizationId,
								);
								break;
							case "meraki_get_networks":
								console.error(`[DEBUG] Executing meraki_get_networks`);
								result = await merakiService.getNetworks(
									mcpRequest.params.arguments.organizationId,
								);
								break;
							case "meraki_get_network":
								console.error(`[DEBUG] Executing meraki_get_network`);
								result = await merakiService.getNetwork(
									mcpRequest.params.arguments.networkId,
								);
								break;
							case "meraki_get_network_traffic":
								console.error(`[DEBUG] Executing meraki_get_network_traffic`);
								result = await merakiService.getNetworkTraffic(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_network_events":
								console.error(`[DEBUG] Executing meraki_get_network_events`);
								result = await merakiService.getNetworkEvents(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.perPage,
								);
								break;
							case "meraki_get_devices":
								console.error(`[DEBUG] Executing meraki_get_devices`);
								result = await merakiService.getDevices(
									mcpRequest.params.arguments.networkId,
								);
								break;
							case "meraki_get_device":
								console.error(`[DEBUG] Executing meraki_get_device`);
								result = await merakiService.getDevice(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_clients":
								console.error(`[DEBUG] Executing meraki_get_clients`);
								result = await merakiService.getClients(
									mcpRequest.params.arguments.networkId,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_device_statuses":
								console.error(`[DEBUG] Executing meraki_get_device_statuses`);
								result = await merakiService.getDeviceStatuses(
									mcpRequest.params.arguments.organizationId,
								);
								break;
							case "meraki_get_management_interface":
								console.error(
									`[DEBUG] Executing meraki_get_management_interface`,
								);
								result = await merakiService.getManagementInterface(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_switch_ports":
								console.error(`[DEBUG] Executing meraki_get_switch_ports`);
								result = await merakiService.getSwitchPorts(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_switch_port_statuses":
								console.error(
									`[DEBUG] Executing meraki_get_switch_port_statuses`,
								);
								result = await merakiService.getSwitchPortStatuses(
									mcpRequest.params.arguments.serial,
									mcpRequest.params.arguments.timespan,
								);
								break;
							case "meraki_get_switch_routing_interfaces":
								console.error(
									`[DEBUG] Executing meraki_get_switch_routing_interfaces`,
								);
								result = await merakiService.getSwitchRoutingInterfaces(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_switch_static_routes":
								console.error(
									`[DEBUG] Executing meraki_get_switch_static_routes`,
								);
								result = await merakiService.getSwitchStaticRoutes(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_wireless_radio_settings":
								console.error(
									`[DEBUG] Executing meraki_get_wireless_radio_settings`,
								);
								result = await merakiService.getWirelessRadioSettings(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_wireless_status":
								console.error(`[DEBUG] Executing meraki_get_wireless_status`);
								result = await merakiService.getWirelessStatus(
									mcpRequest.params.arguments.serial,
								);
								break;
							case "meraki_get_wireless_latency_stats":
								console.error(
									`[DEBUG] Executing meraki_get_wireless_latency_stats`,
								);
								result = await merakiService.getWirelessLatencyStats(
									mcpRequest.params.arguments.serial,
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
						console.error(`[DEBUG] ========== TOOL CALL SUCCESS ==========`);
						console.error(
							`[DEBUG] Response structure:`,
							JSON.stringify(response, null, 2),
						);
						console.error(
							`[DEBUG] Response size:`,
							JSON.stringify(response).length,
							"characters",
						);

						const responseBody = JSON.stringify(response);
						const finalResponse = new Response(responseBody, {
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
								"Access-Control-Allow-Headers": "Content-Type, Authorization",
							},
						});

						console.error(
							`[DEBUG] Final response status:`,
							finalResponse.status,
						);
						console.error(
							`[DEBUG] Final response content-type:`,
							finalResponse.headers.get("Content-Type"),
						);
						console.error(`[DEBUG] ========== TOOL CALL END ==========`);

						return finalResponse;
					} catch (error) {
						console.error(`[ERROR] ========== TOOL CALL ERROR ==========`);
						console.error(`[ERROR] Tool execution error:`, error);
						console.error(
							`[ERROR] Error stack:`,
							error instanceof Error ? error.stack : "No stack trace",
						);
						console.error(`[ERROR] Request ID:`, mcpRequest.id);
						console.error(`[ERROR] ========== TOOL CALL ERROR END ==========`);

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
								headers: { "Content-Type": "application/json" },
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
							headers: { "Content-Type": "application/json" },
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
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				if (mcpRequest.method === "notifications/initialized") {
					// Notifications don't need a response
					return new Response("", { status: 204 });
				}

				// Default response for unhandled methods
				console.error(`[DEBUG] Unhandled method: ${mcpRequest.method}`);
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
						headers: { "Content-Type": "application/json" },
					},
				);
			} catch (error) {
				console.error(`[ERROR] MCP parsing error:`, error);
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: { code: -32700, message: "Parse error" },
					}),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		return new Response("Not Found", { status: 404 });
	}

	async init() {
		console.error(
			`[DEBUG] MCP Agent init - MERAKI_API_KEY available: ${!!this.env.MERAKI_API_KEY}`,
		);
		console.error(
			`[DEBUG] MCP Agent init - MERAKI_BASE_URL: ${this.env.MERAKI_BASE_URL}`,
		);

		const merakiService = new MerakiAPIService(
			this.env.MERAKI_API_KEY,
			this.env.MERAKI_BASE_URL,
		);

		// Register tools with shortened prefix to stay under 64-character limit
		const registerTool = (
			name: string,
			description: string,
			schema: unknown,
			handler: unknown,
		) => {
			const metadata = {
				title: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
				annotations: { readOnlyHint: true },
			};
			const toolName = `meraki_${name}`;
			console.error(`[DEBUG] Registering tool: ${toolName}`);
			this.server.tool(toolName, description, schema as any, metadata, handler as any);
		};

		// Organization & Network Management Tools
		registerTool(
			"get_organizations",
			"Get all Meraki organizations",
			{},
			async () => {
				console.error(`[DEBUG] get_organizations called`);
				try {
					const orgs = await merakiService.getOrganizations();
					console.error(
						`[DEBUG] get_organizations success: ${JSON.stringify(orgs)}`,
					);
					return {
						content: [
							{
								text: JSON.stringify(orgs, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					console.error(`[DEBUG] get_organizations error:`, error);
					throw error;
				}
			},
		);

		registerTool(
			"get_organization",
			"Get details for a specific organization",
			{ organizationId: z.string().describe("The organization ID") },
			async ({ organizationId }: { organizationId: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getOrganization(organizationId),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_networks",
			"Get all networks in an organization",
			{ organizationId: z.string().describe("The organization ID") },
			async ({ organizationId }: { organizationId: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getNetworks(organizationId),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_network",
			"Get details for a specific network",
			{ networkId: z.string().describe("The network ID") },
			async ({ networkId }: { networkId: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getNetwork(networkId),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_network_traffic",
			"Get network traffic statistics",
			{
				networkId: z.string().describe("The network ID"),
				timespan: z
					.number()
					.optional()
					.describe("Time span in seconds (default 86400)"),
			},
			async ({
				networkId,
				timespan,
			}: {
				networkId: string;
				timespan?: number;
			}) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getNetworkTraffic(networkId, timespan),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_network_events",
			"Get recent network events",
			{
				networkId: z.string().describe("The network ID"),
				perPage: z
					.number()
					.optional()
					.describe("Number of events per page (default 10)"),
			},
			async ({
				networkId,
				perPage,
			}: {
				networkId: string;
				perPage?: number;
			}) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getNetworkEvents(networkId, perPage),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		// Device Management Tools
		registerTool(
			"get_devices",
			"Get all devices in a network",
			{ networkId: z.string().describe("The network ID") },
			async ({ networkId }: { networkId: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getDevices(networkId),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_device",
			"Get details for a specific device",
			{ serial: z.string().describe("The device serial number") },
			async ({ serial }: { serial: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getDevice(serial),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_clients",
			"Get clients connected to a network",
			{
				networkId: z.string().describe("The network ID"),
				timespan: z
					.number()
					.optional()
					.describe("Time span in seconds (max 31 days)"),
			},
			async ({
				networkId,
				timespan,
			}: {
				networkId: string;
				timespan?: number;
			}) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getClients(networkId, timespan),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_device_statuses",
			"Get device statuses for an organization",
			{ organizationId: z.string().describe("The organization ID") },
			async ({ organizationId }: { organizationId: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getDeviceStatuses(organizationId),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_management_interface",
			"Get management interface settings for a device",
			{ serial: z.string().describe("The device serial number") },
			async ({ serial }: { serial: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getManagementInterface(serial),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		// Switch Tools
		registerTool(
			"get_switch_ports",
			"Get switch ports for a device",
			{ serial: z.string().describe("The device serial number") },
			async ({ serial }: { serial: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getSwitchPorts(serial),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_switch_port_statuses",
			"Get switch port statuses for a device",
			{
				serial: z.string().describe("The device serial number"),
				timespan: z
					.number()
					.optional()
					.describe("Time span in seconds (default 300)"),
			},
			async ({ serial, timespan }: { serial: string; timespan?: number }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getSwitchPortStatuses(serial, timespan),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_switch_routing_interfaces",
			"Get routing interfaces for a switch",
			{ serial: z.string().describe("The device serial number") },
			async ({ serial }: { serial: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getSwitchRoutingInterfaces(serial),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_switch_static_routes",
			"Get static routes for a switch",
			{ serial: z.string().describe("The device serial number") },
			async ({ serial }: { serial: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getSwitchStaticRoutes(serial),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		// Wireless Tools
		registerTool(
			"get_wireless_radio_settings",
			"Get wireless radio settings for an access point",
			{ serial: z.string().describe("The device serial number") },
			async ({ serial }: { serial: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getWirelessRadioSettings(serial),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_wireless_status",
			"Get wireless status of an access point",
			{ serial: z.string().describe("The device serial number") },
			async ({ serial }: { serial: string }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getWirelessStatus(serial),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		registerTool(
			"get_wireless_latency_stats",
			"Get wireless latency statistics for an access point",
			{
				serial: z.string().describe("The device serial number"),
				timespan: z
					.number()
					.optional()
					.describe("Time span in seconds (default 86400)"),
			},
			async ({ serial, timespan }: { serial: string; timespan?: number }) => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getWirelessLatencyStats(serial, timespan),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
		);

		console.error(`[DEBUG] MCP Agent init completed successfully`);
	}
}

async function handleMcpRequest(
	req: Request,
	env: Env,
	_ctx: ExecutionContext,
): Promise<Response> {
	const { pathname } = new URL(req.url);
	console.error(`[DEBUG] handleMcpRequest: ${req.method} ${pathname}`);
	console.error(`[DEBUG] handleMcpRequest - env:`, typeof env, !!env);
	console.error(
		`[DEBUG] handleMcpRequest - env.MCP_OBJECT:`,
		typeof env?.MCP_OBJECT,
		!!env?.MCP_OBJECT,
	);

	if (!env?.MCP_OBJECT) {
		console.error(`[ERROR] MCP_OBJECT not available in env`);
		return new Response("MCP_OBJECT not available", { status: 500 });
	}

	// Use a consistent ID so we always get the same Durable Object instance
	const durableObjectId = env.MCP_OBJECT.idFromName("meraki-mcp-agent");
	const stub = env.MCP_OBJECT.get(durableObjectId);

	console.error(`[DEBUG] Routing to Durable Object with consistent ID`);
	return stub.fetch(req);
}

// Create the main handler that routes between OAuth and MCP endpoints
async function mainHandler(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	const { pathname } = new URL(request.url);
	console.error(`[DEBUG] mainHandler: ${request.method} ${pathname}`);
	console.error(`[DEBUG] env.MCP_OBJECT available:`, !!env.MCP_OBJECT);

	// Handle CORS preflight requests for MCP endpoints
	if (
		request.method === "OPTIONS" &&
		(pathname === "/sse" || pathname === "/sse/message" || pathname === "/mcp")
	) {
		console.error(`[DEBUG] Handling CORS preflight for ${pathname}`);
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers":
					"Content-Type, Authorization, Cache-Control",
				"Access-Control-Max-Age": "86400", // 24 hours
			},
		});
	}

	// Handle MCP endpoints directly without OAuth protection
	if (
		pathname === "/sse" ||
		pathname === "/sse/message" ||
		pathname === "/mcp"
	) {
		return handleMcpRequest(request, env, ctx);
	}

	// All other routes go through OAuth handling
	return handleAccessRequest(
		request,
		env as any,
		ctx,
	);
}

export default {
	fetch: mainHandler,
};
