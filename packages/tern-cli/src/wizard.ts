import * as clack from "@clack/prompts";
import { Framework, Platform } from "./templates";

/** Wizard answers collected from the interactive setup. */
export interface WizardAnswers {
  platform: Platform;
  framework: Framework;
  action: "both" | "handler" | "tunnel";
  port?: string;
}

/** Runs the four-question setup wizard. */
export async function runWizard(): Promise<WizardAnswers> {
  const platform = await clack.select<Platform>({
    message: "which platform are you integrating?",
    options: [
      { value: "stripe", label: "Stripe" },
      { value: "github", label: "GitHub" },
      { value: "clerk", label: "Clerk" },
      { value: "sentry", label: "Sentry" },
      { value: "twilio", label: "Twilio" },
      { value: "svix", label: "Svix" },
      { value: "other", label: "Other" },
    ],
  });
  if (clack.isCancel(platform)) process.exit(0);

  const framework = await clack.select<Framework>({
    message: "which framework are you using?",
    options: [
      { value: "nextjs", label: "Next.js" },
      { value: "express", label: "Express" },
      { value: "fastify", label: "Fastify" },
      { value: "nestjs", label: "NestJS" },
      { value: "other", label: "Other" },
    ],
  });
  if (clack.isCancel(framework)) process.exit(0);

  const action = await clack.select<"both" | "handler" | "tunnel">({
    message: "what would you like to do?",
    options: [
      { value: "both", label: "set up webhook handler + test locally" },
      { value: "handler", label: "set up webhook handler only" },
      { value: "tunnel", label: "test locally only" },
    ],
  });
  if (clack.isCancel(action)) process.exit(0);

  if (action === "handler") return { platform, framework, action };

  const port = await clack.text({
    message: "which port is your app running on?",
    placeholder: "3000",
    defaultValue: "3000",
    validate: (v: string) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 65535) return "enter a valid port number";
      return undefined;
    },
  });
  if (clack.isCancel(port)) process.exit(0);

  return { platform, framework, action, port };
}
