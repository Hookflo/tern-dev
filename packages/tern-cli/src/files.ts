import fs from "node:fs";
import path from "node:path";
import * as clack from "@clack/prompts";
import { cyan } from "./colors";
import { Framework, Platform, handlerPathsFor, handlerTemplate, nestModuleTemplate } from "./templates";

/** Generates webhook handler files for the selected framework/platform. */
export async function generateHandlerFiles(framework: Framework, platform: Platform): Promise<void> {
  for (const relativePath of handlerPathsFor(framework, platform)) {
    const absolutePath = path.join(process.cwd(), relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

    if (fs.existsSync(absolutePath)) {
      const overwrite = await clack.confirm({ message: `${path.basename(relativePath)} already exists. overwrite?` });
      if (clack.isCancel(overwrite) || !overwrite) {
        continue;
      }
    }

    const content = relativePath.endsWith(".module.ts")
      ? nestModuleTemplate(platform)
      : handlerTemplate(framework, platform);

    fs.writeFileSync(absolutePath, `${content}\n`, "utf8");
    clack.log.success(`created ${cyan(relativePath)}`);
  }
}
