export interface TernEvent {
  id: string;
  receivedAt: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  bodyParsed: unknown | null;
  status: number | null;
  latency: number | null;
  failed: boolean;
  error: string | null;
  platform: string | null;
  replay: boolean;
  replayOf: string | null;
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

export interface Config {
  port: number;
  path: string;
  uiPort: number;
  wsPort: number;
  noUi: boolean;
  relayUrl: string;
  maxEvents: number;
}

export interface RelayConnectedMessage {
  type: "connected";
  url: string;
  sessionId: string;
}
