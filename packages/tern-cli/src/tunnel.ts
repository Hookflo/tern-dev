import { spawn } from "node:child_process";
import { copyToClipboard } from "./clipboard";
import { openBrowser } from "./browser";
import {
  printEvent,
  printExit,
  printListeningState,
  printStep,
  printStepDone,
  printUrlBox,
  startConnectingAnimation,
} from "./print";

/** Starts tern-dev forwarding and streams connection updates. */
export function startTunnel(
  port: string,
  webhookPath: string,
  platformLabel: string,
): void {
  console.log();
  printStep("connecting");
  const stopAnimation = startConnectingAnimation();

  const child = spawn(
    "npx",
    ["--yes", "@hookflo/tern-dev", "--port", port, "--path", webhookPath],
    { stdio: ["inherit", "pipe", "pipe"], env: { ...process.env } },
  );

  let urlFound = false;
  let dashboardPort: string | null = null;

  const handleLine = (line: string): void => {
    if (!line.trim()) return;

    const dashMatch = line.match(/dashboard\s+http:\/\/localhost:(\d+)/i);
    if (dashMatch && !dashboardPort) {
      dashboardPort = dashMatch[1];
    }

    const match = line.match(/https:\/\/[^\s]+\/s\/[a-zA-Z0-9_-]+/);
    if (match && !urlFound) {
      urlFound = true;
      stopAnimation();
      printStepDone("connected");

      const url = match[0];
      const copied = copyToClipboard(url);
      printUrlBox(platformLabel, url, copied);

      const resolvedUiPort = dashboardPort ?? "2019";
      openBrowser(`http://localhost:${resolvedUiPort}`);
      printListeningState(port, resolvedUiPort, 60);
      return;
    }

    const eventMatch = line.match(/\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(\S+)\s+(\d{3})\s+(\d+)ms/);
    if (eventMatch) {
      const [, method, path, status, latency] = eventMatch;
      printEvent(method, path, Number(status), Number(latency));
    }
  };

  child.stdout?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      handleLine(line);
    }
  });

  child.stderr?.on("data", () => {
    // Keep child stderr hidden to preserve clean CLI output aesthetics.
  });

  child.on("exit", () => process.exit(0));

  process.on("SIGINT", () => {
    stopAnimation();
    child.kill("SIGINT");
    printExit();
    process.exit(0);
  });
}
