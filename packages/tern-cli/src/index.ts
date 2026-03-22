#!/usr/bin/env node
import { GRAY, RESET } from "./colors";
import { createConfig } from "./config";
import { createHandlerFile, getFilePath, getWebhookPath } from "./files";
import { installTern } from "./install";
import { printEnvBlock, printLogo, printStep, printStepDone, printStepFile, printSummary } from "./print";
import { getTemplate } from "./templates";
import { startTunnel } from "./tunnel";
import { askQuestions, ENV_VARS, getPlatformLabel } from "./wizard";

function actionLabel(action: "both" | "handler" | "tunnel"): string {
  if (action === "both") return "handler + local testing";
  if (action === "handler") return "handler only";
  return "local testing only";
}

/** CLI entrypoint for @hookflo/tern-cli. */
export async function main(): Promise<void> {
  printLogo("v0.1.0");

  const { platform, framework, action, port } = await askQuestions();
  printSummary(getPlatformLabel(platform), framework === "nextjs" ? "Next.js" : framework, actionLabel(action), action === "handler" ? undefined : port);

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
    printStep("creating webhook handler");
    const created = await createHandlerFile(filePath, content);
    if (created) {
      printStepFile(filePath);
    } else {
      printStepDone(`skipped ${filePath}`);
    }
    if (envVar) printEnvBlock(envVar);
    printStepDone("handler ready");
    return;
  }

  if (action === "tunnel") {
    const webhookPath = getWebhookPath(platform);
    printStep("creating tern.config.json");
    createConfig(port, webhookPath, platform, framework);
    printStepDone("created tern.config.json");
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
  printStep("creating webhook handler");
  const created = await createHandlerFile(filePath, content);
  if (created) {
    printStepFile(filePath);
  } else {
    printStepDone(`skipped ${filePath}`);
  }
  printStep("creating tern.config.json");
  createConfig(port, webhookPath, platform, framework);
  printStepDone("created tern.config.json");
  if (envVar) printEnvBlock(envVar);
  startTunnel(port, webhookPath, getPlatformLabel(platform));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  ${GRAY}error: ${message}${RESET}\n`);
  process.exit(1);
});
