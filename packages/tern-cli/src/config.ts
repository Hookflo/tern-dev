import fs from "node:fs";
import path from "node:path";
import * as clack from "@clack/prompts";
import { cyan } from "./colors";
import { Framework, Platform, webhookPathFor } from "./templates";

/** Creates tern.config.json if it does not already exist. */
export function ensureConfig(opts: { framework: Framework; platform: Platform; port: number }): { created: boolean; webhookPath: string } {
  const configPath = path.join(process.cwd(), "tern.config.json");
  const webhookPath = webhookPathFor(opts.framework, opts.platform);

  if (fs.existsSync(configPath)) {
    return { created: false, webhookPath };
  }

  const contents = `{
  "$schema": "./tern-config.schema.json",

  "port": ${opts.port},

  "path": "${webhookPath}",

  "platform": "${opts.platform}",

  "framework": "${opts.framework}",

  "uiPort": 2019,

  "ttl": 60,

  "relay": "wss://tern-relay.hookflo-tern.workers.dev",

  "maxEvents": 500
}
`;

  fs.writeFileSync(configPath, contents, "utf8");
  clack.log.success(`created ${cyan("tern.config.json")}`);
  return { created: true, webhookPath };
}
