import { spawn } from "node:child_process";
import * as clack from "@clack/prompts";
import { copyToClipboard } from "./clipboard";
import { colorize, colors, cyan } from "./colors";
import { platformLabel, Platform } from "./templates";

const URL_REGEX = /(https:\/\/[a-zA-Z0-9.-]*relay[\w.-]*)/;

/** Starts tern-dev and returns a promise that resolves when the share URL appears. */
export function startSession(opts: { port: string; webhookPath: string; platform: Platform }): Promise<void> {
  clack.log.step("connecting...");

  const child = spawn("npx", ["@hookflo/tern-dev", "--port", opts.port, "--path", opts.webhookPath, "--no-ui"], {
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  });

  const printListening = (): void => {
    process.stdout.write(`${colorize("●", colors.green)} listening for webhook events\n`);
    process.stdout.write("Ctrl+C to stop · session auto-ends in 60 min\n");
  };

  return new Promise((resolve, reject) => {
    let resolved = false;

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      const url = text.match(URL_REGEX)?.[1];

      if (!resolved && url) {
        resolved = true;
        try {
          copyToClipboard(url);
        } catch {
          // best effort only
        }

        const provider = platformLabel(opts.platform);
        const pink = colors.pink;
        const reset = colors.reset;
        process.stdout.write(`${pink}┌─────────────────────────────────────────────────┐${reset}\n`);
        process.stdout.write(`${pink}│                                                 │${reset}\n`);
        process.stdout.write(`${pink}│   paste this in ${provider} webhook settings:   │${reset}\n`);
        process.stdout.write(`${pink}│                                                 │${reset}\n`);
        process.stdout.write(`${pink}│   ${cyan(url)}${pink}${" ".repeat(Math.max(1, 46 - url.length))}│${reset}\n`);
        process.stdout.write(`${pink}│                                                 │${reset}\n`);
        process.stdout.write(`${pink}│   ${colorize("✓", colors.green)} copied to clipboard                         │${reset}\n`);
        process.stdout.write(`${pink}│                                                 │${reset}\n`);
        process.stdout.write(`${pink}└─────────────────────────────────────────────────┘${reset}\n`);
        printListening();
        resolve();
      }

      const eventLine = text.match(/(POST|GET|PUT|PATCH|DELETE)\s+(\/[^\s]+).*?(\d{3}).*?(\d+ms)/i);
      if (eventLine) {
        const status = Number(eventLine[3]);
        const statusColor = status >= 400 ? colors.red : colors.green;
        process.stdout.write(`tern › ${colorize(eventLine[1], colors.pink)} ${colorize(eventLine[2], colors.white)} → ${colorize(eventLine[3], statusColor)} ${colorize(eventLine[4], colors.gray)}\n`);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    child.on("exit", (code) => {
      if (!resolved) {
        reject(new Error(`tern-dev exited with code ${code ?? 0}`));
      }
    });
  });
}
