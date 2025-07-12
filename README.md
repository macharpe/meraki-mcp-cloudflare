# 🌐 Cisco Meraki MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Compatible-blue?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Cisco Meraki](https://img.shields.io/badge/Cisco-Meraki-1BA0D7?style=for-the-badge&logo=cisco&logoColor=white)](https://meraki.cisco.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/)

A Model Context Protocol (MCP) server that provides AI assistants with direct access to Cisco Meraki network management capabilities. This server runs on Cloudflare Workers and enables seamless integration between AI tools like Claude Desktop and your Meraki infrastructure.

> **Inspiration**: This implementation was inspired by [Censini/mcp-server-meraki](https://github.com/Censini/mcp-server-meraki) - credits to the original work for additional API method ideas.

## ✨ Features

### 🛠️ Available Tools

The server provides **18 comprehensive Meraki management tools**:

#### 🏢 Organization & Network Management
- **`get_organizations`** - List all organizations in your Meraki account
- **`get_organization`** - Get detailed information about a specific organization
- **`get_networks`** - List all networks within an organization
- **`get_network`** - Get detailed information about a specific network

#### 📱 Device Management
- **`get_devices`** - List all devices within a network
- **`get_device`** - Get detailed information about a specific device
- **`get_device_statuses`** - Get device statuses for an organization
- **`get_device_performance`** - Get performance statistics for a device
- **`get_management_interface`** - Get management interface settings for a device

#### 🌐 Network Operations
- **`get_clients`** - Get clients connected to a network
- **`get_network_traffic`** - Get network traffic statistics
- **`get_network_events`** - Get recent network events

#### 🔗 Switch Management
- **`get_switch_ports`** - Get switch ports for a device
- **`get_switch_port_statuses`** - Get switch port statuses for a device
- **`get_switch_routing_interfaces`** - Get routing interfaces for a switch
- **`get_switch_static_routes`** - Get static routes for a switch

#### 📡 Wireless Management
- **`get_wireless_radio_settings`** - Get wireless radio settings for an access point
- **`get_wireless_status`** - Get wireless status of an access point
- **`get_wireless_latency_stats`** - Get wireless latency statistics for an access point

### 🎯 Key Benefits

- 🚀 **Serverless**: Runs on Cloudflare Workers with automatic scaling
- 🔒 **Secure**: API key management through Cloudflare Workers secrets
- 🌐 **Remote Access**: Connect from any MCP client using SSE transport
- 📱 **Real-time**: Live access to your Meraki dashboard data
- 💰 **Cost-effective**: Pay-per-use with Cloudflare Workers free tier

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude        │    │  MCP Server      │    │  Meraki API     │
│   Desktop       │◄──►│  (Cloudflare     │◄──►│  Dashboard      │
│                 │    │   Workers)       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
     mcp-remote              SSE/HTTP              HTTPS/REST
```

### 📁 Project Structure

```
meraki-mcp-cloudflare/
├── src/
│   ├── index.ts              # Main MCP server implementation
│   ├── services/
│   │   └── merakiapi.ts      # Meraki API service layer
│   ├── types/
│   │   └── meraki.ts         # TypeScript type definitions
│   └── errors.ts             # Custom error classes
├── wrangler.jsonc            # Cloudflare Workers configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 📋 Prerequisites

Before deploying the server, ensure you have:

1. **Cloudflare Account**: Free account at [cloudflare.com](https://cloudflare.com)
2. **Cisco Meraki Account**: With API access enabled
3. **Meraki API Key**: Generated from your Meraki Dashboard
4. **Node.js**: Version 18 or higher
5. **Git**: For cloning the repository

### 🔑 Getting Your Meraki API Key

1. Log into your [Meraki Dashboard](https://dashboard.meraki.com)
2. Navigate to **Organization > Settings > Dashboard API access**
3. Enable API access if not already enabled
4. Generate a new API key and copy it securely

## 🚀 Installation & Deployment

### 1. Clone the Repository

```bash
git clone https://github.com/macharpe/meraki-mcp-cloudflare.git
cd meraki-mcp-cloudflare
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.dev.vars` file for local development:

```bash
echo "MERAKI_API_KEY=your_meraki_api_key_here" > .dev.vars
```

### 4. Local Development

Test the server locally:

```bash
npm run dev
```

The server will start at `http://localhost:8787`

Test the health endpoint:
```bash
curl http://localhost:8787/health
```

### 5. Deploy to Cloudflare Workers

First, authenticate with Cloudflare:
```bash
npx wrangler login
```

Set your API key as a secret:
```bash
npx wrangler secret put MERAKI_API_KEY
# Enter your Meraki API key when prompted
```

Deploy the server:
```bash
npx wrangler deploy
```

Your server will be available at: `https://meraki-mcp-cloudflare.<your-account>.workers.dev`

The health endpoint will show:
```json
{
  "status": "healthy",
  "hasApiKey": true,
  "tools": 18,
  "endpoints": ["/sse", "/health", "/"]
}
```

## ⚙️ Configuration

### 💻 Claude Desktop Integration

Add the following to your Claude Desktop configuration file:

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "meraki": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://meraki-mcp-cloudflare.<your-account>.workers.dev/sse"
      ]
    }
  }
}
```

**Replace `<your-account>` with your actual Cloudflare account subdomain.**

### 🌍 Environment Variables

The server uses these environment variables:

- **`MERAKI_API_KEY`** (required): Your Cisco Meraki API key
- **`MERAKI_BASE_URL`** (optional): Base URL for Meraki API (defaults to `https://api.meraki.com/api/v1`)

