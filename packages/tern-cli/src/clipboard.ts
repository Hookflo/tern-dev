import { execSync } from "node:child_process";

/** Copies text to the system clipboard using OS-specific commands. */
export function copyToClipboard(text: string): void {
  const platform = process.platform;
  if (platform === "darwin") {
    execSync(`echo "${text}" | pbcopy`);
    return;
  }
  if (platform === "win32") {
    execSync(`echo ${text} | clip`);
    return;
  }
  execSync(`echo "${text}" | xclip -selection clipboard`);
}
