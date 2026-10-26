# Cline strict tool allowlist demo

This project uses Cline's lightweight `Agent` runtime, not `ClineCore`. The agent receives exactly three tools:

- `calculate_discount`: an in-process function.
- `http_get_order`: a fixed HTTP GET operation against the configured API base URL.
- `mcp_lookup_ticket`: a wrapper around one explicitly allowlisted MCP tool.

The demo MCP server also registers `close_ticket`, but the Agent never receives a wrapper for it. This is intentional: discovering an MCP tool does not automatically expose it to the model.

## Requirements

- Node.js 22+
- An Anthropic API key (or adapt `providerId`, `modelId`, and credentials for another provider supported by Cline)

## Run the self-contained demo

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
npm install
npm run typecheck
npm run dev
```

You can pass a custom prompt:

```bash
npm run dev -- "查询工单 T-1001 和订单 O-2001"
```

By default, the app starts a mock HTTP API on `127.0.0.1:8787` and launches the demo MCP server as a child process over stdio. The model should call all three tools for the default prompt.

## Connect your own HTTP API

Set `START_MOCK_API=false` and `INTERNAL_API_BASE_URL` to your trusted API base URL. The example tool only supports `GET /orders/{orderId}` and validates order IDs using `O-<digits>`. It does not accept arbitrary URLs, methods, or headers from the model. Add your own authentication in `src/tools/http-tools.ts` as required.

## Connect your own MCP server

### Remote Streamable HTTP MCP server

Set `MCP_SERVER_URL`, for example:

```dotenv
MCP_SERVER_URL=https://mcp.example.com/mcp
```

The server must provide `lookup_ticket` with a `ticketId` string argument, or you must adapt the explicit wrapper in `src/tools/mcp-tools.ts` to your approved tool's name and schema.

### Local stdio MCP server

Set `MCP_SERVER_COMMAND` and optionally `MCP_SERVER_ARGS_JSON`:

```dotenv
MCP_SERVER_COMMAND=/absolute/path/to/your-mcp-server
MCP_SERVER_ARGS_JSON=["--mode","stdio"]
```

These are trusted administrator configuration values. Never derive a process command, arguments, or MCP endpoint from model-generated input.

## Adding an approved MCP tool

1. Review the server-side tool's behavior and input schema.
2. Add a wrapper in `src/tools/mcp-tools.ts` with a fixed exposed name, schema validation, and a fixed underlying MCP tool name.
3. Add the wrapper's name to the expected allowlist in `src/index.ts`.
4. Add authorization and audit logging in the MCP server itself for any sensitive action.

Do not replace the explicit wrappers with a loop that registers every tool returned by `client.listTools()`.

## Strictness and security limits

- The model sees only the tools passed to `new Agent({ tools })`; this code does not use `ClineCore` and does not register Cline's filesystem, shell, editor, or web tools.
- The exact exposed tool names are checked at startup. A mismatch aborts startup.
- MCP discovery is used to verify required tools exist, not to automatically expose them.
- HTTP tool parameters cannot select an arbitrary URL or method.
- This is an application-level tool allowlist, not an OS sandbox. The Node process still has the operating-system permissions of the account running it. For production, run it with least privilege, restrict outbound network destinations, protect credentials, validate authorization inside each backend, and audit side effects.
- The MCP server is a separate process. If it has other tools, the Agent cannot call them through this wrapper, but a compromised server or an independently accessible endpoint must be controlled separately.

## Notes

Cline's lightweight `@cline/agents` package is documented as experimental. Pin tested dependency versions in your lockfile before deploying to production.
