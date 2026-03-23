import { select, text } from "./prompts";

/** Platform option metadata shown in the setup wizard. */
export const PLATFORMS = [
  { value: "stripe", label: "Stripe" },
  { value: "github", label: "GitHub" },
  { value: "clerk", label: "Clerk" },
  { value: "shopify", label: "Shopify" },
  { value: "dodopayments", label: "Dodo Payments" },
  { value: "paddle", label: "Paddle" },
  { value: "lemonsqueezy", label: "Lemon Squeezy" },
  { value: "polar", label: "Polar" },
  { value: "workos", label: "WorkOS" },
  { value: "gitlab", label: "GitLab" },
  { value: "sentry", label: "Sentry" },
  { value: "razorpay", label: "Razorpay" },
  { value: "other", label: "Other" },
] as const;

/** Framework option metadata shown in the setup wizard. */
export const FRAMEWORKS = [
  { value: "nextjs", label: "Next.js" },
  { value: "express", label: "Express" },
  { value: "hono", label: "Hono" },
  { value: "cloudflare", label: "Cloudflare Workers" },
  { value: "other", label: "Other" },
] as const;

/** Secret env variable names by platform. */
export const ENV_VARS: Record<string, string> = {
  stripe: "STRIPE_WEBHOOK_SECRET",
  github: "GITHUB_WEBHOOK_SECRET",
  clerk: "CLERK_WEBHOOK_SECRET",
  shopify: "SHOPIFY_WEBHOOK_SECRET",
  dodopayments: "DODOPAYMENTS_WEBHOOK_SECRET",
  paddle: "PADDLE_WEBHOOK_SECRET",
  lemonsqueezy: "LEMONSQUEEZY_WEBHOOK_SECRET",
  polar: "POLAR_WEBHOOK_SECRET",
  workos: "WORKOS_WEBHOOK_SECRET",
  gitlab: "GITLAB_WEBHOOK_SECRET",
  sentry: "SENTRY_CLIENT_SECRET",
  razorpay: "RAZORPAY_WEBHOOK_SECRET",
};

/** Platform value type. */
export type Platform = (typeof PLATFORMS)[number]["value"];
/** Framework value type. */
export type Framework = (typeof FRAMEWORKS)[number]["value"];
/** Selected action type. */
export type Action = "both" | "handler" | "tunnel";

/** Collected wizard answers. */
export interface WizardAnswers {
  platform: Platform;
  framework: Framework;
  action: Action;
  port: string;
}

/** Runs the interactive setup wizard. */
export async function askQuestions(): Promise<WizardAnswers> {
  const platform = await select<Platform>(
    "which platform are you integrating?",
    PLATFORMS,
  );

  const framework = await select<Framework>(
    "which framework are you using?",
    FRAMEWORKS,
  );

  const action = await select<Action>("what would you like to do?", [
    { value: "both", label: "set up webhook handler + test locally" },
    { value: "handler", label: "set up webhook handler only" },
    { value: "tunnel", label: "test locally only" },
  ]);

  let port = "3000";
  if (action !== "handler") {
    port = await text("which port is your app running on?", "3000", (v: string) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        return "enter a valid port number";
      }
      return undefined;
    });
  }

  return { platform, framework, action, port };
}

/** Looks up the display label for a platform key. */
export function getPlatformLabel(platform: string): string {
  const found = PLATFORMS.find((p) => p.value === platform);
  return found?.label ?? platform;
}
