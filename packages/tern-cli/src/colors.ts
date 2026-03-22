/** ANSI brand colors for CLI output. */
export const colors = {
  green: "\x1b[38;2;16;185;129m",
  pink: "\x1b[38;2;236;72;153m",
  cyan: "\x1b[38;2;6;182;212m",
  yellow: "\x1b[38;2;245;158;11m",
  gray: "\x1b[38;2;107;105;99m",
  white: "\x1b[38;2;240;237;232m",
  red: "\x1b[38;2;239;68;68m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
} as const;

/** Wraps text in ANSI color codes. */
export function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

/** Styles path/url values in cyan. */
export function cyan(text: string): string {
  return colorize(text, colors.cyan);
}

/** Styles env var values in yellow. */
export function yellow(text: string): string {
  return colorize(text, colors.yellow);
}
