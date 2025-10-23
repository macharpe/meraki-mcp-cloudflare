# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Branch Strategy**: This project maintains two branches:
> - **`main`**: OAuth 2.1 authentication with enterprise SSO
> - **`no-oauth`**: Simple API key authentication
>
> Changes are tagged with **[main]**, **[no-oauth]**, or **[both]** to indicate applicability.

## [Unreleased]

## [1.3.0] - 2025-10-23

### Added
- **[main]** OAuth 2.1 authentication middleware with JWT Bearer token verification
- **[main]** Authentication test suite with 18 comprehensive test cases
- **[main]** Complete OAuth flow documentation (docs/oauth-authentication-flow.md)
- **[both]** Two-branch strategy documentation (BRANCHES.md)
- **[both]** Branch indicators in README pointing to alternative branch

### Fixed
- **[main]** Export verifyToken function for authentication middleware compatibility

## [1.2.0] - 2025-10-20

### Changed
- **[both]** Documentation Accuracy: Updated authentication flow documentation to reflect API key implementation instead of OAuth
- **[no-oauth]** README Simplification: Removed 128 lines of misleading OAuth setup instructions
- **[no-oauth]** Prerequisites Update: Removed requirement for domain in Cloudflare (only needed for OAuth)
- **[both]** Environment Variables: Simplified to require only `MERAKI_API_KEY` for basic operation

### Fixed
- **[both]** Documentation: Fixed misleading information about OAuth protecting MCP endpoints

## [1.1.0] - 2025-08-31

### Added
- **[both]** Full Pagination Support: Automatic pagination for client lists and large datasets
- **[both]** Enhanced Caching: Intelligent KV caching for organization/network lists, clients, and JWKS keys

### Changed
- **[both]** CORS Compatibility: Added `mcp-protocol-version` header to all CORS configurations
- **[both]** Response Headers: Updated all MCP response headers for browser-based client compatibility

### Fixed
- **[both]** MCP Tool Implementations: Completed implementations for all 27 Meraki tools
- **[both]** CORS Issues: Resolved cross-origin resource sharing errors with Cloudflare AI Playground
- **[both]** Missing Data: Fixed pagination issues causing incomplete client lists

## [1.0.0] - 2025-08-29

### Added
- **[main]** OAuth 2.1 + PKCE Infrastructure: Complete Cloudflare Access for SaaS integration
- **[both]** Durable Objects Agent: Stateful MCP server implementation with SQLite storage
- **[both]** 27 Meraki MCP Tools: Comprehensive coverage of Meraki Dashboard API
- **[both]** KV Caching Layer: Performance optimization with configurable TTL
- **[both]** Custom Domain Support: Production deployment at meraki-mcp.macharpe.com
- **[both]** SSE Transport: Server-Sent Events support for MCP communication

### Changed
- **[both]** Architecture: Migrated to Durable Objects for stateful agent implementation
- **[main]** Authentication: OAuth discovery endpoints available (not protecting MCP endpoints)
- **[main]** Documentation: Comprehensive OAuth setup section in README

### Security
- **[main]** Cloudflare Access: Enterprise SSO integration infrastructure
- **[main]** JWT Verification: JWKS endpoint for token verification
- **[main]** PKCE Support: Proof Key for Code Exchange implementation

## [0.9.0] - 2025-08-18

### Added
- **[main]** Cloudflare Access Integration: Zero Trust authentication infrastructure
- **[main]** OAuth Helpers: Custom OAuth 2.1 implementation replacing external dependencies
- **[main]** Dynamic Client Registration: RFC 7591 compliant client registration endpoint

### Security
- **[main]** Access Policies: Cloudflare Access for SaaS application protection
- **[main]** JWKS Caching: Secure token verification with cached public keys

## [0.8.0] - 2025-08-06

### Added
- **[both]** Semgrep Security Scanning: Automated security analysis workflow
- **[both]** Security Badge: Semgrep scan status badge in README

### Changed
- **[both]** Code Quality: Comprehensive codebase optimization and modernization
- **[both]** Dependencies: Updated to latest stable versions
- **[both]** Documentation: Refreshed code statistics and tool descriptions

### Fixed
- **[both]** Linting Issues: Resolved all Biome linter warnings
- **[both]** Tools Count: Corrected tools count from 15 to 27 in README

## [0.7.0] - 2025-08-04

### Added
- **[both]** Deploy to Cloudflare Button: One-click deployment with proper repository URL
- **[both]** Workers Types: Added @cloudflare/workers-types dependency

### Changed
- **[both]** Dependency Updates: Updated all dependencies to latest versions
- **[both]** Package Lock: Synchronized package-lock.json with package.json

### Fixed
- **[both]** Missing Dependency: Added @cloudflare/workers-types for TypeScript support

## [0.6.0] - 2025-07-24

### Added
- **[main]** Optional Authentication: Bearer token support for secured endpoints
- **[both]** Environment Variables: Configurable authentication settings

### Fixed
- **[both]** Configuration Examples: Removed shell artifact from .env.example
- **[both]** Placeholder Values: Clean .env.example with secure placeholder API key

## [0.5.0] - 2025-07-18

### Added
- **[both]** 12 Additional MCP Tools: Expanded from 15 to 27 total Meraki API tools
  - Switch port operations
  - Wireless management (RF profiles, channel utilization, signal quality)
  - Appliance security and traffic shaping

### Changed
- **[both]** Refactoring Cleanup: Code organization and structure improvements
- **[both]** License: Changed from MIT to GPL v3

### Fixed
- **[both]** Code Quality: Resolved refactoring issues and improved maintainability

## [0.4.0] - 2025-07-12

### Added
- **[both]** Initial Release: Cisco Meraki MCP Server on Cloudflare Workers
- **[both]** 15 Core MCP Tools: Organization, network, device, and client management
- **[both]** Meraki API Integration: Direct integration with Cisco Meraki Dashboard API v1
- **[both]** Environment Configuration: .env.example with secure placeholder values

### Changed
- **[both]** Project Naming: Harmonized naming to meraki-mcp-cloudflare
- **[both]** Deployment Pipeline: Cloudflare Pages deployment testing

### Security
- **[both]** API Key Protection: Removed real API key from version control
- **[both]** Secure Configuration: Clean .env.example with placeholder values

[Unreleased]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/macharpe/meraki-mcp-cloudflare/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/macharpe/meraki-mcp-cloudflare/releases/tag/v0.4.0
