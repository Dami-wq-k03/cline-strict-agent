import { createServer, type Server } from "node:http";

const orders: Record<string, unknown> = {
  "O-2001": {
    orderId: "O-2001",
    customer: "Acme Ltd.",
    status: "paid",
    total: 120,
    currency: "USD",
  },
  "O-2002": {
    orderId: "O-2002",
    customer: "Northwind",
    status: "processing",
    total: 89.5,
    currency: "USD",
  },
};

export async function startMockHttpApi(port: number): Promise<Server> {
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");

    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const match = url.pathname.match(/^\/orders\/(O-[0-9]+)$/);

    if (request.method !== "GET" || !match) {
      response.writeHead(404).end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const order = orders[match[1]];
    if (!order) {
      response.writeHead(404).end(JSON.stringify({ error: "Order not found" }));
      return;
    }

    response.writeHead(200).end(JSON.stringify(order));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  console.error(`[mock-http-api] listening on http://127.0.0.1:${port}`);
  return server;
}

export async function stopMockHttpApi(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
