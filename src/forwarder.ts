import { RelayMessage, TernEvent } from "./types";

const STRIP_HEADERS = new Set(["content-length", "transfer-encoding", "host", "connection"]);

function detectPlatform(headers: Record<string, string>, body: string): string | null {
  const keys = Object.keys(headers).map((key) => key.toLowerCase());
  if (keys.some((key) => key.includes("stripe"))) return "stripe";
  if (keys.some((key) => key.includes("github"))) return "github";
  if (keys.some((key) => key.includes("clerk"))) return "clerk";
  if (body.includes("payment_intent") || body.includes("stripe")) return "stripe";
  if (body.includes("zen") || body.includes("repository")) return "github";
  return null;
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildForwardHeaders(incomingHeaders: Record<string, string>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(incomingHeaders)) {
    if (!STRIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, String(value));
    }
  }
  return headers;
}

export async function forward(request: RelayMessage, localPort: number): Promise<TernEvent> {
  const start = Date.now();
  const headers = buildForwardHeaders(request.headers);
  const targetUrl = `http://127.0.0.1:${localPort}${request.path}`;

  const event: TernEvent = {
    id: request.id,
    receivedAt: request.receivedAt,
    method: request.method,
    path: request.path,
    headers: request.headers,
    body: request.body,
    bodyParsed: safeJsonParse(request.body),
    status: null,
    latency: null,
    failed: false,
    error: null,
    platform: detectPlatform(request.headers, request.body),
    replay: false,
    replayOf: null
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      signal: controller.signal
    });

    event.status = response.status;
    event.failed = response.status >= 400;
    event.latency = Date.now() - start;
  } catch (err: unknown) {
    event.status = null;
    event.latency = Date.now() - start;
    event.failed = true;
    if (err instanceof Error && err.name === "AbortError") {
      event.error = `Forward timed out after 30s — is localhost:${localPort} running?`;
    } else {
      event.error = err instanceof Error ? err.message : "Forward failed";
    }
  } finally {
    clearTimeout(timeout);
  }

  return event;
}

export async function replay(event: TernEvent, localPort: number): Promise<TernEvent> {
  const replayId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const request: RelayMessage = {
    type: "request",
    id: replayId,
    method: event.method,
    path: event.path,
    headers: event.headers,
    body: event.body,
    receivedAt: new Date().toISOString()
  };

  const replayed = await forward(request, localPort);
  replayed.replay = true;
  replayed.replayOf = event.id;
  return replayed;
}
