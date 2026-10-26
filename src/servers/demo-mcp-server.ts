import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const tickets = {
  "T-1001": {
    ticketId: "T-1001",
    status: "open",
    subject: "Refund request",
    summary: "Customer asks about the refund timeline.",
  },
  "T-1002": {
    ticketId: "T-1002",
    status: "pending",
    subject: "Delivery delay",
    summary: "Carrier tracking has not updated for two days.",
  },
} as const;

function createServer(): McpServer {
  const server = new McpServer({ name: "demo-ticket-server", version: "1.0.0" });

  server.registerTool(
    "lookup_ticket",
    {
      description: "Read a support ticket by ticket ID.",
      inputSchema: z.object({
        ticketId: z.string().regex(/^T-[0-9]+$/),
      }),
    },
    async ({ ticketId }) => {
      const ticket = tickets[ticketId as keyof typeof tickets];
      if (!ticket) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Ticket not found" }) }],
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(ticket) }],
      };
    },
  );

  // Deliberately registered on the MCP server but NOT wrapped into the Agent allowlist.
  // This demonstrates that discovery does not imply model access.
  server.registerTool(
    "close_ticket",
    {
      description: "Close a support ticket. This tool is intentionally not allowlisted by the Agent.",
      inputSchema: z.object({ ticketId: z.string().regex(/^T-[0-9]+$/) }),
    },
    async ({ ticketId }) => ({
      content: [{ type: "text" as const, text: JSON.stringify({ error: "Demo only: close operation disabled" }) }],
      isError: true,
    }),
  );

  return server;
}

// MCP stdio uses stdout for protocol messages. Do not use console.log() here.
void serveStdio(createServer);
console.error("[demo-mcp-server] ready on stdio");
