# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-10-20

### Changed
- **Documentation Accuracy**: Updated authentication flow documentation to reflect API key implementation instead of OAuth
- **README Simplification**: Removed 128 lines of misleading OAuth setup instructions
- **Prerequisites Update**: Removed requirement for domain in Cloudflare (only needed for OAuth)
- **Environment Variables**: Simplified to require only `MERAKI_API_KEY` for basic operation

### Fixed
- **Documentation**: Fixed misleading information about OAuth protecting MCP endpoints

## [1.1.0] - 2025-08-31

### Added
- **Full Pagination Support**: Automatic pagination for client lists and large datasets
- **Enhanced Caching**: Intelligent KV caching for organization/network lists, clients, and JWKS keys

### Changed
- **CORS Compatibility**: Added `mcp-protocol-version` header to all CORS configurations
- **Response Headers**: Updated all MCP response headers for browser-based client compatibility

### Fixed
- **MCP Tool Implementations**: Completed implementations for all 27 Meraki tools
- **CORS Issues**: Resolved cross-origin resource sharing errors with Cloudflare AI Playground
- **Missing Data**: Fixed pagination issues causing incomplete client lists

## [1.0.0] - 2025-08-29

### Added
- **OAuth 2.1 + PKCE Infrastructure**: Complete Cloudflare Access for SaaS integration
- **Durable Objects Agent**: Stateful MCP server implementation with SQLite storage
- **27 Meraki MCP Tools**: Comprehensive coverage of Meraki Dashboard API
- **KV Caching Layer**: Performance optimization with configurable TTL
- **Custom Domain Support**: Production deployment at meraki-mcp.macharpe.com
- **SSE Transport**: Server-Sent Events support for MCP communication

### Changed
- **Architecture**: Migrated to Durable Objects for stateful agent implementation
- **Authentication**: OAuth discovery endpoints available (not protecting MCP endpoints)
- **Documentation**: Comprehensive OAuth setup section in README

### Security
- **Cloudflare Access**: Enterprise SSO integration infrastructure
- **JWT Verification**: JWKS endpoint for token verification
- **PKCE Support**: Proof Key for Code Exchange implementation

## [0.9.0] - 2025-08-18

### Added
- **Cloudflare Access Integration**: Zero Trust authentication infrastructure
- **OAuth Helpers**: Custom OAuth 2.1 implementation replacing external dependencies
- **Dynamic Client Registration**: RFC 7591 compliant client registration endpoint

### Security
- **Access Policies**: Cloudflare Access for SaaS application protection
- **JWKS Caching**: Secure token verification with cached public keys

## [0.8.0] - 2025-08-06

### Added
- **Semgrep Security Scanning**: Automated security analysis workflow
- **Security Badge**: Semgrep scan status badge in README

### Changed
- **Code Quality**: Comprehensive codebase optimization and modernization
- **Dependencies**: Updated to latest stable versions
- **Documentation**: Refreshed code statistics and tool descriptions

### Fixed
- **Linting Issues**: Resolved all Biome linter warnings
- **Tools Count**: Corrected tools count from 15 to 27 in README

## [0.7.0] - 2025-08-04

### Added
- **Deploy to Cloudflare Button**: One-click deployment with proper repository URL
- **Workers Types**: Added @cloudflare/workers-types dependency

### Changed
- **Dependency Updates**: Updated all dependencies to latest versions
- **Package Lock**: Synchronized package-lock.json with package.json

### Fixed
- **Missing Dependency**: Added @cloudflare/workers-types for TypeScript support

## [0.6.0] - 2025-07-24

### Added
- **Optional Authentication**: Bearer token support for secured endpoints
- **Environment Variables**: Configurable authentication settings

### Fixed
- **Configuration Examples**: Removed shell artifact from .env.example
- **Placeholder Values**: Clean .env.example with secure placeholder API key

## [0.5.0] - 2025-07-18

### Added
- **12 Additional MCP Tools**: Expanded from 15 to 27 total Meraki API tools
  - Switch port operations
  - Wireless management (RF profiles, channel utilization, signal quality)
  - Appliance security and traffic shaping

### Changed
- **Refactoring Cleanup**: Code organization and structure improvements
- **License**: Changed from MIT to GPL v3

### Fixed
- **Code Quality**: Resolved refactoring issues and improved maintainability

## [0.4.0] - 2025-07-12

### Added
- **Initial Release**: Cisco Meraki MCP Server on Cloudflare Workers
- **15 Core MCP Tools**: Organization, network, device, and client management
- **Meraki API Integration**: Direct integration with Cisco Meraki Dashboard API v1
- **Environment Configuration**: .env.example with secure placeholder values

### Changed
- **Project Naming**: Harmonized naming to meraki-mcp-cloudflare
- **Deployment Pipeline**: Cloudflare Pages deployment testing

### Security
- **API Key Protection**: Removed real API key from version control
- **Secure Configuration**: Clean .env.example with placeholder values

[Unreleased]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/macharpe/meraki-mcp-cloudflare/releases/tag/v0.4.0
