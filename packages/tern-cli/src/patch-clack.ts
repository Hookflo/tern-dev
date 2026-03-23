import { GREEN } from "./colors.js";

let clackPatched = false;

export function patchClackColors(): void {
  if (clackPatched) return;
  clackPatched = true;

  process.env.FORCE_COLOR = "3";

  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
    if (typeof chunk === "string") {
      chunk = chunk
        .replace(/\x1b\[32m/g, GREEN)
        .replace(/\x1b\[36m/g, GREEN)
        .replace(/\x1b\[2;32m/g, GREEN);
    }

    return originalWrite(chunk as never, ...(args as never[]));
  }) as typeof process.stdout.write;
}

patchClackColors();
