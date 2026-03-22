import * as clack from "@clack/prompts";
import { CYAN, GRAY, GREEN, RESET, YELLOW } from "./colors";

/** Prints the tern ASCII startup logo and intro message. */
export function printLogo(): void {
  console.log(`${GREEN}  ████████╗███████╗██████╗ ███╗  ██╗`);
  console.log("     ██║   ██╔════╝██╔══██╗████╗ ██║");
  console.log("     ██║   █████╗  ██████╔╝██╔██╗██║");
  console.log("     ██║   ██╔══╝  ██╔══██╗██║╚████║");
  console.log("     ██║   ███████╗██║  ██║██║ ╚███║");
  console.log(`     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚══╝${RESET}`);
  console.log(`\n  ${GRAY}v0.1.0 · webhook toolkit${RESET}\n`);
  clack.intro(" tern · webhook toolkit ");
}

/** Prints the environment variable helper box. */
export function printEnvBox(envVar: string): void {
  console.log();
  console.log(`  ${GRAY}┌─ add this env variable ${"─".repeat(20)}┐${RESET}`);
  console.log(`  ${GRAY}│${RESET}`);
  console.log(`  ${GRAY}│${RESET}  ${YELLOW}${envVar}${RESET}=`);
  console.log(`  ${GRAY}│${RESET}`);
  console.log(`  ${GRAY}└${"─".repeat(44)}┘${RESET}`);
  console.log();
}

/** Prints the webhook destination URL box after connection succeeds. */
export function printUrlBox(
  platformLabel: string,
  url: string,
  copied: boolean,
): void {
  const line1 = `  paste this in ${platformLabel} webhook settings:`;
  const width = Math.max(line1.length, url.length + 4) + 2;
  const pad = (s: string): string => s + " ".repeat(width - s.length);

  console.log();
  console.log(`  ${GREEN}┌${"─".repeat(width)}┐${RESET}`);
  console.log(`  ${GREEN}│${RESET}${" ".repeat(width)}${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}${pad(line1)}${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}${" ".repeat(width)}${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}  ${CYAN}${url}${RESET}${" ".repeat(width - url.length - 2)}${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}${" ".repeat(width)}${GREEN}│${RESET}`);
  if (copied) {
    console.log(`  ${GREEN}│${RESET}  ${GREEN}✓ copied to clipboard${RESET}${" ".repeat(width - 23)}${GREEN}│${RESET}`);
  }
  console.log(`  ${GREEN}│${RESET}${" ".repeat(width)}${GREEN}│${RESET}`);
  console.log(`  ${GREEN}└${"─".repeat(width)}┘${RESET}`);
  console.log();
}
