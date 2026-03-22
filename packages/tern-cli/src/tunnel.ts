import { spawn } from "node:child_process";
import { CYAN, GRAY, GREEN, RESET } from "./colors";
import { copyToClipboard } from "./clipboard";
import { openBrowser } from "./browser";
import { printUrlBox } from "./print";

/** Starts tern-dev forwarding and streams connection updates. */
export function startTunnel(
  port: string,
  webhookPath: string,
  platformLabel: string,
): void {
  const child = spawn(
    "npx",
    ["--yes", "@hookflo/tern-dev", "--port", port, "--path", webhookPath],
    { stdio: ["inherit", "pipe", "pipe"], env: { ...process.env } },
  );

  let urlFound = false;
  let dashboardPort: string | null = null;

  child.stdout?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      const dashMatch = line.match(/localhost:(\d+)/);
      if (dashMatch && !dashboardPort) {
        dashboardPort = dashMatch[1];
        openBrowser(`http://localhost:${dashboardPort}`);
      }

      const match = line.match(/https:\/\/[^\s]+\/s\/[a-zA-Z0-9_-]+/);
      if (match && !urlFound) {
        urlFound = true;
        const url = match[0];
        const copied = copyToClipboard(url);
        printUrlBox(platformLabel, url, copied);
        const dashboardUrl = `localhost:${dashboardPort ?? "2019"}`;
        console.log(`  opening webhook debugger · ${CYAN}${dashboardUrl}${RESET}\n`);
        if (!dashboardPort) {
          openBrowser("http://localhost:2019");
        }
        console.log(`  ${GREEN}●${RESET} listening for events`);
        console.log(`  ${GRAY}Ctrl+C to stop · auto-ends in 60 min${RESET}\n`);
      }
    }
  });

  child.on("exit", () => process.exit(0));

  process.on("SIGINT", () => {
    child.kill("SIGINT");
    console.log(`\n  ${GRAY}session ended · all event data cleared${RESET}\n`);
    process.exit(0);
  });
}
