import { CYAN, GRAY, GREEN, MUTED, RED, RESET, WHITE, YELLOW } from "./colors.js";

const LABEL_WIDTH = 16;

/** Prints the tern ASCII startup logo and intro message. */
export function printLogo(version: string): void {
  console.log();
  console.log();
  console.log(`  ${GREEN}████████╗███████╗██████╗ ███╗  ██╗${RESET}`);
  console.log(`  ${GREEN}   ██║   ██╔════╝██╔══██╗████╗ ██║${RESET}`);
  console.log(`  ${GREEN}   ██║   █████╗  ██████╔╝██╔██╗██║${RESET}`);
  console.log(`  ${GREEN}   ██║   ██╔══╝  ██╔══██╗██║╚████║${RESET}`);
  console.log(`  ${GREEN}   ██║   ███████╗██║  ██║██║ ╚███║${RESET}`);
  console.log(`  ${GREEN}   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚══╝${RESET}`);
  console.log();
  console.log(`  ${MUTED}${version}  ·  webhook toolkit${RESET}`);
  console.log();
  console.log();
}

export function printDivider(): void {
  console.log(`  ${GREEN}${"─".repeat(42)}${RESET}`);
  console.log();
}

export function printRow(
  icon: string,
  label: string,
  value: string,
  valueColor: string = WHITE,
): void {
  console.log(
    `  ${GREEN}${icon}${RESET}  ` +
      `${MUTED}${label.padEnd(LABEL_WIDTH)}${RESET}` +
      `${valueColor}${value}${RESET}`,
  );
}

export function printPipe(): void {
  console.log(`  ${GREEN}│${RESET}`);
}

export function printSummary(
  platform: string,
  framework: string,
  action: string,
  port?: string,
): void {
  console.log();
  printDivider();
  printPipe();
  printRow("│", "platform", platform, GREEN);
  printRow("│", "framework", framework, GREEN);
  printRow("│", "action", action, GREEN);
  if (port) {
    printRow("│", "port", port, GREEN);
  }
  printPipe();
  printDivider();
}

export function printStep(message: string): void {
  console.log(`  ${GREEN}├${RESET}  ${MUTED}${message}${RESET}`);
}

export function printStepDone(message: string): void {
  console.log(`  ${GREEN}└${RESET}  ${GREEN}✓${RESET}  ${WHITE}${message}${RESET}`);
  console.log();
}

export function printStepFile(filePath: string): void {
  console.log(`  ${GREEN}└${RESET}  ${GREEN}✓${RESET}  ${CYAN}${filePath}${RESET}`);
  console.log();
}

export function printEnvBlock(envVar: string): void {
  console.log();
  console.log(`  ${GREEN}├${RESET}  ${MUTED}add this env variable${RESET}`);
  console.log(`  ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}  ${YELLOW}${envVar}${RESET}=`);
  console.log(`  ${GREEN}│${RESET}`);
  console.log();
}

export function startConnectingAnimation(): () => void {
  const width = 32;
  let filled = 0;
  let stopped = false;

  const interval = setInterval(() => {
    if (stopped) return;
    if (filled < width) filled += 2;
    const bar = GREEN + "█".repeat(filled) + GRAY + "░".repeat(width - filled) + RESET;
    process.stdout.write(`\r  ${GREEN}├${RESET}  [${bar}${GREEN}]${RESET}  `);
  }, 60);

  return () => {
    stopped = true;
    clearInterval(interval);
    process.stdout.write(`\r${" ".repeat(80)}\r`);
  };
}

/** Prints the webhook destination URL box after connection succeeds. */
export function printUrlBox(
  platformLabel: string,
  url: string,
  copied: boolean,
): void {
  const boxWidth = Math.max(url.length + 6, 48);
  const inner = (text: string, visLen: number): string =>
    `  ${GREEN}│${RESET}  ${text}${" ".repeat(boxWidth - visLen - 4)}${GREEN}│${RESET}`;

  console.log();
  console.log(`  ${GREEN}┌${"─".repeat(boxWidth)}┐${RESET}`);
  console.log(`  ${GREEN}│${RESET}${" ".repeat(boxWidth)}${GREEN}│${RESET}`);
  console.log(
    inner(
      `${MUTED}paste in ${platformLabel} webhook settings${RESET}`,
      `paste in ${platformLabel} webhook settings`.length,
    ),
  );
  console.log(`  ${GREEN}│${RESET}${" ".repeat(boxWidth)}${GREEN}│${RESET}`);
  console.log(inner(`${CYAN}${url}${RESET}`, url.length));
  console.log(`  ${GREEN}│${RESET}${" ".repeat(boxWidth)}${GREEN}│${RESET}`);
  if (copied) {
    console.log(inner(`${GREEN}✓ copied to clipboard${RESET}`, 21));
    console.log(`  ${GREEN}│${RESET}${" ".repeat(boxWidth)}${GREEN}│${RESET}`);
  }
  console.log(`  ${GREEN}└${"─".repeat(boxWidth)}┘${RESET}`);
  console.log();
}

export function printListeningState(port: string, uiPort: string, ttl: number): void {
  console.log();
  printDivider();
  printPipe();
  printRow("├", "webhook debugger", `localhost:${uiPort}`, CYAN);
  printRow("├", "forwarding", `localhost:${port}`, CYAN);
  printRow("├", "session ends", `in ${ttl} min`, MUTED);
  printPipe();
  console.log(`  ${GREEN}└${RESET}  ${GREEN}● listening${MUTED}  ·  Ctrl+C to stop${RESET}`);
  console.log();
}

export function printEvent(
  method: string,
  path: string,
  status: number,
  latencyMs: number,
): void {
  const statusColor = status < 300 ? GREEN : status < 500 ? YELLOW : RED;
  console.log(
    `  ${GREEN}├${RESET}  ` +
      `${WHITE}${method.padEnd(6)}${RESET}` +
      `${CYAN}${path.padEnd(36)}${RESET}` +
      `${statusColor}${status}${RESET}` +
      `  ${MUTED}${latencyMs}ms${RESET}`,
  );
}

export function printExit(): void {
  console.log();
  console.log(`  ${GREEN}└${RESET}  ${MUTED}session ended · all event data cleared${RESET}`);
  console.log();
}
