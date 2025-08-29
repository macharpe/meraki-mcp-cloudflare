import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { handleAccessRequest } from "./access-handler";
import { MerakiAPIService } from "./services/merakiapi";
import type { Env } from "./types/env";

export class MerakiMCPAgent extends McpAgent<
	Env,
	Record<string, never>,
	{ email: string }
> {
	server = new McpServer({
		name: "Cisco Meraki MCP Server",
		version: "1.0.0",
	});

	async init() {
		const merakiService = new MerakiAPIService(
			this.env.MERAKI_API_KEY,
			this.env.MERAKI_BASE_URL,
		);

		// Register tools with shortened prefix to stay under 64-character limit
		const registerTool = (
			name: string,
			description: string,
			schema: any,
			handler: any,
		) => {
			const metadata = {
				title: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
				annotations: { readOnlyHint: true },
			};
			this.server.tool(
				`meraki_${name}`,
				description,
				schema,
				metadata,
				handler,
			);
		};

		// Organization & Network Management Tools
		registerTool(
			"get_organizations",
			"Get all Meraki organizations",
			{},
			async () => ({
				content: [
					{
						text: JSON.stringify(
							await merakiService.getOrganizations(),
							null,
							2,
						),
						type: "text",
					},
				],
			}),
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
	}
}

async function handleMcpRequest(
	req: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	const { pathname } = new URL(req.url);
	if (pathname === "/sse" || pathname === "/sse/message") {
		return MerakiMCPAgent.serveSSE("/sse").fetch(req, env, ctx);
	}
	if (pathname === "/mcp") {
		return MerakiMCPAgent.serve("/mcp").fetch(req, env, ctx);
	}
	return new Response("Not found", { status: 404 });
}

export default new OAuthProvider({
	apiHandler: { fetch: handleMcpRequest as any },
	apiRoute: ["/sse", "/mcp"],
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: { fetch: handleAccessRequest as any },
	tokenEndpoint: "/token",
});
