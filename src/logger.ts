const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[38;2;16;185;129m",
  cyan: "\x1b[36m",
  red: "\x1b[38;2;239;68;68m",
  yellow: "\x1b[38;2;245;158;11m",
  gray: "\x1b[38;2;107;105;99m",
  white: "\x1b[38;2;240;237;232m",
} as const;

const PREFIX = `${ANSI.gray}tern ›${ANSI.reset}`;

function withColor(color: string, value: string): string {
  return `${color}${value}${ANSI.reset}`;
}

function formatLabel(label: string): string {
  return `${ANSI.gray}${label}${ANSI.reset} ${ANSI.gray}→${ANSI.reset}`;
}

function formatRequestLine(message: string): string {
  const match = message.match(/^(\S+)\s+(\S+)\s+→\s+(\S+)\s+(\d+ms)$/);
  if (!match) {
    return `${ANSI.white}${message}${ANSI.reset}`;
  }

  const [, method, path, status, latency] = match;
  const statusCode = Number(status);
  let statusColor: string = ANSI.red;
  if (Number.isFinite(statusCode)) {
    if (statusCode >= 200 && statusCode < 300) statusColor = ANSI.green;
    else if (statusCode >= 400 && statusCode < 500) statusColor = ANSI.yellow;
  }

  return `${ANSI.cyan}${method}${ANSI.reset} ${ANSI.white}${path}${ANSI.reset} ${ANSI.gray}→${ANSI.reset} ${statusColor}${status}${ANSI.reset} ${ANSI.gray}${latency}${ANSI.reset}`;
}

export function info(message: string): void {
  process.stdout.write(`${PREFIX} ${formatRequestLine(message)}\n`);
}

export function success(message: string): void {
  process.stdout.write(
    `${withColor(ANSI.green, PREFIX)} ${withColor(ANSI.green, message)}\n`,
  );
}

export function warn(message: string): void {
  process.stdout.write(`${PREFIX} ${withColor(ANSI.gray, message)}\n`);
}

export function error(message: string): void {
  process.stderr.write(
    `${withColor(ANSI.red, `${PREFIX} error:`)} ${withColor(ANSI.red, message)}\n`,
  );
}

export function printLogo(version: string): void {
  const logo = [
    "  ████████╗███████╗██████╗ ███╗  ██╗",
    "     ██║   ██╔════╝██╔══██╗████╗ ██║",
    "     ██║   █████╗  ██████╔╝██╔██╗██║",
    "     ██║   ██╔══╝  ██╔══██╗██║╚████║",
    "     ██║   ███████╗██║  ██║██║ ╚███║",
    "     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚══╝",
  ];

  process.stdout.write(`\n${withColor(ANSI.green, logo.join("\n"))}\n`);
  process.stdout.write(
    `${ANSI.gray}  v${version} · open source webhook tunnel${ANSI.reset}\n`,
  );
}

export function printBanner(
  tunnelUrl: string,
  forwardTarget: string,
  uiPort: number,
  noUi: boolean,
): void {
  process.stdout.write("\n");
  process.stdout.write(
    `  ${formatLabel("tunnel")}     ${withColor(ANSI.green, tunnelUrl)}\n`,
  );
  if (!noUi) {
    process.stdout.write(
      `  ${formatLabel("dashboard")}  ${withColor(ANSI.cyan, `http://localhost:${uiPort}`)}\n`,
    );
  }
  process.stdout.write(
    `  ${formatLabel("forwarding")} ${withColor(ANSI.white, forwardTarget)}\n`,
  );
  process.stdout.write("\n");
  process.stdout.write(
    `  ${ANSI.gray}Ctrl+C to end session · use --ttl 60 to auto-kill${ANSI.reset}\n\n`,
  );
}

export function printSafetyBanner(ttl?: number): void {
  if (ttl === undefined) {
    process.stdout.write(
      `  ${ANSI.gray}no ttl set — tunnel runs until Ctrl+C${ANSI.reset}\n\n`,
    );
    return;
  }
  process.stdout.write(
    `  ${ANSI.gray}auto-kill in ${ttl} minutes${ANSI.reset}\n\n`,
  );
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
