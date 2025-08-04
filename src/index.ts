import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MerakiAPIService } from "./services/merakiapi";

// Environment interface
interface Env {
  MERAKI_API_KEY: string;
  MERAKI_BASE_URL?: string;
  AUTH_TOKEN?: string;
}

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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
        properties: { organizationId: { type: "string", description: "The organization ID" } },
        required: ["organizationId"],
      },
    },
    {
      name: "get_networks",
      description: "Get all networks in an organization",
      inputSchema: {
        type: "object",
        properties: { organizationId: { type: "string", description: "The organization ID" } },
        required: ["organizationId"],
      },
    },
    {
      name: "get_network",
      description: "Get details for a specific network",
      inputSchema: {
        type: "object",
        properties: { networkId: { type: "string", description: "The network ID" } },
        required: ["networkId"],
      },
    },
    {
      name: "get_devices",
      description: "Get all devices in a network",
      inputSchema: {
        type: "object",
        properties: { networkId: { type: "string", description: "The network ID" } },
        required: ["networkId"],
      },
    },
    {
      name: "get_device",
      description: "Get details for a specific device",
      inputSchema: {
        type: "object",
        properties: { serial: { type: "string", description: "The device serial number" } },
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
          timespan: { type: "number", description: "Time span in seconds (max 31 days)" },
        },
        required: ["networkId"],
      },
    },
    {
      name: "get_device_statuses",
      description: "Get device statuses for an organization",
      inputSchema: {
        type: "object",
        properties: { organizationId: { type: "string", description: "The organization ID" } },
        required: ["organizationId"],
      },
    },
    {
      name: "get_switch_ports",
      description: "Get switch ports for a device",
      inputSchema: {
        type: "object",
        properties: { serial: { type: "string", description: "The device serial number" } },
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
          timespan: { type: "number", description: "Time span in seconds (default 300)" },
        },
        required: ["serial"],
      },
    },
    {
      name: "get_management_interface",
      description: "Get management interface settings for a device",
      inputSchema: {
        type: "object",
        properties: { serial: { type: "string", description: "The device serial number" } },
        required: ["serial"],
      },
    },
    {
      name: "get_wireless_radio_settings",
      description: "Get wireless radio settings for an access point",
      inputSchema: {
        type: "object",
        properties: { serial: { type: "string", description: "The device serial number" } },
        required: ["serial"],
      },
    },
    {
      name: "get_wireless_status",
      description: "Get wireless status of an access point",
      inputSchema: {
        type: "object",
        properties: { serial: { type: "string", description: "The device serial number" } },
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
          timespan: { type: "number", description: "Time span in seconds (default 86400)" },
        },
        required: ["serial"],
      },
    },
    {
      name: "get_switch_routing_interfaces",
      description: "Get routing interfaces for a switch",
      inputSchema: {
        type: "object",
        properties: { serial: { type: "string", description: "The device serial number" } },
        required: ["serial"],
      },
    },
    {
      name: "get_switch_static_routes",
      description: "Get static routes for a switch",
      inputSchema: {
        type: "object",
        properties: { serial: { type: "string", description: "The device serial number" } },
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
          timespan: { type: "number", description: "Time span in seconds (default 86400)" },
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
          perPage: { type: "number", description: "Number of events per page (default 10)" },
        },
        required: ["networkId"],
      },
    },
  ];
}

