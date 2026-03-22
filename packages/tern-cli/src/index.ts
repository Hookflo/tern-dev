#!/usr/bin/env node
import * as clack from "@clack/prompts";
import { openBrowser } from "./browser";
import { ensureConfig } from "./config";
import { yellow, colorize, colors } from "./colors";
import { generateHandlerFiles } from "./files";
import { envVarForPlatform } from "./templates";
import { startSession } from "./tunnel";
import { runWizard } from "./wizard";

function printLogo(): void {
  const pink = colors.pink;
  const gray = colors.gray;
  const reset = colors.reset;
  process.stdout.write(`${pink}  ████████╗███████╗██████╗ ███╗  ██╗\n`);
  process.stdout.write(`     ██║   ██╔════╝██╔══██╗████╗ ██║\n`);
  process.stdout.write(`     ██║   █████╗  ██████╔╝██╔██╗██║\n`);
  process.stdout.write(`     ██║   ██╔══╝  ██╔══██╗██║╚████║\n`);
  process.stdout.write(`     ██║   ███████╗██║  ██║██║ ╚███║\n`);
  process.stdout.write(`     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚══╝${reset}\n`);
  process.stdout.write(`${gray}  v0.1.0 · webhook toolkit${reset}\n\n`);
}

/** Entrypoint for the tern interactive setup CLI. */
export async function main(): Promise<void> {
  process.on("SIGINT", () => {
    clack.outro("session ended · all event data cleared");
    process.exit(0);
  });

  printLogo();
  clack.intro(" tern · webhook toolkit ");

  const answers = await runWizard();

  if (answers.action !== "tunnel") {
    await generateHandlerFiles(answers.framework, answers.platform);
    const envVar = envVarForPlatform(answers.platform);
    if (envVar) {
      clack.note(`${yellow(envVar)}=`, "add to .env.local");
    }
  }

  if (answers.action === "handler") {
    clack.outro("ready");
    return;
  }

  const port = answers.port ?? "3000";
  const { webhookPath } = ensureConfig({
    framework: answers.framework,
    platform: answers.platform,
    port: Number(port),
  });

  await startSession({
    port,
    webhookPath,
    platform: answers.platform,
  });

  clack.log.info(`opening dashboard · ${colorize("localhost:2019", colors.cyan)}`);
  openBrowser("http://localhost:2019");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  clack.log.error(message);
  process.exit(1);
});
