# @strav/mcp

Model Context Protocol (MCP) server for the Strav framework. Expose application capabilities to AI clients (e.g. Claude Desktop) through tools, resources, and prompts. Supports stdio (local) and HTTP (hosted) transports.

## Dependencies
- @strav/kernel (peer)
- @strav/http (peer)
- @strav/cli (peer)

## Commands
- bun test
- bun run build

## Architecture
- src/mcp_manager.ts — main manager class
- src/mcp_provider.ts — service provider registration
- src/transports/ — stdio and HTTP transport implementations
- src/commands/ — CLI commands
- src/types.ts — type definitions
- src/errors.ts — package-specific errors

## Conventions
- Tools, resources, and prompts follow the MCP specification
- Transport layer is abstracted — handler logic is transport-agnostic