// Create and configure MCP server
function createMCPServer(env: Env) {
  const server = new Server(
    {
      name: "Cisco Meraki MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Initialize Meraki service
  const merakiService = new MerakiAPIService(
    env.MERAKI_API_KEY,
    env.MERAKI_BASE_URL
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getToolsList(),
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_organizations": {
          console.log(`[MERAKI-MCP-CALL] get_organizations called at ${new Date().toISOString()}`);
          const organizations = await merakiService.getOrganizations();
          console.log(`[MERAKI-MCP-CALL] get_organizations success: ${organizations.length} organizations`);
          return {
            content: [{ type: "text", text: JSON.stringify(organizations, null, 2) }],
          };
        }

        case "get_organization": {
          const { organizationId } = args as { organizationId: string };
          console.log(`[MERAKI-MCP-CALL] get_organization called for ID: ${organizationId}`);
          const organization = await merakiService.getOrganization(organizationId);
          console.log(`[MERAKI-MCP-CALL] get_organization success for: ${organization.name}`);
          return {
            content: [{ type: "text", text: JSON.stringify(organization, null, 2) }],
          };
        }

        case "get_networks": {
          const { organizationId } = args as { organizationId: string };
          console.log(`[MERAKI-MCP-CALL] get_networks called for org: ${organizationId}`);
          const networks = await merakiService.getNetworks(organizationId);
          console.log(`[MERAKI-MCP-CALL] get_networks success: ${networks.length} networks`);
          return {
            content: [{ type: "text", text: JSON.stringify(networks, null, 2) }],
          };
        }

        case "get_network": {
          const { networkId } = args as { networkId: string };
          console.log(`[MERAKI-MCP-CALL] get_network called for ID: ${networkId}`);
          const network = await merakiService.getNetwork(networkId);
          console.log(`[MERAKI-MCP-CALL] get_network success for: ${network.name}`);
          return {
            content: [{ type: "text", text: JSON.stringify(network, null, 2) }],
          };
        }

        case "get_devices": {
          const { networkId } = args as { networkId: string };
          console.log(`[MERAKI-MCP-CALL] get_devices called for network: ${networkId}`);
          const devices = await merakiService.getDevices(networkId);
          console.log(`[MERAKI-MCP-CALL] get_devices success: ${devices.length} devices`);
          return {
            content: [{ type: "text", text: JSON.stringify(devices, null, 2) }],
          };
        }

        case "get_device": {
          const { serial } = args as { serial: string };
          console.log(`[MERAKI-MCP-CALL] get_device called for serial: ${serial}`);
          const device = await merakiService.getDevice(serial);
          console.log(`[MERAKI-MCP-CALL] get_device success for: ${device.name || device.serial}`);
          return {
            content: [{ type: "text", text: JSON.stringify(device, null, 2) }],
          };
        }

        case "get_clients": {
          const { networkId, timespan } = args as { networkId: string; timespan?: number };
          console.log(`[MERAKI-MCP-CALL] get_clients called for network: ${networkId}, timespan: ${timespan}`);
          const clients = await merakiService.getClients(networkId, timespan);
          console.log(`[MERAKI-MCP-CALL] get_clients success: ${clients.length} clients`);
          return {
            content: [{ type: "text", text: JSON.stringify(clients, null, 2) }],
          };
        }

        case "get_device_statuses": {
          const { organizationId } = args as { organizationId: string };
          console.log(`[MERAKI-MCP-CALL] get_device_statuses called for org: ${organizationId}`);
          const statuses = await merakiService.getDeviceStatuses(organizationId);
          console.log(`[MERAKI-MCP-CALL] get_device_statuses success: ${statuses.length} device statuses`);
          return {
            content: [{ type: "text", text: JSON.stringify(statuses, null, 2) }],
          };
        }

        case "get_switch_ports": {
          const { serial } = args as { serial: string };
          console.log(`[MERAKI-MCP-CALL] get_switch_ports called for serial: ${serial}`);
          const ports = await merakiService.getSwitchPorts(serial);
          console.log(`[MERAKI-MCP-CALL] get_switch_ports success: ${ports.length} ports`);
          return {
            content: [{ type: "text", text: JSON.stringify(ports, null, 2) }],
          };
        }

        case "get_switch_port_statuses": {
          const { serial, timespan } = args as { serial: string; timespan?: number };
          console.log(`[MERAKI-MCP-CALL] get_switch_port_statuses called for serial: ${serial}, timespan: ${timespan}`);
          const statuses = await merakiService.getSwitchPortStatuses(serial, timespan);
          console.log(`[MERAKI-MCP-CALL] get_switch_port_statuses success: ${statuses.length} port statuses`);
          return {
            content: [{ type: "text", text: JSON.stringify(statuses, null, 2) }],
          };
        }

        case "get_management_interface": {
          const { serial } = args as { serial: string };
          console.log(`[MERAKI-MCP-CALL] get_management_interface called for serial: ${serial}`);
          const mgmtInterface = await merakiService.getManagementInterface(serial);
          console.log(`[MERAKI-MCP-CALL] get_management_interface success for: ${serial}`);
          return {
            content: [{ type: "text", text: JSON.stringify(mgmtInterface, null, 2) }],
          };
        }

        case "get_wireless_radio_settings": {
          const { serial } = args as { serial: string };
          console.log(`[MERAKI-MCP-CALL] get_wireless_radio_settings called for serial: ${serial}`);
          const radioSettings = await merakiService.getWirelessRadioSettings(serial);
          console.log(`[MERAKI-MCP-CALL] get_wireless_radio_settings success for: ${serial}`);
          return {
            content: [{ type: "text", text: JSON.stringify(radioSettings, null, 2) }],
          };
        }

        case "get_wireless_status": {
          const { serial } = args as { serial: string };
          console.log(`[MERAKI-MCP-CALL] get_wireless_status called for serial: ${serial}`);
          const wirelessStatus = await merakiService.getWirelessStatus(serial);
          console.log(`[MERAKI-MCP-CALL] get_wireless_status success for: ${serial}`);
          return {
            content: [{ type: "text", text: JSON.stringify(wirelessStatus, null, 2) }],
          };
        }

        case "get_wireless_latency_stats": {
          const { serial, timespan } = args as { serial: string; timespan?: number };
          console.log(`[MERAKI-MCP-CALL] get_wireless_latency_stats called for serial: ${serial}, timespan: ${timespan}`);
          const latencyStats = await merakiService.getWirelessLatencyStats(serial, timespan);
          console.log(`[MERAKI-MCP-CALL] get_wireless_latency_stats success for: ${serial}`);
          return {
            content: [{ type: "text", text: JSON.stringify(latencyStats, null, 2) }],
          };
        }

        case "get_switch_routing_interfaces": {
          const { serial } = args as { serial: string };
          console.log(`[MERAKI-MCP-CALL] get_switch_routing_interfaces called for serial: ${serial}`);
          const routingInterfaces = await merakiService.getSwitchRoutingInterfaces(serial);
          console.log(`[MERAKI-MCP-CALL] get_switch_routing_interfaces success for: ${serial}`);
          return {
            content: [{ type: "text", text: JSON.stringify(routingInterfaces, null, 2) }],
          };
        }

        case "get_switch_static_routes": {
          const { serial } = args as { serial: string };
          console.log(`[MERAKI-MCP-CALL] get_switch_static_routes called for serial: ${serial}`);
          const staticRoutes = await merakiService.getSwitchStaticRoutes(serial);
          console.log(`[MERAKI-MCP-CALL] get_switch_static_routes success for: ${serial}`);
          return {
            content: [{ type: "text", text: JSON.stringify(staticRoutes, null, 2) }],
          };
        }

        case "get_network_traffic": {
          const { networkId, timespan } = args as { networkId: string; timespan?: number };
          console.log(`[MERAKI-MCP-CALL] get_network_traffic called for network: ${networkId}, timespan: ${timespan}`);
          const traffic = await merakiService.getNetworkTraffic(networkId, timespan);
          console.log(`[MERAKI-MCP-CALL] get_network_traffic success for: ${networkId}`);
          return {
            content: [{ type: "text", text: JSON.stringify(traffic, null, 2) }],
          };
        }

        case "get_network_events": {
          const { networkId, perPage } = args as { networkId: string; perPage?: number };
          console.log(`[MERAKI-MCP-CALL] get_network_events called for network: ${networkId}, perPage: ${perPage}`);
          const events = await merakiService.getNetworkEvents(networkId, perPage);
          console.log(`[MERAKI-MCP-CALL] get_network_events success for: ${networkId}`);
          return {
            content: [{ type: "text", text: JSON.stringify(events, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.log(`[MERAKI-MCP-CALL] ${name} error: ${errorMessage}`);
      throw error;
    }
  });

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    // Handle SSE endpoint
    if (pathname === '/sse') {
      if (!env.MERAKI_API_KEY) {
        return new Response('MERAKI_API_KEY not configured', { status: 500 });
      }

      // Authentication check
      if (env.AUTH_TOKEN) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response('Authorization header required', { status: 401 });
        }
        const token = authHeader.slice(7); // Remove 'Bearer ' prefix
        if (token !== env.AUTH_TOKEN) {
          return new Response('Invalid token', { status: 401 });
        }
      }
      
      try {
        // Create MCP server instance
        const server = createMCPServer(env);
        
        // Handle SSE connections
        if (request.method === 'GET') {
          // Create a readable stream for SSE that stays open
          let controller: ReadableStreamDefaultController;
          const readable = new ReadableStream({
            start(controllerParam) {
              controller = controllerParam;
              
              // Send SSE header to keep connection alive
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode('retry: 1000\n\n'));
              
              // Keep the connection alive with periodic pings
              const interval = setInterval(() => {
                try {
                  controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'));
                } catch (error) {
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
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        }
        
        // Handle POST requests with MCP messages
        if (request.method === 'POST') {
          const message = await request.json() as any;
          console.log('Received MCP message:', JSON.stringify(message, null, 2));
          
          let response;
          
          if (message.method === 'initialize') {
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
          } else if (message.method === 'tools/list') {
            response = {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                tools: getToolsList(),
              },
            };
          } else if (message.method === 'tools/call') {
            // Call the tool directly using the service
            const toolName = message.params?.name;
            const args = message.params?.arguments || {};
            
            try {
              const merakiService = new MerakiAPIService(env.MERAKI_API_KEY, env.MERAKI_BASE_URL);
              let result;
              
              switch (toolName) {
                case "get_organizations":
                  result = await merakiService.getOrganizations();
                  break;
                case "get_organization":
                  result = await merakiService.getOrganization(args.organizationId);
                  break;
                case "get_networks":
                  result = await merakiService.getNetworks(args.organizationId);
                  break;
                case "get_network":
                  result = await merakiService.getNetwork(args.networkId);
                  break;
                case "get_devices":
                  result = await merakiService.getDevices(args.networkId);
                  break;
                case "get_device":
                  result = await merakiService.getDevice(args.serial);
                  break;
                case "get_clients":
                  result = await merakiService.getClients(args.networkId, args.timespan);
                  break;
                case "get_device_statuses":
                  result = await merakiService.getDeviceStatuses(args.organizationId);
                  break;
                case "get_switch_ports":
                  result = await merakiService.getSwitchPorts(args.serial);
                  break;
                case "get_switch_port_statuses":
                  result = await merakiService.getSwitchPortStatuses(args.serial, args.timespan);
                  break;
                case "get_management_interface":
                  result = await merakiService.getManagementInterface(args.serial);
                  break;
                case "get_wireless_radio_settings":
                  result = await merakiService.getWirelessRadioSettings(args.serial);
                  break;
                case "get_wireless_status":
                  result = await merakiService.getWirelessStatus(args.serial);
                  break;
                case "get_wireless_latency_stats":
                  result = await merakiService.getWirelessLatencyStats(args.serial, args.timespan);
                  break;
                case "get_switch_routing_interfaces":
                  result = await merakiService.getSwitchRoutingInterfaces(args.serial);
                  break;
                case "get_switch_static_routes":
                  result = await merakiService.getSwitchStaticRoutes(args.serial);
                  break;
                case "get_network_traffic":
                  result = await merakiService.getNetworkTraffic(args.networkId, args.timespan);
                  break;
                case "get_network_events":
                  result = await merakiService.getNetworkEvents(args.networkId, args.perPage);
                  break;
                default:
                  throw new Error(`Unknown tool: ${toolName}`);
              }
              
              response = {
                jsonrpc: "2.0",
                id: message.id,
                result: {
                  content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
        
        return new Response('Method not allowed', { status: 405 });
      } catch (error) {
        console.error('SSE endpoint error:', error);
        return new Response(`Internal server error: ${getErrorMessage(error)}`, { status: 500 });
      }
    }

    // Handle health check
    if (pathname === '/health') {
      return new Response(JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "meraki-mcp-server",
        hasApiKey: !!env.MERAKI_API_KEY,
        authEnabled: !!env.AUTH_TOKEN,
        version: "1.0.0",
        tools: getToolsList().length,
        endpoints: ["/sse", "/health", "/"]
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Default response
    return new Response('Cisco Meraki MCP Server - Use /sse for MCP connection or /health for status', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};