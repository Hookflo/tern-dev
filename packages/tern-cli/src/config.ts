import * as fs from "node:fs";
import * as path from "node:path";
import * as clack from "@clack/prompts";
import { CYAN, RESET } from "./colors";

/** Creates tern.config.json if it does not already exist. */
export function createConfig(
  port: string,
  webhookPath: string,
  platform: string,
  framework: string,
): void {
  const configPath = path.join(process.cwd(), "tern.config.json");

  if (fs.existsSync(configPath)) return;

  const config = {
    $schema: "./tern-config.schema.json",
    port: Number(port),
    path: webhookPath,
    platform,
    framework,
    uiPort: 2019,
    ttl: 60,
    relay: "wss://tern-relay.hookflo-tern.workers.dev",
    maxEvents: 500,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  clack.log.success(`created ${CYAN}tern.config.json${RESET}`);
}
