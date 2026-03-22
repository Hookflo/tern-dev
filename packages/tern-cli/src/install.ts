import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as clack from "@clack/prompts";

/** Detects the package manager install command from lockfiles. */
export function detectPackageManager(): string {
  if (fs.existsSync("yarn.lock")) return "yarn add";
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm add";
  return "npm install";
}

/** Installs @hookflo/tern and reports status in the wizard. */
export async function installTern(): Promise<void> {
  const spinner = clack.spinner();
  spinner.start("installing @hookflo/tern");
  try {
    const pm = detectPackageManager();
    execSync(`${pm} @hookflo/tern`, { stdio: "pipe" });
    spinner.stop("installed @hookflo/tern");
  } catch {
    spinner.stop("could not install @hookflo/tern");
    clack.log.warn("run manually: npm install @hookflo/tern");
  }
}
