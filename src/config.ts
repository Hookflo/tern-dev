import fs from "node:fs";
import path from "node:path";

/**
 * Runtime and file-based configuration for tern-dev.
 */
export interface TernConfig {
  // Existing flags (must remain fully backward compatible)
  port?: number;
  path?: string;
  uiPort?: number;
  noUi?: boolean;
  relay?: string;
  maxEvents?: number;

  // New control flags
  ttl?: number;
  rateLimit?: number;
  allowIp?: string[];
  block?: {
    paths?: string[];
    methods?: string[];
    headers?: Record<string, string>;
  };
  log?: string;
  localCert?: string;
  localKey?: string;
}

const CONFIG_FILE_NAMES = ["tern.config.json", ".ternrc.json"];

const DEFAULT_CONFIG: Required<Pick<TernConfig, "path" | "uiPort" | "noUi" | "relay" | "maxEvents">> = {
  path: "/",
  uiPort: 2019,
  noUi: false,
  relay: process.env.RELAY_URL ?? "wss://relay.tern.hookflo.com",
  maxEvents: 500,
};

/**
 * Finds the first supported config file by walking up from the current working directory.
 */
export function findConfigFile(): string | null {
  let currentDir = process.cwd();

  while (true) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const candidate = path.join(currentDir, fileName);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Loads and parses a supported tern config file if one exists.
 */
export function loadConfigFile(): TernConfig {
  const configPath = findConfigFile();
  if (!configPath) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as TernConfig;
    console.log(`[tern] loaded config from ${configPath}`);
    return parsed;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[tern] warning: failed to parse config — ${message}`);
    return {};
  }
}

/**
 * Resolves configuration values in priority order: CLI args, config file, then defaults.
 */
export function resolveConfig(cliArgs: Partial<TernConfig>): TernConfig {
  const fileConfig = loadConfigFile();

  return {
    port: cliArgs.port ?? fileConfig.port,
    path: cliArgs.path ?? fileConfig.path ?? DEFAULT_CONFIG.path,
    uiPort: cliArgs.uiPort ?? fileConfig.uiPort ?? DEFAULT_CONFIG.uiPort,
    noUi: cliArgs.noUi ?? fileConfig.noUi ?? DEFAULT_CONFIG.noUi,
    relay: cliArgs.relay ?? fileConfig.relay ?? DEFAULT_CONFIG.relay,
    maxEvents: cliArgs.maxEvents ?? fileConfig.maxEvents ?? DEFAULT_CONFIG.maxEvents,
    ttl: cliArgs.ttl ?? fileConfig.ttl,
    rateLimit: cliArgs.rateLimit ?? fileConfig.rateLimit,
    allowIp: cliArgs.allowIp ?? fileConfig.allowIp,
    block: cliArgs.block ?? fileConfig.block,
    log: cliArgs.log ?? fileConfig.log,
    localCert: cliArgs.localCert ?? fileConfig.localCert,
    localKey: cliArgs.localKey ?? fileConfig.localKey,
  };
}

/**
 * Validates a resolved tern configuration and exits with all collected errors when invalid.
 */
export function validateConfig(config: TernConfig): void {
  const errors: string[] = [];

  if (!Number.isInteger(config.port) || (config.port ?? 0) < 1 || (config.port ?? 0) > 65535) {
    errors.push("--port is required and must be a valid port (1-65535)");
  }

  if (
    Number.isInteger(config.uiPort) &&
    Number.isInteger(config.port) &&
    config.uiPort === config.port
  ) {
    errors.push("--ui-port must be different from --port");
  }

  if (config.ttl !== undefined && config.ttl < 1) {
    errors.push("--ttl must be at least 1 minute");
  }

  if (config.rateLimit !== undefined && config.rateLimit < 1) {
    errors.push("--rate-limit must be at least 1 request per minute");
  }

  const hasLocalCert = Boolean(config.localCert);
  const hasLocalKey = Boolean(config.localKey);

  if (hasLocalCert !== hasLocalKey) {
    errors.push("--local-cert and --local-key must be provided together");
  }

  if (config.localCert && !fs.existsSync(config.localCert)) {
    errors.push(`--local-cert file does not exist: ${config.localCert}`);
  }

  if (config.localKey && !fs.existsSync(config.localKey)) {
    errors.push(`--local-key file does not exist: ${config.localKey}`);
  }

  if (errors.length > 0) {
    for (const message of errors) {
      console.log(`[tern] config error: ${message}`);
    }
    process.exit(1);
  }
}
