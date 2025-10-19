# 🌐 Cisco Meraki MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Compatible-blue?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Cisco Meraki](https://img.shields.io/badge/Cisco-Meraki-1BA0D7?style=for-the-badge&logo=cisco&logoColor=white)](https://meraki.cisco.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
[![Security](https://img.shields.io/github/actions/workflow/status/macharpe/meraki-mcp-cloudflare/semgrep.yml?branch=main&label=Security%20Scan&style=for-the-badge&logo=semgrep)](https://github.com/macharpe/meraki-mcp-cloudflare/actions/workflows/semgrep.yml)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/macharpe/meraki-mcp-cloudflare)

A production-ready, optimized Model Context Protocol (MCP) server that provides AI assistants with comprehensive access to Cisco Meraki network management capabilities. Built on Cloudflare Workers with Durable Objects, OAuth 2.1 authentication with PKCE, KV caching, and full OAuth discovery support.

> **Prerequisites**: Requires a Cloudflare account and domain for custom domain setup and OAuth authentication.

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

### 🎯 Key Benefits

- 🚀 **Enterprise-Ready**: Production deployment on Cloudflare Workers with Durable Objects
- 🔒 **OAuth 2.1 + PKCE**: Advanced security with Cloudflare Access for SaaS integration
- 🔍 **OAuth Discovery**: Full RFC-compliant discovery endpoints for automated client configuration
- 🌐 **Custom Domain**: Professional branded domain with SSL (`meraki-mcp.macharpe.com`)
- 📱 **Real-time**: Live access to your Meraki dashboard data via REST API
- 💰 **Cost-effective**: Serverless architecture with pay-per-use pricing
- ⚡ **High Performance**: Global edge deployment with sub-100ms response times
- 🛡️ **MCP Portal Compatible**: Works seamlessly with Cloudflare MCP Portals

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │    │  Durable Object  │    │  Meraki API     │
│   (Claude)      │◄──►│  MCP Agent       │◄──►│  Dashboard      │
│                 │    │  + OAuth Handler │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
    OAuth 2.0 Flow       Cloudflare Workers     HTTPS/REST API
         ▲                      ▲
         └──────────────────────┘
           Cloudflare Access
           (Identity Provider)
```

## ⚡ Performance & Caching

The server implements intelligent KV caching to optimize performance and reduce API calls to Meraki Dashboard:

### 🗄️ Cache Implementation

- **Organization Lists**: Cached for 30 minutes - organizations rarely change
- **Network Lists**: Cached for 15 minutes - moderate update frequency
- **Client Lists**: Cached for 5 minutes - clients connect/disconnect frequently
- **JWKS Keys**: Cached for 1 hour - JWT verification keys are stable
- **Graceful Fallback**: All methods work without cache if KV unavailable

### 📊 Cache Benefits

- **🚀 Faster Response Times**: Cached data returns in milliseconds vs. API roundtrip
- **💰 Cost Optimization**: Reduced Meraki API calls and Cloudflare Worker execution time
- **🔧 Rate Limit Protection**: Prevents hitting Meraki's 5 requests/second limit
- **🌐 Global Performance**: Edge caching across Cloudflare's global network

### 🎛️ Cache Configuration

Cache TTL values are configurable through environment variables:

```bash
# Optional - Cache time-to-live settings (in seconds)
npx wrangler secret put CACHE_TTL_ORGANIZATIONS  # Default: 1800 (30 min)
npx wrangler secret put CACHE_TTL_NETWORKS       # Default: 900 (15 min)
npx wrangler secret put CACHE_TTL_JWKS          # Default: 3600 (1 hour)
```

**Cache Storage**: Uses Cloudflare KV with automatic expiration and global replication.

## 🔐 Authentication

The server uses **Meraki API key authentication** for simplicity and universal compatibility with all MCP clients.

> 📋 **Detailed Flow**: See [`docs/authentication-flow.md`](docs/authentication-flow.md) for the complete authentication architecture diagram.

### 🔑 API Key Authentication

- **MCP Endpoints**: Publicly accessible (no OAuth required)
- **Meraki API Authentication**: Uses `MERAKI_API_KEY` Worker secret
- **Universal Compatibility**: Works with all MCP clients (Claude Desktop, Cloudflare AI Playground, custom clients)
- **Simple Setup**: Just add the MCP server URL - no OAuth configuration needed

**Current Architecture:**
```
MCP Client → Worker (public /mcp endpoint) → Meraki API (with API key)
```

### 🔍 Optional OAuth Infrastructure (Not Active)

The codebase includes OAuth 2.1 + PKCE infrastructure for **future enterprise use** if per-user authentication is needed:

| Endpoint | Status | Purpose |
|----------|--------|---------|
| `/.well-known/oauth-authorization-server` | Available | OAuth metadata discovery (RFC 8414) |
| `/.well-known/jwks.json` | Available | JSON Web Key Set (RFC 7517) |
| `/register` | Available | Dynamic client registration (RFC 7591) |
| `/authorize` | Available | OAuth authorization endpoint |
| `/token` | Available | Token exchange endpoint |

> ⚠️ **Note**: These OAuth endpoints exist in the code but are **not protecting MCP endpoints**. They can be activated in the future for enterprise SSO if needed.

### 🛡️ Security Features

- **Meraki API Key**: Secure Worker secret storage
- **Edge Security**: Cloudflare's global network protection
- **Rate Limiting**: KV caching prevents API abuse
- **HTTPS Only**: All traffic encrypted in transit
- **Custom Domain**: No public workers.dev URLs (security best practice)

### 📁 Project Structure

```text
meraki-mcp-cloudflare/
├── src/
│   ├── index.ts              # Main Durable Object MCP Agent
│   ├── access-handler.ts     # OAuth authentication handler
│   ├── oauth-helpers.ts      # OAuth utility functions
│   ├── workers-oauth-utils.ts# Workers OAuth utilities
│   ├── services/
│   │   ├── merakiapi.ts      # Meraki API service layer
│   │   └── cache.ts          # KV caching service
│   ├── types/
│   │   ├── env.ts            # Environment type definitions
│   │   └── meraki.ts         # Meraki API type definitions
│   └── tests/
│       └── index.test.ts     # Test files
├── docs/
│   └── authentication-flow.md# OAuth flow documentation
├── scripts/
│   └── pre-deploy.sh         # Pre-deployment checks
├── wrangler.jsonc            # Cloudflare Workers configuration
├── package.json              # Dependencies and scripts
├── CLAUDE.md                 # Claude Code instructions
└── README.md                 # This file
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

### 6. Set Required Secrets

Set your API key and OAuth configuration as secrets:

```bash
# Required - Meraki API key
npx wrangler secret put MERAKI_API_KEY

# Required - OAuth configuration secrets
npx wrangler secret put ACCESS_CLIENT_ID
npx wrangler secret put ACCESS_CLIENT_SECRET
npx wrangler secret put ACCESS_TOKEN_URL
npx wrangler secret put ACCESS_AUTHORIZATION_URL
npx wrangler secret put ACCESS_JWKS_URL
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

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

## ⚙️ Claude Desktop Configuration

### 💻 Setup Instructions

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
        "https://meraki-mcp.yourdomain.com"
      ]
    }
  }
}
```

3. **Replace with your actual values**:
   - `yourdomain.com` → Your actual domain configured in Cloudflare

4. **Restart Claude Desktop** completely (quit and relaunch)

### ✅ Verify Configuration

Check that the server is properly connected:

1. Open Claude Desktop
2. Start a new conversation
3. Try: "List my Meraki organizations"

The server should respond immediately with your Meraki organization data.

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
- **`CACHE_TTL_JWKS`** - Cache TTL for JWKS keys in seconds (default: 3600 / 1 hour)

### OAuth Configuration (Optional - Not Active)

These environment variables are for future OAuth functionality if needed:

- **`ACCESS_CLIENT_ID`** - OAuth client ID from Cloudflare Access (not currently used)
- **`ACCESS_CLIENT_SECRET`** - OAuth client secret from Cloudflare Access (not currently used)
- **`ACCESS_TOKEN_URL`** - OAuth token endpoint URL (not currently used)
- **`ACCESS_AUTHORIZATION_URL`** - OAuth authorization endpoint URL (not currently used)
- **`ACCESS_JWKS_URL`** - JWKS endpoint for token verification (not currently used)
- **`COOKIE_ENCRYPTION_KEY`** - Key for encrypting session cookies (not currently used)

### Setting Secrets

```bash
# Required - Meraki API authentication
npx wrangler secret put MERAKI_API_KEY

# Optional - Only if activating OAuth in the future
# npx wrangler secret put ACCESS_CLIENT_ID
# npx wrangler secret put ACCESS_CLIENT_SECRET
# npx wrangler secret put ACCESS_TOKEN_URL
# npx wrangler secret put ACCESS_AUTHORIZATION_URL
# npx wrangler secret put ACCESS_JWKS_URL
# npx wrangler secret put COOKIE_ENCRYPTION_KEY
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
  "oauthEnabled": true,
  "version": "1.0.0",
  "endpoints": [
    "/mcp",
    "/sse",
    "/health",
    "/authorize",
    "/callback",
    "/token",
    "/register",
    "/.well-known/oauth-authorization-server",
    "/.well-known/jwks.json"
  ]
}
```

### 🔍 OAuth Discovery Testing

Test OAuth metadata discovery:

```bash
curl https://meraki-mcp.macharpe.com/.well-known/oauth-authorization-server
```

**Expected Response:**
```json
{
  "issuer": "https://meraki-mcp.macharpe.com",
  "authorization_endpoint": "https://meraki-mcp.macharpe.com/authorize",
  "token_endpoint": "https://meraki-mcp.macharpe.com/token",
  "jwks_uri": "https://meraki-mcp.macharpe.com/.well-known/jwks.json",
  "registration_endpoint": "https://meraki-mcp.macharpe.com/register",
  "scopes_supported": ["meraki:read", "meraki:write"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "mcp_server_info": {
    "name": "Cisco Meraki MCP Server",
    "version": "1.0.0",
    "tools_count": 27
  }
}
```

### 🔑 Dynamic Client Registration

Register a new OAuth client:

```bash
curl -X POST https://meraki-mcp.macharpe.com/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My MCP Client",
    "redirect_uris": ["https://my-app.com/callback"],
    "scope": "meraki:read"
  }'
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

1. **OAuth Authentication Failures**
   - Verify Cloudflare Access configuration
   - Check redirect URI matches exactly
   - Ensure domain is properly configured in Cloudflare

2. **KV Namespace Errors**
   - Verify KV namespace ID in `wrangler.jsonc`
   - Check KV namespace exists in Cloudflare dashboard

3. **Meraki API Errors**
   - Verify API key is valid and not expired
   - Check API key has proper organization access
   - Ensure rate limits aren't exceeded (5 req/sec)

4. **CORS Issues**
   - Server includes proper CORS headers for web clients
   - Check browser console for specific CORS errors

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
