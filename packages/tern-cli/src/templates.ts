/** Supported platforms for handler templates. */
export const PLATFORMS = ["stripe", "github", "clerk", "sentry", "twilio", "svix", "other"] as const;
/** Supported frameworks for handler templates. */
export const FRAMEWORKS = ["nextjs", "express", "fastify", "nestjs", "other"] as const;

/** Platform identifier union. */
export type Platform = (typeof PLATFORMS)[number];
/** Framework identifier union. */
export type Framework = (typeof FRAMEWORKS)[number];

const ENV_VARS: Record<Platform, string | null> = {
  stripe: "STRIPE_WEBHOOK_SECRET",
  github: "GITHUB_WEBHOOK_SECRET",
  clerk: "CLERK_WEBHOOK_SECRET",
  sentry: "SENTRY_CLIENT_SECRET",
  twilio: "TWILIO_AUTH_TOKEN",
  svix: "SVIX_WEBHOOK_SECRET",
  other: null,
};

const PLATFORM_LABELS: Record<Platform, string> = {
  stripe: "Stripe",
  github: "GitHub",
  clerk: "Clerk",
  sentry: "Sentry",
  twilio: "Twilio",
  svix: "Svix",
  other: "Other",
};

/** Returns the env var name required by a platform. */
export function envVarForPlatform(platform: Platform): string | null {
  return ENV_VARS[platform];
}

/** Returns human label for a platform value. */
export function platformLabel(platform: Platform): string {
  return PLATFORM_LABELS[platform];
}

/** Builds the webhook path for config generation. */
export function webhookPathFor(framework: Framework, platform: Platform): string {
  if (framework === "other") return `/webhooks/${platform}`;
  return `/api/webhooks/${platform}`;
}

/** Returns file paths that should be generated for a framework/platform pair. */
export function handlerPathsFor(framework: Framework, platform: Platform): string[] {
  if (framework === "nextjs") return [`app/api/webhooks/${platform}/route.ts`];
  if (framework === "express" || framework === "fastify") return [`routes/webhooks/${platform}.ts`];
  if (framework === "nestjs") return [`src/webhooks/${platform}.controller.ts`, `src/webhooks/${platform}.module.ts`];
  return [`webhooks/${platform}.ts`];
}

function payloadSwitch(platform: Platform): string {
  if (platform === "github") {
    return `  const event = result.payload\n  const eventType = req.headers.get('x-github-event') || req.headers['x-github-event']\n\n  switch (eventType) {\n    case 'push':\n      // TODO: handle push event\n      break\n\n    case 'pull_request':\n      // TODO: handle pull request event\n      break\n\n    default:\n      console.log('unhandled event type:', eventType)\n  }`;
  }

  const cases: Record<string, [string, string]> = {
    stripe: ["payment_intent.succeeded", "customer.subscription.created"],
    clerk: ["user.created", "user.updated"],
    sentry: ["event_alert_triggered", "metric_alert_fired"],
    twilio: ["message.received", "message.delivered"],
    svix: ["message.created", "message.attempt.exhausted"],
    other: ["event.created", "event.updated"],
  };

  const [a, b] = cases[platform];
  return `  const event = result.payload\n\n  switch (event.type) {\n    case '${a}':\n      // TODO: handle event\n      break\n\n    case '${b}':\n      // TODO: handle event\n      break\n\n    default:\n      console.log('unhandled event type:', event.type)\n  }`;
}

function genericHandler(platform: Platform): string {
  if (platform === "other") {
    return `export async function handler(req: unknown, res: unknown) {\n  // TODO: implement your webhook handler\n  return { received: true }\n}`;
  }

  const envVar = envVarForPlatform(platform);
  return `import { verify } from '@hookflo/tern'\n\nexport async function handler(req: any, res?: any) {\n  const result = await verify(req, '${platform}', process.env.${envVar}!)\n\n  if (!result.isValid) {\n    return { status: 400, body: { error: result.error } }\n  }\n\n${payloadSwitch(platform)}\n\n  return { received: true }\n}`;
}

/** Returns the handler snippet for a given framework/platform pair. */
export function handlerTemplate(framework: Framework, platform: Platform): string {
  if (platform === "other") return genericHandler(platform);

  const envVar = envVarForPlatform(platform);
  if (framework === "nextjs") {
    return `import { verify } from '@hookflo/tern'\nimport { NextRequest, NextResponse } from 'next/server'\n\nexport async function POST(req: NextRequest) {\n  const result = await verify(req, '${platform}', process.env.${envVar}!)\n\n  if (!result.isValid) {\n    return NextResponse.json({ error: result.error }, { status: 400 })\n  }\n\n${payloadSwitch(platform)}\n\n  return NextResponse.json({ received: true })\n}`;
  }

  if (framework === "express" || framework === "fastify") {
    const pre = framework === "express"
      ? `import express from 'express'\nimport { verify } from '@hookflo/tern'\n\nconst router = express.Router()\n\nrouter.post('/api/webhooks/${platform}', express.raw({ type: '*/*' }), async (req, res) => {`
      : `import { verify } from '@hookflo/tern'\n\nexport default async function webhookRoute(fastify: any) {\n  fastify.post('/api/webhooks/${platform}', async (req: any, reply: any) => {`;
    const post = framework === "express" ? `\n  res.json({ received: true })\n})\n\nexport default router` : `\n    return reply.send({ received: true })\n  })\n}`;
    return `${pre}\n  const result = await verify(req, '${platform}', process.env.${envVar}!)\n\n  if (!result.isValid) {\n${framework === "express" ? "    return res.status(400).json({ error: result.error })" : "    return reply.status(400).send({ error: result.error })"}\n  }\n\n${payloadSwitch(platform).replace(/^/gm, framework === "express" ? "" : "  ")}\n${post}`;
  }

  if (framework === "nestjs") {
    return `import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common'\nimport { verify } from '@hookflo/tern'\n\n@Controller('api/webhooks/${platform}')\nexport class ${PLATFORM_LABELS[platform]}WebhookController {\n  @Post()\n  @HttpCode(200)\n  async handle(@Body() body: unknown, @Headers() headers: Record<string, string>) {\n    const result = await verify({ body, headers }, '${platform}', process.env.${envVar}!)\n\n    if (!result.isValid) {\n      return { error: result.error }\n    }\n\n    const event = result.payload\n    // TODO: handle event.type\n    return { received: true, type: event?.type }\n  }\n}`;
  }

  return genericHandler(platform);
}

/** Returns a minimal NestJS module template for the selected platform. */
export function nestModuleTemplate(platform: Platform): string {
  const className = `${platformLabel(platform).replace(/\W/g, "")}WebhookController`;
  return `import { Module } from '@nestjs/common'\nimport { ${className} } from './${platform}.controller'\n\n@Module({\n  controllers: [${className}],\n})\nexport class ${platformLabel(platform).replace(/\W/g, "")}WebhookModule {}`;
}
