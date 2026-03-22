#!/usr/bin/env node
import * as clack from "@clack/prompts";
import { GRAY, RESET } from "./colors";
import { createConfig } from "./config";
import { createHandlerFile, getFilePath, getWebhookPath } from "./files";
import { installTern } from "./install";
import { printEnvBox, printLogo } from "./print";
import { getTemplate } from "./templates";
import { startTunnel } from "./tunnel";
import { askQuestions, ENV_VARS, getPlatformLabel } from "./wizard";

/** CLI entrypoint for @hookflo/tern-cli. */
export async function main(): Promise<void> {
  printLogo();

  const { platform, framework, action, port } = await askQuestions();

  if (action === "handler") {
    await installTern();
    const filePath = getFilePath(framework, platform);
    const envVar = ENV_VARS[platform];
    const content = getTemplate(
      framework,
      platform,
      envVar,
      getPlatformLabel(platform),
    );
    await createHandlerFile(filePath, content);
    if (envVar) printEnvBox(envVar);
    clack.outro("handler ready · add the env variable above to get started");
    return;
  }

  if (action === "tunnel") {
    const webhookPath = getWebhookPath(platform);
    createConfig(port, webhookPath, platform, framework);
    clack.log.step("connecting...");
    startTunnel(port, webhookPath, getPlatformLabel(platform));
    return;
  }

  await installTern();
  const filePath = getFilePath(framework, platform);
  const webhookPath = getWebhookPath(platform);
  const envVar = ENV_VARS[platform];
  const content = getTemplate(
    framework,
    platform,
    envVar ?? "",
    getPlatformLabel(platform),
  );
  await createHandlerFile(filePath, content);
  createConfig(port, webhookPath, platform, framework);
  if (envVar) printEnvBox(envVar);
  clack.log.step("connecting...");
  startTunnel(port, webhookPath, getPlatformLabel(platform));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  ${GRAY}error: ${message}${RESET}\n`);
  process.exit(1);
});
