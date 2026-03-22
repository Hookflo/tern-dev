import http from "http";
import { TernConfig } from "./config";
import { EventStore } from "./event-store";
import { replay as replayEvent } from "./forwarder";
import { error } from "./logger";
import { StatusPayload, TernEvent } from "./types";

interface UiServerOptions {
  eventStore: EventStore;
  localPort: number;
  forwardConfig: TernConfig;
  uiHtml: string;
  onReplay: (event: TernEvent) => void;
  onClear: () => void;
  getStatus: () => StatusPayload;
  version: string;
}

export class UiServer {
  private server: http.Server | null = null;

  constructor(private readonly options: UiServerOptions) {}

  start(port: number): http.Server {
    this.server = http.createServer(async (req, res) => {
      if (!req.url || !req.method) {
        this.sendJson(res, 400, { error: "Bad request" });
        return;
      }

      if (req.method === "GET" && req.url === "/") {
        const html = this.options.uiHtml
          .replace("__TERN_TUNNEL_URL__", this.options.getStatus().tunnelUrl);
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
          version: this.options.version,
          platform: this.options.forwardConfig.platform ?? null,
          framework: this.options.forwardConfig.framework ?? null,
          webhookPath: this.options.forwardConfig.path ?? "/",
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
        const contentLength = Number(req.headers["content-length"] ?? 0);
        if (Number.isFinite(contentLength) && contentLength > 16_384) {
          this.sendJson(res, 413, { error: "Request body too large" });
          return;
        }

        const body = await this.readBody(req).catch(() => null);
        if (body === null) {
          this.sendJson(res, 413, { error: "Request body too large" });
          return;
        }
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

        const replayed = await replayEvent(event, this.options.forwardConfig);
        this.options.eventStore.add(replayed);
        this.options.onReplay(replayed);
        this.sendJson(res, 200, { event: replayed });
        return;
      }

      this.sendJson(res, 404, { error: "Not found" });
    });

    this.server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        error(
          `Dashboard port ${port} is already in use. ` +
            `Use --ui-port to choose a different port.`,
        );
      } else {
        error(`Dashboard server error: ${err.message}`);
      }
      process.exit(1);
    });

    this.server.listen(port);
    return this.server;
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

  private readBody(req: http.IncomingMessage, maxBytes = 16_384): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";
      let size = 0;
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => {
        size += Buffer.byteLength(chunk);
        if (size > maxBytes) {
          req.destroy();
          reject(new Error("Request body too large"));
          return;
        }
        body += chunk;
      });
      req.on("end", () => resolve(body));
      req.on("error", reject);
      
    });
  }
}
