import EventEmitter from "events";
import WebSocket from "ws";
import { RelayConnectedMessage, RelayMessage } from "./types";

interface RelayClientEvents {
  connected: (payload: RelayConnectedMessage) => void;
  request: (payload: RelayMessage) => void;
  reconnecting: (payload: { attempt: number; delayMs: number }) => void;
  disconnect: () => void;
}

export class RelayClient extends EventEmitter {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private closedByUser = false;
  private readonly maxBackoffMs = 30_000;
  private currentUrl = "";

  connect(url: string): void {
    this.closedByUser = false;
    this.currentUrl = url;
    const wsUrl = this.toConnectUrl(url);

    this.socket = new WebSocket(wsUrl);

    this.socket.on("open", () => {
      this.reconnectAttempt = 0;
      this.socket?.send(JSON.stringify({ type: "register" }));
    });

    this.socket.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as RelayConnectedMessage | RelayMessage;
        if (parsed.type === "connected") {
          this.emit("connected", parsed);
          return;
        }

        if (parsed.type === "request") {
          this.emit("request", parsed);
        }
      } catch {
        // Ignore malformed relay payloads.
      }
    });

    this.socket.on("close", () => {
      this.emit("disconnect");
      this.scheduleReconnect();
    });

    this.socket.on("error", () => {
      // close event will trigger reconnect flow
    });
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  override on<K extends keyof RelayClientEvents>(event: K, listener: RelayClientEvents[K]): this {
    return super.on(event, listener);
  }

  private toConnectUrl(url: string): string {
    const trimmed = url.replace(/\/$/, "");
    return trimmed.endsWith("/connect") ? trimmed : `${trimmed}/connect`;
  }

  private scheduleReconnect(): void {
    if (this.closedByUser || !this.currentUrl || this.reconnectTimer) {
      return;
    }

    const delayMs = Math.min(1000 * 2 ** this.reconnectAttempt, this.maxBackoffMs);
    this.reconnectAttempt += 1;
    this.emit("reconnecting", { attempt: this.reconnectAttempt, delayMs });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.currentUrl);
    }, delayMs);
  }
}
