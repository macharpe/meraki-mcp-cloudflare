# 🌐 Cisco Meraki MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Compatible-blue?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Cisco Meraki](https://img.shields.io/badge/Cisco-Meraki-1BA0D7?style=for-the-badge&logo=cisco&logoColor=white)](https://meraki.cisco.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
[![Security](https://img.shields.io/github/actions/workflow/status/macharpe/meraki-mcp-cloudflare/semgrep.yml?branch=main&label=Security%20Scan&style=for-the-badge&logo=semgrep)](https://github.com/macharpe/meraki-mcp-cloudflare/actions/workflows/semgrep.yml)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/macharpe/meraki-mcp-cloudflare)

A Model Context Protocol (MCP) server that provides AI assistants with direct access to Cisco Meraki network management capabilities. This server runs on Cloudflare Workers with enterprise-grade security using Cloudflare Access Zero Trust authentication.

> **Prerequisites**: This implementation requires a domain managed by Cloudflare for custom domain setup and Cloudflare Access authentication.

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
- 🔒 **Enterprise Security**: Cloudflare Access Zero Trust authentication
- 🌐 **Custom Domain**: Professional branded domain with SSL
- 📱 **Real-time**: Live access to your Meraki dashboard data
- 💰 **Cost-effective**: Pay-per-use with Cloudflare Workers free tier
- 🛡️ **Zero Trust**: Service token authentication for machine-to-machine access

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude        │    │  MCP Server      │    │  Meraki API     │
│   Desktop       │◄──►│  (Cloudflare     │◄──►│  Dashboard      │
│                 │    │   Workers)       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
    Service Tokens       Custom Domain          HTTPS/REST
         ▲                      ▲
         └──────────────────────┘
           Cloudflare Access
           Zero Trust Security
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

1. **🌐 Cloudflare Account**: Free account at [cloudflare.com](https://cloudflare.com)
2. **🌍 Domain in Cloudflare**: Your domain must be managed by Cloudflare for custom domain and Access features
3. **🔑 Cisco Meraki Account**: With API access enabled
4. **🎫 Meraki API Key**: Generated from your Meraki Dashboard
5. **🛡️ Cloudflare Access Service Tokens**: Machine-to-machine authentication tokens (more secure than user-based authentication)
6. **💻 Node.js**: Version 18 or higher
7. **📦 Git**: For cloning the repository

### 🔑 Getting Your Meraki API Key

1. Log into your [Meraki Dashboard](https://dashboard.meraki.com)
2. Navigate to **Organization > Settings > Dashboard API access**
3. Enable API access if not already enabled
4. Generate a new API key and copy it securely

### 🛡️ Getting Cloudflare Access Service Tokens

Service tokens provide secure machine-to-machine authentication without requiring user interaction. They are more secure than traditional authentication methods because:

- **Automated Authentication**: No human intervention required for API access
- **Scoped Access**: Tokens can be restricted to specific applications and resources
- **Audit Trail**: All service token usage is logged and traceable
- **Revocable**: Tokens can be instantly revoked without affecting user access
- **No Password Risk**: No risk of password-based attacks or credential stuffing

**To generate service tokens, you'll need to complete the Cloudflare Access setup in the deployment section below.**

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

### 4. Configure Custom Domain

Update `wrangler.jsonc` with your domain:

```jsonc
{
  "name": "meraki-mcp-cloudflare",
  "main": "src/index.ts",
  "compatibility_date": "2025-08-04",
  "compatibility_flags": ["nodejs_compat"],
  
  "vars": {
    "MERAKI_BASE_URL": "https://api.meraki.com/api/v1",
    "CF_ACCESS_TEAM_DOMAIN": "yourcompany.cloudflareaccess.com"
  },
  
  "routes": [
    {
      "pattern": "meraki-mcp.yourdomain.com",
      "custom_domain": true
    }
  ],
  
  "workers_dev": false,
  "preview_urls": false,
  
  "build": {
    "command": "npm run build"
  },
  
  "observability": {
    "logs": {
      "enabled": true
    }
  }
}
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

Your server will be available at: `https://meraki-mcp.yourdomain.com`

## 🔒 Cloudflare Access Security Setup

### 1. Enable Cloudflare Access

1. Navigate to **Zero Trust** > **Access** > **Applications** in your Cloudflare dashboard
2. Click **Add an application** > **Self-hosted**

### 2. Configure Application

**Application Settings**:
- **Application name**: `Meraki MCP Server`
- **Subdomain**: `meraki-mcp` 
- **Domain**: `yourdomain.com`
- **Path**: `/` (protect entire application)

**Application Type**: Self-hosted

### 3. Create Access Policy

1. **Policy name**: `Service Token Access`
2. **Action**: `Service Auth`
3. **Rule type**: `Service Token`
4. Save the application

### 4. Generate Service Token

Service tokens provide secure machine-to-machine authentication, eliminating the need for user credentials and providing better security through:

- **No Interactive Login**: Tokens work without browser-based authentication
- **Application-Specific**: Each token is tied to specific applications  
- **Automatic Validation**: Cloudflare validates tokens at the network edge
- **Centralized Management**: Tokens can be managed and revoked from the dashboard

1. Go to **Access** > **Service Auth** > **Service Tokens**
2. Click **Create Service Token**
3. Configure token:
   - **Name**: `Meraki MCP Client`
   - **Duration**: Choose appropriate lifetime (e.g., 1 year)
4. **Important**: Copy the generated credentials:
   - **Client ID** (e.g., `00abc123def456789.access`)
   - **Client Secret** (e.g., `98d57c3451bff...`)

### 5. Set Application Audience Token (Required for Enhanced Security)

The Application Audience (AUD) token provides an additional layer of security by ensuring that service tokens can only be used with the specific Cloudflare Access application they were intended for. This prevents:

- **Token Reuse**: Prevents tokens from being used with other applications
- **Application Isolation**: Ensures strict boundaries between different services
- **Enhanced Validation**: Double-verification of both service token and application identity
- **Defense in Depth**: Multiple layers of authentication validation

The AUD token is a unique identifier for your Cloudflare Access application and can be found in your application settings.

Set the AUD token as a Worker secret:
```bash
npx wrangler secret put CF_ACCESS_AUD
# Enter the AUD value from your Cloudflare Access app (found in app settings)
# Example: 8078f4c875b3320cae6f27bd67d8a7b9d428e3f9aaf3e6b3fc0ec2bfd1ec798b
```

## ⚙️ Claude Desktop Configuration

### 💻 Setup Instructions

1. **Locate your Claude Desktop config file**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add the Meraki MCP server configuration**:

```json
{
  "mcpServers": {
    "meraki": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://meraki-mcp.yourdomain.com/sse",
        "--header",
        "CF-Access-Client-Id: 00abc123def456789.access",
        "--header",
        "CF-Access-Client-Secret: 98d57c3451bff29c4701e88729bec58f2e72c3ccb882a0a75f93996210e89ad7"
      ]
    }
  }
}
```

3. **Replace with your actual values**:
   - `yourdomain.com` → Your actual domain
   - `00abc123def456789.access` → Your actual Client ID
   - `98d57c3451bff...` → Your actual Client Secret

4. **Restart Claude Desktop** completely (quit and relaunch)

### ✅ Verify Configuration

Check that the server is properly connected:

1. Open Claude Desktop
2. Start a new conversation
3. Try: "List my Meraki organizations"

You should see a successful response with your organization data.

## 🌍 Environment Variables

The server uses these environment variables:

### Required
- **`MERAKI_API_KEY`** - Your Cisco Meraki API key (stored as Worker secret)

### Optional
- **`MERAKI_BASE_URL`** - Base URL for Meraki API (defaults to `https://api.meraki.com/api/v1`)
- **`CF_ACCESS_AUD`** - Application Audience token for additional security validation
- **`CF_ACCESS_TEAM_DOMAIN`** - Your Cloudflare team domain (e.g., `yourcompany.cloudflareaccess.com`)

### Setting Secrets

```bash
# Required
npx wrangler secret put MERAKI_API_KEY

# Optional (for enhanced security)
npx wrangler secret put CF_ACCESS_AUD
```

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
- **`GET /health`** - Health check endpoint with authentication status
- **`OPTIONS /*`** - CORS preflight handler

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-08-18T12:00:00.000Z",
  "service": "meraki-mcp-server",
  "hasApiKey": true,
  "authEnabled": true,
  "cfAccessAudEnabled": true,
  "cfAccessTeamDomainEnabled": true,
  "version": "1.0.0",
  "tools": 18,
  "endpoints": ["/sse", "/health", "/"]
}
```

## 🛠️ Development

### 📜 Available Scripts

```bash
npm run dev          # Start local development server
npm run build        # Build TypeScript to JavaScript  
npm run deploy       # Deploy to Cloudflare Workers
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### 🧪 Local Development

```bash
# Start local server
npm run dev

# Test health endpoint
curl http://localhost:8787/health

# Test with service tokens (if configured)
curl -H "CF-Access-Client-Id: your-client-id" \
     -H "CF-Access-Client-Secret: your-client-secret" \
     http://localhost:8787/health
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

## 🔒 Security Features

### 🛡️ Zero Trust Architecture
- **Cloudflare Access**: Enterprise-grade authentication at the edge
- **Service Tokens**: Machine-to-machine authentication without user interaction
- **Custom Domain**: Professional branded endpoint with automatic SSL
- **Edge Validation**: All authentication happens at Cloudflare's edge before reaching your Worker

### 🔐 Data Protection
- **API Keys**: Stored as encrypted Cloudflare Worker secrets
- **JWT Validation**: Cloudflare Access provides signed JWT tokens
- **HTTPS Only**: All communication encrypted in transit
- **No Data Storage**: Server is stateless with no data persistence

### 🚨 Access Control
- **AUD Token**: Application-specific audience validation
- **Team Domain**: Organization-level access control
- **Rate Limiting**: Built-in DDoS protection via Cloudflare
- **Geographic Controls**: Optional geo-blocking capabilities

## 🐛 Troubleshooting

### ⚠️ Common Issues

**"MERAKI_API_KEY not configured"**
- Ensure you've set the secret: `npx wrangler secret put MERAKI_API_KEY`

**"403 Forbidden" from custom domain**  
- Check Cloudflare Access configuration
- Verify service tokens are correct
- Ensure domain is properly configured in Cloudflare

**"Server disconnected" in Claude Desktop**
- Check your Claude Desktop config file syntax
- Verify service tokens are correctly formatted
- Restart Claude Desktop after config changes

**"Unauthorized - Valid service token required"**
- Verify service tokens in Claude Desktop config
- Check that Cloudflare Access application is properly configured
- Ensure the custom domain is working

### 🔍 Debugging

Check Cloudflare Workers logs:
```bash
npx wrangler tail
```

View Claude Desktop MCP logs:
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-meraki.log

# Windows
Get-Content $env:APPDATA\Claude\logs\mcp-server-meraki.log -Wait
```

Test authentication manually:
```bash
curl -H "CF-Access-Client-Id: your-client-id" \
     -H "CF-Access-Client-Secret: your-client-secret" \
     https://meraki-mcp.yourdomain.com/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-tool`
3. Make your changes and test locally
4. Commit your changes: `git commit -am 'Add new tool'`
5. Push to the branch: `git push origin feature/new-tool`
6. Submit a pull request

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 📊 Code Statistics

### Project Metrics
```
📁 Total Files: 20
📄 Source Files: 4 TypeScript files
🛠️ Available Tools: 18 Meraki API methods
🔧 API Service Methods: 20+ methods
📦 Dependencies: 3 main packages (@modelcontextprotocol/sdk, agents, zod)
⚡ Build Output: ~523 KiB (83 KiB gzipped)
```

### File Breakdown
```
src/
├── index.ts              # 575 lines - Main MCP server & HTTP handlers
├── services/
│   └── merakiapi.ts      # 190 lines - Meraki API service layer  
├── types/
│   └── meraki.ts         # 308 lines - Type definitions for Meraki objects
└── errors.ts             # 19 lines - Custom error classes
```

### API Coverage
- **Organizations**: 2 methods (list, get details)
- **Networks**: 4 methods (list, details, traffic, events)  
- **Devices**: 4 methods (list, details, status, management)
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
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/)
- [Claude Desktop MCP Setup](https://modelcontextprotocol.io/quickstart/user)

## 💬 Support

For issues and questions:
- Create an issue in this repository
- Check the [MCP documentation](https://modelcontextprotocol.io/docs/tools/debugging)
- Review Cloudflare Workers [error handling](https://developers.cloudflare.com/workers/observability/errors/)
- Consult [Cloudflare Access troubleshooting](https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/#troubleshooting)

---
*Last updated: August 2025*