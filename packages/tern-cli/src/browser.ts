import { exec } from "node:child_process";

/** Opens a URL in the default browser when possible. */
export function openBrowser(url: string): void {
  try {
    const p = process.platform;
    if (p === "darwin") exec(`open "${url}"`);
    else if (p === "win32") exec(`start "${url}"`);
    else exec(`xdg-open "${url}"`);
  } catch {
    // silent fail
  }
}
