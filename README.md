# 🌐 Cisco Meraki MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Compatible-blue?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Cisco Meraki](https://img.shields.io/badge/Cisco-Meraki-1BA0D7?style=for-the-badge&logo=cisco&logoColor=white)](https://meraki.cisco.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
[![Security](https://img.shields.io/github/actions/workflow/status/macharpe/meraki-mcp-cloudflare/semgrep.yml?branch=main&label=Security%20Scan&style=for-the-badge&logo=semgrep)](https://github.com/macharpe/meraki-mcp-cloudflare/actions/workflows/semgrep.yml)

> **📌 Branch:** This is the **OAuth 2.1 version** with enterprise authentication. For the simpler API-key-only version, see the [`no-oauth`](https://github.com/macharpe/meraki-mcp-cloudflare/tree/no-oauth) branch. [Learn more about branches →](BRANCHES.md)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/macharpe/meraki-mcp-cloudflare)

A production-ready, optimized Model Context Protocol (MCP) server that provides AI assistants with comprehensive access to Cisco Meraki network management capabilities. Built on Cloudflare Workers with Durable Objects and intelligent KV caching for optimal performance.

> **Prerequisites**: Requires a Cloudflare account and a Cisco Meraki API key.

> **Inspiration**: This implementation was inspired by [Censini/mcp-server-meraki](https://github.com/Censini/mcp-server-meraki) and [mkutka/meraki-magic-mcp](https://github.com/mkutka/meraki-magic-mcp) - credits to both original works for API method ideas and implementation approaches.

## ✨ Features

### 🛠️ Available Tools

The server provides **27 comprehensive Meraki management tools** organized across multiple categories:

#### 🏢 Organization & Network Management (6 tools)

- **`get_organizations`** - List all organizations in your Meraki account
- **`get_organization`** - Get detailed information about a specific organization
- **`get_networks`** - List all networks within an organization
- **`get_network`** - Get detailed information about a specific network
- **`get_network_traffic`** - Get network traffic statistics
- **`get_network_events`** - Get recent network events

#### 📱 Device Management (5 tools)

- **`get_devices`** - List all devices within a network
- **`get_device`** - Get detailed information about a specific device
- **`get_device_statuses`** - Get device statuses for an organization
- **`get_clients`** - Get clients connected to a network
- **`get_management_interface`** - Get management interface settings for a device

#### 🔗 Switch Management (4 tools)

- **`get_switch_ports`** - Get switch ports for a device
- **`get_switch_port_statuses`** - Get switch port statuses for a device
- **`get_switch_routing_interfaces`** - Get routing interfaces for a switch
- **`get_switch_static_routes`** - Get static routes for a switch

#### 📡 Wireless Management (8 tools)

- **`get_wireless_radio_settings`** - Get wireless radio settings for an access point
- **`get_wireless_status`** - Get wireless status of an access point
- **`get_wireless_latency_stats`** - Get wireless latency statistics for an access point
- **`get_wireless_rf_profiles`** - Get RF profiles for a network
- **`get_wireless_channel_utilization`** - Get channel utilization for wireless
- **`get_wireless_signal_quality`** - Get signal quality metrics
- **`get_wireless_connection_stats`** - Get connection statistics
- **`get_wireless_client_connectivity_events`** - Get client connectivity events

#### 🛡️ Appliance Management (4 tools)

- **`get_appliance_vpn_site_to_site`** - Get site-to-site VPN settings
- **`get_appliance_content_filtering`** - Get content filtering settings
- **`get_appliance_security_events`** - Get security events
- **`get_appliance_traffic_shaping`** - Get traffic shaping settings

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   MCP Client    │         │  Durable Object  │         │  Meraki API     │
│   (Claude)      │◄───────►│  MCP Agent       │◄───────►│  Dashboard      │
│                 │         │  (Stateful)      │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
   HTTP/SSE                   Cloudflare Workers          HTTPS/REST API
   JSON-RPC 2.0               + KV Cache Layer            + API Key Auth
```

**Components:**
- **MCP Client**: Any MCP-compatible client (Claude Desktop, Claude Code, Claude.ai, AI Playground)
- **Durable Object MCP Agent**: Stateful server handling MCP protocol and tool execution
- **KV Cache Layer**: Intelligent caching for organizations, networks, and client data
- **Meraki API**: Cisco Meraki Dashboard API v1 with API key authentication

## ⚡ Performance & Caching

The server implements intelligent KV caching to optimize performance and reduce API calls to Meraki Dashboard:

### 🗄️ Cache Implementation

- **Organization Lists**: Cached for 30 minutes - organizations rarely change
- **Network Lists**: Cached for 15 minutes - moderate update frequency
- **Client Lists**: Cached for 5 minutes - clients connect/disconnect frequently
- **Graceful Fallback**: All methods work without cache if KV unavailable

### 🎛️ Cache Configuration

Cache TTL values are configurable through environment variables:

```bash
# Optional - Cache time-to-live settings (in seconds)
npx wrangler secret put CACHE_TTL_ORGANIZATIONS  # Default: 1800 (30 min)
npx wrangler secret put CACHE_TTL_NETWORKS       # Default: 900 (15 min)
```

**Cache Storage**: Uses Cloudflare KV with automatic expiration and global replication.

## 🔐 Authentication

The server uses **simple Meraki API key authentication** - no OAuth configuration required.

### 🔑 How It Works

1. **MCP Endpoints**: Publicly accessible at `/mcp` and `/sse` (no authentication required)
2. **Meraki API Authentication**: Server uses `MERAKI_API_KEY` Worker secret to authenticate with Meraki Dashboard
3. **Client Setup**: Simply add the MCP server URL to your client - no tokens, no OAuth flow

**Architecture:**
```
MCP Client → /mcp endpoint (public) → Meraki API (authenticated with API key)
```

### 🛡️ Security Features

- **API Key Protection**: Meraki API key stored as encrypted Cloudflare Worker secret (never exposed to clients)
- **Edge Security**: Cloudflare's global network provides DDoS protection and WAF
- **Rate Limiting**: KV caching reduces API calls and prevents abuse
- **HTTPS Only**: All traffic encrypted in transit with TLS 1.3
- **No Credentials in Client**: MCP clients don't need any authentication - server handles all Meraki API calls

### 📁 Project Structure

```text
meraki-mcp-cloudflare/
├── src/
│   ├── index.ts              # Main Durable Object MCP Agent & request handler
│   ├── services/
│   │   ├── merakiapi.ts      # Meraki API service layer
│   │   └── cache.ts          # KV caching service
│   ├── types/
│   │   ├── env.ts            # Environment type definitions
│   │   └── meraki.ts         # Meraki API type definitions
│   └── tests/
│       └── index.test.ts     # Test files
├── docs/
│   └── README.md             # Documentation
├── scripts/
│   └── pre-deploy.sh         # Pre-deployment checks
├── wrangler.jsonc            # Cloudflare Workers configuration
├── package.json              # Dependencies and scripts
└── README.md                 # Main README
```

## 📋 Prerequisites

Before deploying the server, ensure you have:

1. **🌐 Cloudflare Account**: Free account at [cloudflare.com](https://cloudflare.com)
2. **🔑 Cisco Meraki Account**: With API access enabled
3. **🎫 Meraki API Key**: Generated from your Meraki Dashboard
4. **💻 Node.js**: Version 18 or higher
5. **📦 Git**: For cloning the repository

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

### 4. Configure Custom Domain

Update `wrangler.jsonc` with your domain:

```jsonc
{
  "name": "meraki-mcp-cloudflare",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-07",
  "migrations": [
    {
      "new_sqlite_classes": ["MerakiMCPAgent"],
      "tag": "v1"
    }
  ],
  "compatibility_flags": ["nodejs_compat"],

  // Environment variables
  "vars": {
    "MERAKI_BASE_URL": "https://api.meraki.com/api/v1",
    "CACHE_TTL_ORGANIZATIONS": "1800",
    "CACHE_TTL_NETWORKS": "900",
    "CACHE_TTL_JWKS": "3600"
  },

  // Durable Object binding for MCP Agent
  "durable_objects": {
    "bindings": [
      {
        "class_name": "MerakiMCPAgent",
        "name": "MCP_OBJECT"
      }
    ]
  },

  // KV namespaces for OAuth storage and API response caching
  "kv_namespaces": [
    {
      "binding": "OAUTH_KV",
      "id": "78b0115cefe644b8915345c3b0e487e3"
    },
    {
      "binding": "CACHE_KV",
      "id": "df5d8edf054747b2a3e957dd7b1ec355"
    }
  ],

  // Custom domain routing
  "routes": [
    {
      "pattern": "meraki-mcp.yourdomain.com",
      "custom_domain": true
    }
  ],

  // Security: Disable public endpoints
  "workers_dev": false,
  "preview_urls": false,

  // Build configuration
  "build": {
    "command": "npm run build"
  },

  // Monitoring
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

### 5. Create KV Namespaces

Create KV namespaces for OAuth session storage and API response caching:

```bash
# Create OAuth session storage namespace
npx wrangler kv:namespace create "OAUTH_KV"

# Create cache storage namespace
npx wrangler kv:namespace create "CACHE_KV"
```

Update both namespace IDs in `wrangler.jsonc` with the returned IDs.

### 6. Set Required Secret

Set your Meraki API key as a Worker secret:

```bash
# Required - Meraki API key
npx wrangler secret put MERAKI_API_KEY
```

When prompted, paste your Meraki API key.

### 7. Deploy to Cloudflare Workers

First, authenticate with Cloudflare:

```bash
npx wrangler login
```

Deploy the server:

```bash
npx wrangler deploy
```

Your server will be available at: `https://meraki-mcp.yourdomain.com`

## ⚙️ Claude Configuration

### 💻 Claude Desktop

1. **Locate your Claude Desktop config file**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add the Meraki MCP server configuration**:

```json
{
  "mcpServers": {
    "meraki-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://meraki-mcp.yourdomain.com/mcp"
      ]
    }
  }
}
```

3. **Replace `yourdomain.com`** with your actual domain configured in Cloudflare

4. **Restart Claude Desktop** completely (quit and relaunch)

5. **Test**: Try "List my Meraki organizations" in a new conversation

### 🖥️ Claude Code (CLI)

Add the server using the CLI:

```bash
claude mcp add --transport http meraki-mcp https://meraki-mcp.yourdomain.com/mcp
```

Or manually add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "meraki-mcp": {
      "url": "https://meraki-mcp.yourdomain.com/mcp",
      "transport": "http"
    }
  }
}
```

### 🌐 Claude.ai (Web)

1. Go to [Claude.ai](https://claude.ai)
2. Click the MCP servers icon (puzzle piece)
3. Click "Add Server"
4. Enter your server URL: `https://meraki-mcp.yourdomain.com/mcp`
5. Click "Add" - no authentication needed
6. Start using Meraki tools in your conversations

## 🌍 Environment Variables

The server uses these environment variables:

### Required

- **`MERAKI_API_KEY`** - Your Cisco Meraki API key (stored as Worker secret)

### Optional

- **`MERAKI_BASE_URL`** - Base URL for Meraki API (defaults to `https://api.meraki.com/api/v1`)

### Cache Configuration (Optional)

Configure cache TTL values to optimize performance:

- **`CACHE_TTL_ORGANIZATIONS`** - Cache TTL for organization lists in seconds (default: 1800 / 30 minutes)
- **`CACHE_TTL_NETWORKS`** - Cache TTL for network lists in seconds (default: 900 / 15 minutes)

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
"Get wireless status for access point ABC123"
```

```
"Show me RF profiles for the guest network"
```

### 🔗 Switch Management

```
"Get switch port status for device XYZ789"
```

```
"Show routing interfaces for the core switch"
```

## 🧪 Testing & API Endpoints

### 🏥 Health Check

Test basic connectivity:

```bash
curl https://meraki-mcp.macharpe.com/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "service": "Cisco Meraki MCP Server",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "version": "1.0.0"
}
```

### 📡 MCP Protocol Testing

Test MCP discovery (without authentication):

```bash
curl https://meraki-mcp.macharpe.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }'
```

### 🛠️ Development Commands

**Local Development:**
```bash
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm run lint         # Run code linting
npm run lint:fix     # Auto-fix linting issues
npm run typecheck    # Type checking only
npm run pre-deploy   # Complete pre-deployment checks
```

**Deployment:**
```bash
npm run deploy       # Deploy to Cloudflare Workers
npm run types        # Generate Cloudflare types
```


### 🔧 Troubleshooting

**Common Issues:**

1. **MCP Server Not Connecting**
   - Verify your server URL is correct (https://your-domain.com/mcp)
   - Check that Worker is deployed and running (test `/health` endpoint)
   - Restart your MCP client after configuration changes

2. **Meraki API Errors**
   - Verify MERAKI_API_KEY secret is set correctly
   - Confirm API key is valid and not expired
   - Check API key has proper organization access
   - Ensure rate limits aren't exceeded (5 req/sec - caching helps)

3. **KV Namespace Errors**
   - Verify KV namespace ID in `wrangler.jsonc`
   - Check KV namespace exists in Cloudflare dashboard
   - Server works without KV but caching will be disabled

4. **No Data Returned**
   - Verify your Meraki account has organizations configured
   - Check network/device IDs are correct
   - Review Worker logs for API error details

**Debug Mode:**
Enable detailed logging by checking Worker logs in Cloudflare dashboard or using:

```bash
npx wrangler tail --format json
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cloudflare Workers**: For providing an excellent serverless platform
- **Model Context Protocol**: For creating the MCP specification
- **Cisco Meraki**: For their comprehensive API
- **[Censini/mcp-server-meraki](https://github.com/Censini/mcp-server-meraki)**: Original inspiration for this implementation
- **[mkutka/meraki-magic-mcp](https://github.com/mkutka/meraki-magic-mcp)**: Additional inspiration for API methods and implementation approaches

---

**Built with ❤️ using Cloudflare Workers and the Model Context Protocol**
