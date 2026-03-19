import http from "node:http";
import https from "node:https";
import { TernConfig } from "./config";
import { RelayMessage, TernEvent } from "./types";

const STRIP_HEADERS = new Set(["content-length", "transfer-encoding", "host", "connection"]);
const RATE_LIMIT_WINDOW_MS = 60_000;

const sessionRequestTimes: number[] = [];

let localTlsCredentials: { cert: Buffer; key: Buffer } | null = null;

export function setLocalTlsCredentials(cert: Buffer, key: Buffer): void {
  localTlsCredentials = { cert, key };
}

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

function buildForwardHeaders(incomingHeaders: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(incomingHeaders)) {
    if (!STRIP_HEADERS.has(key.toLowerCase())) {
      headers[key] = String(value);
    }
  }
  return headers;
}

function normalizeIp(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
}

function getSourceIp(headers: Record<string, string>): string {
  const forwardedFor = headers["x-forwarded-for"] ?? headers["X-Forwarded-For"];
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0];
    return normalizeIp(firstIp);
  }

  const realIp = headers["x-real-ip"] ?? headers["X-Real-IP"];
  if (realIp) {
    return normalizeIp(realIp);
  }

  return "unknown";
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const numbers = parts.map((part) => Number(part));
  if (numbers.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return null;
  }

  return (((numbers[0] << 24) >>> 0) + (numbers[1] << 16) + (numbers[2] << 8) + numbers[3]) >>> 0;
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [network, prefixText] = cidr.split("/");
  if (!network || prefixText === undefined) {
    return false;
  }

  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(network);
  if (ipInt === null || networkInt === null) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function isIpAllowed(ip: string, allowList: string[]): boolean {
  if (allowList.length === 0) {
    return true;
  }

  for (const entry of allowList) {
    const candidate = entry.trim();
    if (!candidate) {
      continue;
    }

    if (candidate.includes("/")) {
      if (ipMatchesCidr(ip, candidate)) {
        return true;
      }
      continue;
    }

    if (normalizeIp(candidate) === ip) {
      return true;
    }
  }

  return false;
}

function globMatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const regex = new RegExp(`^${escaped}$`, "i");
  return regex.test(value);
}

function rateLimitExceeded(limit: number): boolean {
  const now = Date.now();
  while (sessionRequestTimes.length > 0 && now - sessionRequestTimes[0] > RATE_LIMIT_WINDOW_MS) {
    sessionRequestTimes.shift();
  }

  if (sessionRequestTimes.length >= limit) {
    return true;
  }

  sessionRequestTimes.push(now);
  return false;
}

function buildBlockedEvent(
  request: RelayMessage,
  start: number,
  sourceIp: string,
  status: number,
  error: string,
): TernEvent {
  return {
    id: request.id,
    receivedAt: request.receivedAt,
    method: request.method,
    path: request.path,
    headers: request.headers,
    body: request.body,
    bodyParsed: safeJsonParse(request.body),
    status,
    statusText: status === 429 ? "Too Many Requests" : "Forbidden",
    latency: Date.now() - start,
    failed: true,
    error,
    platform: detectPlatform(request.headers, request.body),
    replay: false,
    replayOf: null,
    sourceIp,
  };
}

function resolveTargetPath(configPath: string | undefined, requestPath: string): string {
  const basePath = (configPath && configPath.trim()) || "/";
  const normalizedBase = basePath.startsWith("/") ? basePath : `/${basePath}`;
  const normalizedRequest = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;

  if (normalizedRequest === "/") {
    return normalizedBase;
  }

  return `${normalizedBase.replace(/\/+$/g, "")}${normalizedRequest}`.replace(/\/\/{2,}/g, "/");
}

