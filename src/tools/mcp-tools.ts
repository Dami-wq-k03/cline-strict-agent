import { createTool } from "@cline/shared";
import type { Client } from "@modelcontextprotocol/client";
import { z } from "zod";

/**
 * Explicit MCP allowlist.
 * Do NOT convert every result of client.listTools() into an Agent tool.
 * Add a wrapper here only after reviewing and approving that MCP operation.
 */
const allowedMcpTools = {
  lookup_ticket: {
    exposedName: "mcp_lookup_ticket",
    description: "Read a support ticket by ID, for example T-1001. Read-only operation.",
    schema: z.object({
      ticketId: z.string().regex(/^T-[0-9]+$/, "Expected a ticket ID like T-1001"),
    }),
  },
} as const;

export async function createAllowedMcpTools(client: Client) {
  const { tools: discoveredTools } = await client.listTools();
  const discoveredNames = new Set(discoveredTools.map((tool) => tool.name));

  for (const mcpName of Object.keys(allowedMcpTools)) {
    if (!discoveredNames.has(mcpName)) {
      throw new Error(`Required allowlisted MCP tool is missing: ${mcpName}`);
    }
  }

  // Only this explicitly wrapped tool is exposed to the model.
  // Other tools on the MCP server (e.g. close_ticket) remain unavailable to Agent.
  const lookupTicket = createTool({
    name: allowedMcpTools.lookup_ticket.exposedName,
    description: allowedMcpTools.lookup_ticket.description,
    inputSchema: allowedMcpTools.lookup_ticket.schema,
    async execute(input) {
      const result = await client.callTool({
        name: "lookup_ticket",
        arguments: { ticketId: input.ticketId },
      });

      const text = result.content
        .map((block) => (block.type === "text" ? block.text : `[${block.type} result]`))
        .join("\n");

      if (result.isError) {
        return { ok: false, error: text || "MCP tool reported an error" };
      }

      return { ok: true, result: text };
    },
  });

  return [lookupTicket];
}
