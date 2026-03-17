import http from "http";
import { EventStore } from "./event-store";
import { replay as replayEvent } from "./forwarder";
import { StatusPayload, TernEvent } from "./types";

interface UiServerOptions {
  eventStore: EventStore;
  localPort: number;
  uiHtml: string;
  onReplay: (event: TernEvent) => void;
  onClear: () => void;
  getStatus: () => StatusPayload;
  version: string;
  wsPort: number;
}

export class UiServer {
  private server: http.Server | null = null;

  constructor(private readonly options: UiServerOptions) {}

  start(port: number): void {
    this.server = http.createServer(async (req, res) => {
      if (!req.url || !req.method) {
        this.sendJson(res, 400, { error: "Bad request" });
        return;
      }

      if (req.method === "GET" && req.url === "/") {
        const html = this.options.uiHtml
          .replace("__TERN_TUNNEL_URL__", this.options.getStatus().tunnelUrl)
          .replace("__TERN_WS_PORT__", String(this.options.wsPort));
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }

      if (req.method === "GET" && req.url === "/api/status") {
        const status = this.options.getStatus();
        this.sendJson(res, 200, {
          connected: status.connected,
          state: status.state,
          tunnelUrl: status.tunnelUrl,
          sessionId: status.sessionId,
          port: this.options.localPort,
          version: this.options.version
        });
        return;
      }

      if (req.method === "GET" && req.url === "/api/events") {
        this.sendJson(res, 200, { events: this.options.eventStore.list() });
        return;
      }

      if (req.method === "POST" && req.url === "/api/clear") {
        this.options.eventStore.clear();
        this.options.onClear();
        this.sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === "POST" && req.url === "/api/replay") {
        const body = await this.readBody(req);
        let eventId = "";
        try {
          const parsed = JSON.parse(body) as { id?: string };
          eventId = parsed.id ?? "";
        } catch {
          this.sendJson(res, 400, { error: "Invalid JSON" });
          return;
        }

        const event = this.options.eventStore.get(eventId);
        if (!event) {
          this.sendJson(res, 404, { error: "Event not found" });
          return;
        }

        const replayed = await replayEvent(event, this.options.localPort);
        this.options.eventStore.add(replayed);
        this.options.onReplay(replayed);
        this.sendJson(res, 200, { event: replayed });
        return;
      }

      this.sendJson(res, 404, { error: "Not found" });
    });

    this.server.listen(port);
  }

  close(): void {
    this.server?.close();
    this.server = null;
  }

  private sendJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
    res.statusCode = statusCode;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => {
        body += chunk;
      });
      req.on("end", () => resolve(body));
      req.on("error", reject);
    });
  }
}
