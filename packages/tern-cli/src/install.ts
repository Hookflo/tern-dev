import { execSync } from "node:child_process";
import * as fs from "node:fs";
import { printStep, printStepDone } from "./print.js";

/** Detects the package manager install command from lockfiles. */
export function detectPackageManager(): string {
  if (fs.existsSync("yarn.lock")) return "yarn add";
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm add";
  return "npm install";
}

/** Installs @hookflo/tern and reports status in the wizard. */
export async function installTern(): Promise<void> {
  printStep("installing @hookflo/tern");
  try {
    const pm = detectPackageManager();
    execSync(`${pm} @hookflo/tern`, { stdio: "pipe" });
    printStepDone("installed @hookflo/tern");
  } catch {
    printStepDone("could not install @hookflo/tern · run manually: npm install @hookflo/tern");
  }
}