## 💡 Usage Examples

Once connected to Claude Desktop, you can use natural language to interact with your Meraki infrastructure:

### 🏢 Get Organizations
```
"Show me all my Meraki organizations"
```

### 🌐 List Networks
```
"Get all networks in organization 123456"
```

### 📱 View Devices
```
"List all devices in the main office network"
```

### 🔍 Device Details
```
"Get details for device with serial ABC123DEF456"
```

### 📡 Wireless Management
```
"Show me the wireless status of access point with serial XYZ789"
"Get wireless latency statistics for the office AP"
```

### 🔗 Switch Operations
```
"List all switch ports for device ABC123"
"Show me the routing interfaces for the core switch"
```

### 📊 Network Analytics
```
"Get network traffic statistics for the main office"
"Show recent security events for organization 123456"
```

## 🌐 API Endpoints

The server exposes these HTTP endpoints:

- **`GET /sse`** - Server-Sent Events endpoint for MCP communication
- **`POST /sse`** - HTTP endpoint for MCP messages
- **`GET /health`** - Health check endpoint
- **`OPTIONS /*`** - CORS preflight handler

## 🛠️ Development

### 📜 Available Scripts

```bash
npm run dev          # Start local development server
npm run build        # Build TypeScript to JavaScript
npm run deploy       # Deploy to Cloudflare Workers
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### ➕ Adding New Tools

To add new Meraki API endpoints:

1. Add the method to `src/services/merakiapi.ts`
2. Define types in `src/types/meraki.ts`
3. Add the tool definition in `src/index.ts`
4. Add the tool handler in the switch statement

Example:
```typescript
// Add to tools array
{
  name: "get_clients",
  description: "Get clients connected to a network",
  inputSchema: {
    type: "object",
    properties: {
      networkId: { type: "string", description: "Network ID" }
    },
    required: ["networkId"]
  }
}

// Add to switch statement
case "get_clients":
  const clients = await merakiService.getClients(args.networkId);
  return { content: [{ type: "text", text: JSON.stringify(clients, null, 2) }] };
```

## 🔒 Security Considerations

- API keys are stored as Cloudflare Workers secrets (encrypted at rest)
- No authentication required for the MCP server (suitable for personal use)
- All communication uses HTTPS
- CORS headers allow cross-origin requests

## 🐛 Troubleshooting

### ⚠️ Common Issues

**"MERAKI_API_KEY not configured"**
- Ensure you've set the secret: `npx wrangler secret put MERAKI_API_KEY`

**"Server disconnected" in Claude Desktop**
- Check your Claude Desktop config file syntax
- Verify the server URL is correct
- Restart Claude Desktop after config changes

**"Rate limit exceeded"**
- Meraki API has rate limits; reduce request frequency
- Check your API key permissions

### 🔍 Debugging

Check Cloudflare Workers logs:
```bash
npx wrangler tail
```

View Claude Desktop MCP logs:
```bash
tail -f ~/Library/Logs/Claude/mcp-server-meraki.log
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-tool`
3. Make your changes and test locally
4. Commit your changes: `git commit -am 'Add new tool'`
5. Push to the branch: `git push origin feature/new-tool`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📊 Code Statistics

### Project Metrics
```
📁 Total Files: 15
📄 Source Files: 4 TypeScript files
🛠️ Available Tools: 18 Meraki API methods
🔧 API Service Methods: 20+ methods
📦 Dependencies: 3 main packages (@modelcontextprotocol/sdk, agents, zod)
⚡ Build Output: ~523 KiB (83 KiB gzipped)
```

### File Breakdown
```
src/
├── index.ts              # 726 lines - Main MCP server & HTTP handlers
├── services/
│   └── merakiapi.ts      # 168 lines - Meraki API service layer  
├── types/
│   └── meraki.ts         # Type definitions for Meraki objects
└── errors.ts             # Custom error classes
```

### API Coverage
- **Organizations**: 2 methods (list, get details)
- **Networks**: 4 methods (list, details, traffic, events)  
- **Devices**: 5 methods (list, details, status, performance, management)
- **Wireless**: 3 methods (radio settings, status, latency stats)
- **Switch**: 4 methods (ports, port status, routing, static routes)
- **Clients**: 1 method (network clients)

### Performance
- **Cold Start**: ~30ms on Cloudflare Workers
- **Response Time**: <100ms for most API calls
- **Rate Limits**: Respects Meraki API limits (5 requests/second)
- **Caching**: Browser/CDN caching for static responses

## 📚 Related Resources

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Cisco Meraki API Documentation](https://developer.cisco.com/meraki/api/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Claude Desktop MCP Setup](https://modelcontextprotocol.io/quickstart/user)

## 💬 Support

For issues and questions:
- Create an issue in this repository
- Check the [MCP documentation](https://modelcontextprotocol.io/docs/tools/debugging)
- Review Cloudflare Workers [error handling](https://developers.cloudflare.com/workers/observability/errors/)