import WebSocket, { WebSocketServer } from "ws";
import { StatusPayload, TernEvent } from "./types";

export type BrowserMessage =
  | { type: "event"; event: TernEvent }
  | { type: "clear" }
  | ({ type: "status" } & StatusPayload);

export class WsServer {
  private wss: WebSocketServer | null = null;
  private status: StatusPayload = {
    connected: false,
    state: "connecting",
    tunnelUrl: "",
    sessionId: ""
  };

  start(port: number): void {
    this.wss = new WebSocketServer({ port });
    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({ type: "status", ...this.status }));
    });
  }

  setStatus(status: StatusPayload): void {
    this.status = status;
    this.broadcast({ type: "status", ...status });
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
