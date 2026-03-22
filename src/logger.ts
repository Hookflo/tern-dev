export const GREEN = "\x1b[38;2;16;185;129m";
export const CYAN = "\x1b[38;2;6;182;212m";
export const YELLOW = "\x1b[38;2;245;158;11m";
export const GRAY = "\x1b[38;2;55;55;55m";
export const MUTED = "\x1b[38;2;75;75;75m";
export const WHITE = "\x1b[38;2;240;237;232m";
export const RED = "\x1b[38;2;239;68;68m";
export const RESET = "\x1b[0m";
export const BOLD = "\x1b[1m";

const LABEL_WIDTH = 16;

export function printDivider(): void {
  console.log(`  ${GREEN}${"─".repeat(42)}${RESET}`);
  console.log();
}

export function printPipe(): void {
  console.log(`  ${GREEN}│${RESET}`);
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

export function info(message: string): void {
  console.log(`  ${GRAY}tern ›  ${RESET}${WHITE}${message}${RESET}`);
}

export function success(message: string): void {
  console.log(`  ${GREEN}tern ›  ${RESET}${GREEN}${message}${RESET}`);
}

export function warn(message: string): void {
  console.log(`  ${MUTED}tern › ${message}${RESET}`);
}

export function error(message: string): void {
  console.error(`  ${RED}tern › error  ${message}${RESET}`);
}

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
  console.log(`  ${MUTED}v${version}  ·  open source webhook tunnel${RESET}`);
  console.log();
  console.log();
}

export function printBanner(
  tunnelUrl: string,
  forwardTarget: string,
  uiPort: number,
  noUi: boolean,
): void {
  console.log();
  printDivider();
  printPipe();
  printRow("│", "tunnel", tunnelUrl, CYAN);
  if (!noUi) printRow("│", "dashboard", `http://localhost:${uiPort}`, CYAN);
  printRow("│", "forwarding", forwardTarget, WHITE);
  printPipe();
  printDivider();
  console.log();
}

export function printConnected(): void {
  console.log(`  ${GREEN}└${RESET}  ${GREEN}● connected ✓${RESET}`);
  console.log();
}

export function printReconnecting(attempt: number, delay: number): void {
  console.log(`  ${MUTED}tern › reconnecting  ${GRAY}attempt ${attempt}  ${delay}s${RESET}`);
}

export function printSafetyBanner(ttl?: number): void {
  if (ttl) {
    console.log(`  ${MUTED}auto-kill in ${ttl} minutes  ·  Ctrl+C to stop now${RESET}`);
  } else {
    console.log(`  ${MUTED}no ttl set  ·  runs until Ctrl+C${RESET}`);
  }
  console.log();
}

export function printRequest(
  method: string,
  path: string,
  status: number,
  latencyMs: number,
  _sourceIp: string,
): void {
  const statusColor = status < 300 ? GREEN : status < 500 ? YELLOW : RED;
  console.log(
    `  ${GRAY}tern ›  ${RESET}` +
      `${WHITE}${method.padEnd(6)}${RESET}` +
      `${CYAN}${path.padEnd(36)}${RESET}` +
      `${statusColor}${status}${RESET}` +
      `  ${MUTED}${latencyMs}ms${RESET}`,
  );
}

export function printSessionEnded(): void {
  console.log();
  console.log(`  ${GRAY}[tern]  session ended  ·  tunnel closed, all event data cleared${RESET}`);
  console.log();
}

export function printHelp(version: string): void {
  const lines = [
    `@hookflo/tern-dev v${version}`,
    "open source webhook tunnel",
    "",
    "Usage:",
    "  npx @hookflo/tern-dev --port <port> [options]",
    "  npx @hookflo/tern-dev --forward localhost:3000/api/webhooks",
    "",
    "Options:",
    "  --port          Local app port to forward to (required)",
    "  --forward       Full local address e.g. localhost:3000/api/webhooks",
    "  --path          Path prefix for forwarded requests",
    "  --ui-port       Dashboard port (default: 2019)",
    "  --no-ui         Disable dashboard",
    "  --relay         Relay WebSocket URL",
    "  --max-events    Max events in memory (default: 500)",
    "  --ttl           Auto-kill session after N minutes",
    "  --rate-limit    Max requests per minute",
    "  --allow-ip      Allowed IPs or CIDRs (comma separated)",
    "  --block-paths   Block these path prefixes",
    "  --block-methods Block these HTTP methods",
    "  --block-headers Block if header matches (key:glob)",
    "  --log           Audit log file path",
    "  --local-cert    TLS cert for local forwarding",
    "  --local-key     TLS key for local forwarding",
    "  --version       Print version",
    "  --help          Print this help",
    "",
    "Examples:",
    "  npx @hookflo/tern-dev --port 3000",
    "  npx @hookflo/tern-dev --forward localhost:3000/api/webhooks",
    "  npx @hookflo/tern-dev --port 3000 --ttl 60",
    "  npx @hookflo/tern-dev --port 3000 --relay wss://your-relay.com",
    "",
    "github.com/Hookflo/tern",
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}
