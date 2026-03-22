import { execSync } from "node:child_process";

/** Copies text to clipboard and returns true when successful. */
export function copyToClipboard(text: string): boolean {
  try {
    const p = process.platform;
    if (p === "darwin") execSync(`printf '%s' "${text}" | pbcopy`);
    else if (p === "win32") execSync(`echo|set /p="${text}" | clip`);
    else execSync(`printf '%s' "${text}" | xclip -selection clipboard`);
    return true;
  } catch {
    return false;
  }
}
