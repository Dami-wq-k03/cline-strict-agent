import { createTool } from "@cline/shared";
import { z } from "zod";

const orderIdSchema = z.string().regex(/^O-[0-9]+$/, "Expected an order ID like O-2001");

/**
 * HTTP tool with a fixed base URL and a constrained path parameter.
 * The model cannot supply an arbitrary URL, host, HTTP method, or headers.
 */
export const getOrder = createTool({
  name: "http_get_order",
  description:
    "Read one order from the configured internal order API. Only order IDs such as O-2001 are accepted. This tool cannot update or delete orders.",
  inputSchema: z.object({
    orderId: orderIdSchema.describe("Order ID, for example O-2001"),
  }),
  async execute(input) {
    const baseUrl = process.env.INTERNAL_API_BASE_URL ?? "http://127.0.0.1:8787";
    let url: URL;

    try {
      url = new URL(`/orders/${encodeURIComponent(input.orderId)}`, baseUrl);
    } catch {
      return { ok: false, error: "INTERNAL_API_BASE_URL is not a valid URL" };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "Only HTTP and HTTPS API URLs are allowed" };
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    const token = process.env.INTERNAL_API_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5_000),
        redirect: "error",
      });

      const body = await response.text();
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: body.slice(0, 1_000) || `HTTP ${response.status}`,
        };
      }

      try {
        return { ok: true, order: JSON.parse(body) as unknown };
      } catch {
        return { ok: false, error: "API returned invalid JSON" };
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "HTTP request failed",
      };
    }
  },
});
