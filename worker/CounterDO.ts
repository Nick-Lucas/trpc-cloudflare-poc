/**
 * Counter Durable Object
 * A simple counter that persists its state across requests and can be accessed by multiple clients
 */

import { DurableObject } from "cloudflare:workers";

export class CounterDO extends DurableObject<Env> {
  private state: DurableObjectState;
  private count: number | null = null;

  private clients: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  private async broadcastUpdate() {
    const currentValue = JSON.stringify({ count: this.count });

    if (this.count === null) {
      this.count = (await this.state.storage.get("count")) || 0;
    }

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(currentValue);
      }
    }
  }

  override async fetch(req: Request) {
    console.log("CounterDO fetch", req.url);
    if (
      req.url.endsWith("/subscribe") &&
      req.headers.get("Upgrade") === "websocket"
    ) {
      const ws = new WebSocketPair();
      const [client, server] = Object.values(ws);

      this.state.acceptWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response(null, {
      status: 404,
      statusText: "Not Found",
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): void | Promise<void> {
    console.log("[CounterDO:webSocketMessage] Received message", message);
    if (message === "SUBSCRIBE") {
      this.clients.add(ws);
      this.broadcastUpdate(); // Lazy but just broadcast to everyone whenever someone connects, it will be fine
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    console.log("[CounterDO:webSocketClose] Closing WebSocket", ws, code);

    this.clients.delete(ws);
    ws.close(code, "Durable Object is closing WebSocket");
  }

  async value() {
    if (this.count === null) {
      this.count = (await this.state.storage.get("count")) || 0;
    }
    return this.count;
  }

  async increment() {
    if (this.count === null) {
      this.count = (await this.state.storage.get("count")) || 0;
    }
    this.count++;
    await this.state.storage.put("count", this.count);

    this.broadcastUpdate();

    return this.count;
  }

  async decrement() {
    if (this.count === null) {
      this.count = (await this.state.storage.get("count")) || 0;
    }
    this.count--;
    await this.state.storage.put("count", this.count);

    this.broadcastUpdate();

    return this.count;
  }

  async reset() {
    this.count = 0;
    await this.state.storage.put("count", this.count);

    this.broadcastUpdate();

    return this.count;
  }
}
