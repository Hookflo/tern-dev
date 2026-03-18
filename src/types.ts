export type RelayConnectionState = "connecting" | "live" | "reconnecting" | "disconnected";

export interface TernEvent {
  id: string;
  receivedAt: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  bodyParsed: unknown | null;
  status: number | null;
  statusText?: string | null;
  latency: number | null;
  failed: boolean;
  error: string | null;
  platform: string | null;
  replay: boolean;
  replayOf: string | null;
  sourceIp?: string;
}

export interface RelayMessage {
  type: "request";
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  receivedAt: string;
}

export interface RelayConnectedMessage {
  type: "connected";
  url: string;
  sessionId: string;
}

export interface StatusPayload {
  connected: boolean;
  state: RelayConnectionState;
  tunnelUrl: string;
  sessionId: string;
}
