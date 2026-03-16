import WebSocket, { WebSocketServer } from "ws";

export type BrowserMessage =
  | { type: "event"; event: unknown }
  | { type: "update"; event: unknown }
  | { type: "clear" }
  | { type: "status"; connected: boolean };

export class WsServer {
  private wss: WebSocketServer | null = null;
  private connected = false;

  start(port: number): void {
    this.wss = new WebSocketServer({ port });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({ type: "status", connected: this.connected }));
    });
  }

  setStatus(connected: boolean): void {
    this.connected = connected;
    this.broadcast({ type: "status", connected });
  }

  broadcast(payload: BrowserMessage): void {
    if (!this.wss) return;

    const message = JSON.stringify(payload);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  close(): void {
    this.wss?.close();
    this.wss = null;
  }
}
