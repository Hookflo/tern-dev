import EventEmitter from "events";
import WebSocket from "ws";
import { RelayConnectedMessage, RelayMessage } from "./types";

interface RelayClientEvents {
  connected: (payload: RelayConnectedMessage) => void;
  request: (payload: RelayMessage) => void;
  disconnect: () => void;
}

export class RelayClient extends EventEmitter {
  private socket: WebSocket | null = null;

  connect(url: string): void {
    // Ensure /connect path is always appended
    const wsUrl = url.endsWith("/connect") ? url : `${url}/connect`;
    this.socket = new WebSocket(wsUrl);

    this.socket.on("open", () => {
      this.socket?.send(JSON.stringify({ type: "register" }));
    });

    this.socket.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as
          | RelayConnectedMessage
          | RelayMessage;
        if (parsed.type === "connected") {
          this.emit("connected", parsed);
        } else if (parsed.type === "request") {
          this.emit("request", parsed);
        }
      } catch {
        // ignore malformed relay messages
      }
    });

    this.socket.on("close", () => {
      this.emit("disconnect");
    });

    this.socket.on("error", () => {
      this.emit("disconnect");
    });
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }

  override on<K extends keyof RelayClientEvents>(
    event: K,
    listener: RelayClientEvents[K],
  ): this {
    return super.on(event, listener);
  }
}