function sendLocalRequest(
  request: RelayMessage,
  config: TernConfig,
  headers: Record<string, string>,
): Promise<{ status: number; statusText: string }> {
  return new Promise((resolve, reject) => {
    const targetPath = resolveTargetPath(config.path, request.path);

    const options: https.RequestOptions = {
      hostname: "127.0.0.1",
      port: config.port,
      path: targetPath,
      method: request.method,
      headers,
      timeout: 30_000,
    };

    let client: typeof http | typeof https = http;
    if (config.localCert && config.localKey) {
      client = https;
      options.cert = localTlsCredentials?.cert;
      options.key = localTlsCredentials?.key;
      options.rejectUnauthorized = false;
    }

    const req = client.request(options, (res) => {
      res.resume();
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 500,
          statusText: res.statusMessage ?? "",
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Forward timed out after 30s — is localhost:${config.port} running?`));
    });

    req.on("error", reject);

    const hasBody = !["GET", "HEAD"].includes(request.method.toUpperCase());
    if (hasBody && request.body.length > 0) {
      req.write(request.body);
    }
    req.end();
  });
}

export async function forward(request: RelayMessage, config: TernConfig): Promise<TernEvent> {
  const start = Date.now();
  const headers = buildForwardHeaders(request.headers);
  const sourceIp = getSourceIp(request.headers);

  if (config.rateLimit !== undefined && rateLimitExceeded(config.rateLimit)) {
    console.log("[tern] rate limit exceeded — dropping request");
    return buildBlockedEvent(
      request,
      start,
      sourceIp,
      429,
      "rate limit exceeded — dropping request",
    );
  }

  if (config.allowIp && config.allowIp.length > 0 && !isIpAllowed(sourceIp, config.allowIp)) {
    console.log(`[tern] blocked request from unlisted IP: ${sourceIp}`);
    return buildBlockedEvent(
      request,
      start,
      sourceIp,
      403,
      `blocked request from unlisted IP: ${sourceIp}`,
    );
  }

  if (config.block?.paths?.some((entry) => request.path.toLowerCase().startsWith(entry.toLowerCase()))) {
    console.log(`[tern] blocked request: path ${request.path} matched block rule`);
    return buildBlockedEvent(
      request,
      start,
      sourceIp,
      403,
      `blocked request: path ${request.path} matched block rule`,
    );
  }

  if (config.block?.methods?.some((entry) => entry.toLowerCase() === request.method.toLowerCase())) {
    console.log(`[tern] blocked request: method ${request.method} matched block rule`);
    return buildBlockedEvent(
      request,
      start,
      sourceIp,
      403,
      `blocked request: method ${request.method} matched block rule`,
    );
  }

  if (config.block?.headers) {
    for (const [name, pattern] of Object.entries(config.block.headers)) {
      const headerValue = request.headers[name] ?? request.headers[name.toLowerCase()];
      if (headerValue && globMatch(String(headerValue), pattern)) {
        console.log(`[tern] blocked request: header ${name} matched block rule`);
        return buildBlockedEvent(
          request,
          start,
          sourceIp,
          403,
          `blocked request: header ${name} matched block rule`,
        );
      }
    }
  }

  const event: TernEvent = {
    id: request.id,
    receivedAt: request.receivedAt,
    method: request.method,
    path: request.path,
    headers: request.headers,
    body: request.body,
    bodyParsed: safeJsonParse(request.body),
    status: null,
    statusText: null,
    latency: null,
    failed: false,
    error: null,
    platform: detectPlatform(request.headers, request.body),
    replay: false,
    replayOf: null,
    sourceIp,
  };

  try {
    const response = await sendLocalRequest(request, config, headers);
    event.status = response.status;
    event.statusText = response.statusText;
    event.failed = response.status >= 400;
    event.latency = Date.now() - start;
  } catch (err: unknown) {
    event.status = null;
    event.statusText = null;
    event.latency = Date.now() - start;
    event.failed = true;
    event.error = err instanceof Error ? err.message : "Forward failed";
  }

  return event;
}

export async function replay(event: TernEvent, config: TernConfig): Promise<TernEvent> {
  const replayId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const request: RelayMessage = {
    type: "request",
    id: replayId,
    method: event.method,
    path: event.path,
    headers: event.headers,
    body: event.body,
    receivedAt: new Date().toISOString(),
  };

  const replayed = await forward(request, config);
  replayed.replay = true;
  replayed.replayOf = event.id;
  return replayed;
}
