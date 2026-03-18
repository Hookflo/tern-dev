const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
} as const;

function colorize(color: keyof typeof ANSI, text: string): string {
  return `${ANSI[color]}${text}${ANSI.reset}`;
}

function bannerRow(content = ""): string {
  return `  │  ${content.padEnd(57, " ")}│`;
}

export function info(message: string): void {
  process.stdout.write(`${colorize("cyan", "tern")}${ANSI.dim} ›${ANSI.reset} ${message}\n`);
}

export function success(message: string): void {
  process.stdout.write(`${colorize("green", "tern")}${ANSI.dim} ›${ANSI.reset} ${message}\n`);
}

export function warn(message: string): void {
  process.stdout.write(`${colorize("yellow", "tern")}${ANSI.dim} ›${ANSI.reset} ${message}\n`);
}

export function error(message: string): void {
  process.stderr.write(`${colorize("red", "tern")}${ANSI.dim} ›${ANSI.reset} ${message}\n`);
}

export function printBanner(tunnelUrl: string, localPort: number, uiPort: number, noUi: boolean): void {
  process.stdout.write("\n");
  process.stdout.write(`Tunnel URL: ${tunnelUrl}\n`);
  process.stdout.write(`${colorize("cyan", "tern-dev")} forwarding to localhost:${localPort}\n`);
  if (!noUi) {
    process.stdout.write(`Dashboard: http://localhost:${uiPort}\n`);
  }
  process.stdout.write("\n");
}

export function printSafetyBanner(ttl?: number): void {
  const lines = [
    "  ┌─────────────────────────────────────────────────────────────┐",
    bannerRow("⚠  TUNNEL ACTIVE"),
    bannerRow(),
    bannerRow("Relay URL is publicly reachable for the life of this"),
    bannerRow("process. Anyone with the URL can reach your localhost."),
    bannerRow(),
    bannerRow("→ Press Ctrl+C when done to kill the session"),
    bannerRow("→ Or use --ttl 60 to auto-kill after 60 minutes"),
    bannerRow(),
  ];

  if (ttl === undefined) {
    lines.push(bannerRow("No TTL set — tunnel will run until manually stopped."));
    lines.push(bannerRow("(skip this warning next time with --ttl)"));
  } else {
    lines.push(bannerRow(`✓ Auto-kill in ${ttl} minutes`));
  }

  lines.push("  └─────────────────────────────────────────────────────────────┘");

  process.stdout.write(`${ANSI.yellow}${lines.join("\n")}\n${ANSI.reset}\n`);
}
