const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m"
} as const;

function colorize(color: keyof typeof ANSI, text: string): string {
  return `${ANSI[color]}${text}${ANSI.reset}`;
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
  process.stdout.write(`${colorize("cyan", "tern")}  ●  ${tunnelUrl} → localhost:${localPort}\n`);
  if (!noUi) {
    process.stdout.write(`       ●  Dashboard → http://localhost:${uiPort}\n`);
  }
  process.stdout.write("       Ctrl+C to stop\n\n");
}
