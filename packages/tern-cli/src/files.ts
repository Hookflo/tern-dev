import * as fs from "node:fs";
import * as path from "node:path";
import { confirm } from "./prompts";

/** Returns the target handler file path for a framework/platform pair. */
export function getFilePath(framework: string, platform: string): string {
  const cwd = process.cwd();
  const hasSrc = fs.existsSync(path.join(cwd, "src"));

  switch (framework) {
    case "nextjs":
      if (fs.existsSync(path.join(cwd, "src/app"))) {
        return `src/app/api/webhooks/${platform}/route.ts`;
      }
      if (fs.existsSync(path.join(cwd, "app"))) {
        return `app/api/webhooks/${platform}/route.ts`;
      }
      return `app/api/webhooks/${platform}/route.ts`;

    case "express":
      return hasSrc
        ? `src/routes/webhooks/${platform}.ts`
        : `routes/webhooks/${platform}.ts`;

    case "hono":
      return hasSrc
        ? `src/routes/webhooks/${platform}.ts`
        : `src/routes/webhooks/${platform}.ts`;

    case "cloudflare":
      return hasSrc ? `src/webhooks/${platform}.ts` : `webhooks/${platform}.ts`;

    default:
      return `webhooks/${platform}.ts`;
  }
}

/** Returns webhook route path used by tern config and forwarding. */
export function getWebhookPath(platform: string): string {
  return `/api/webhooks/${platform}`;
}

/** Creates a handler file, confirming before overwrite. */
export async function createHandlerFile(
  filePath: string,
  content: string,
): Promise<boolean> {
  const fullPath = path.join(process.cwd(), filePath);

  if (fs.existsSync(fullPath)) {
    const overwrite = await confirm(
      `${path.basename(fullPath)} already exists. overwrite?`,
    );
    if (!overwrite) {
      return false;
    }
  }

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
  return true;
}
