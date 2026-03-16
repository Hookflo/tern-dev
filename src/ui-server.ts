import http from "http";
import { EventStore } from "./event-store";
import { replay as replayEvent } from "./forwarder";
import { TernEvent } from "./types";

export class UiServer {
  private server: http.Server | null = null;

  constructor(
    private readonly eventStore: EventStore,
    private readonly localPort: number,
    private readonly uiHtml: string,
    private readonly onReplay: (event: TernEvent) => void,
    private readonly onClear: () => void,
    private readonly getTunnelUrl: () => string
  ) {}

  start(port: number): void {
    this.server = http.createServer(async (req, res) => {
      if (!req.url || !req.method) {
        res.statusCode = 400;
        res.end("Bad request");
        return;
      }

      if (req.method === "GET" && req.url === "/") {
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(this.uiHtml.replace("__TERN_TUNNEL_URL__", this.getTunnelUrl()));
        return;
      }

      if (req.method === "GET" && req.url === "/api/events") {
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ events: this.eventStore.list() }));
        return;
      }

      if (req.method === "DELETE" && req.url === "/api/events") {
        this.eventStore.clear();
        this.onClear();
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === "POST" && req.url === "/api/replay") {
        const body = await this.readBody(req);
        let eventId = "";
        try {
          eventId = JSON.parse(body).id;
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }

        const event = this.eventStore.get(eventId);
        if (!event) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Event not found" }));
          return;
        }

        const replayed = await replayEvent(event, this.localPort);
        this.eventStore.add(replayed);
        this.onReplay(replayed);
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ event: replayed }));
        return;
      }

      res.statusCode = 404;
      res.end("Not found");
    });

    this.server.listen(port);
  }

  close(): void {
    this.server?.close();
    this.server = null;
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => resolve(body));
      req.on("error", reject);
    });
  }
}
