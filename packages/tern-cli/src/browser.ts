import { exec } from "node:child_process";

/** Opens the given URL in the user's default browser. */
export function openBrowser(url: string): void {
  const platform = process.platform;
  if (platform === "darwin") {
    exec(`open ${url}`);
    return;
  }
  if (platform === "win32") {
    exec(`start ${url}`);
    return;
  }
  exec(`xdg-open ${url}`);
}
