import { RelayMessage, TernEvent } from "./types";

function detectPlatform(headers: Record<string, string>, body: string): string | null {
  const keys = Object.keys(headers).map((key) => key.toLowerCase());
  if (keys.some((key) => key.includes("stripe"))) return "stripe";
  if (keys.some((key) => key.includes("github"))) return "github";
  if (keys.some((key) => key.includes("clerk"))) return "clerk";
  if (body.includes("payment_intent") || body.includes("stripe")) return "stripe";
  if (body.includes("zen") || body.includes("repository")) return "github";
  return null;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function forward(request: RelayMessage, localPort: number): Promise<TernEvent> {
  const start = Date.now();
  const headers = normalizeHeaders(request.headers);
  const targetUrl = `http://127.0.0.1:${localPort}${request.path}`;

  const event: TernEvent = {
    id: request.id,
    receivedAt: request.receivedAt,
    method: request.method,
    path: request.path,
    headers,
    body: request.body,
    bodyParsed: safeJsonParse(request.body),
    status: null,
    latency: null,
    failed: false,
    error: null,
    platform: detectPlatform(headers, request.body),
    replay: false,
    replayOf: null
  };

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body
    });

    const body = await response.text();
    event.status = response.status;
    event.failed = response.status >= 400;
    event.latency = Date.now() - start;
    event.error = null;
    event.bodyParsed = event.bodyParsed;
    if (body && event.bodyParsed === null) {
      // keep raw body only
    }
  } catch (err) {
    event.status = null;
    event.latency = Date.now() - start;
    event.failed = true;
    event.error = err instanceof Error ? err.message : "Forwarding failed";
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
