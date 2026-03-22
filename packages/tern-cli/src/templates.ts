/** Returns handler template source code for framework/platform combination. */
export function getTemplate(
  framework: string,
  platform: string,
  envVar: string,
  platformLabel: string,
): string {
  if (platform === "other") return getOtherTemplate(framework);

  switch (framework) {
    case "nextjs":
      return nextjsTemplate(platform, envVar, platformLabel);
    case "express":
      return expressTemplate(platform, envVar, platformLabel);
    case "hono":
      return honoTemplate(platform, envVar, platformLabel);
    case "cloudflare":
      return cloudflareTemplate(platform, envVar, platformLabel);
    default:
      return genericTemplate(platform, envVar, platformLabel);
  }
}

function nextjsTemplate(p: string, env: string, label: string): string {
  return `import { createWebhookHandler } from '@hookflo/tern/nextjs'

export const POST = createWebhookHandler({
  platform: '${p}',
  secret: process.env.${env}!,
  handler: async (payload, metadata) => {
    // TODO: handle ${label} webhook
    console.log('received ${label} event:', payload)
    return { received: true }
  },
})
`;
}

function expressTemplate(p: string, env: string, label: string): string {
  return `import express from 'express'
import { createWebhookMiddleware } from '@hookflo/tern/express'

const router = express.Router()

router.post(
  '/api/webhooks/${p}',
  express.raw({ type: '*/*' }),
  createWebhookMiddleware({
    platform: '${p}',
    secret: process.env.${env}!,
  }),
  (req, res) => {
    const event = (req as any).webhook?.payload
    // TODO: handle ${label} webhook
    console.log('received ${label} event:', event)
    res.json({ received: true })
  },
)

export default router
`;
}

function honoTemplate(p: string, env: string, label: string): string {
  return `import { Hono } from 'hono'
import { createWebhookHandler } from '@hookflo/tern/hono'

const app = new Hono()

app.post(
  '/api/webhooks/${p}',
  createWebhookHandler({
    platform: '${p}',
    secret: process.env.${env}!,
    handler: async (payload, metadata, c) => {
      // TODO: handle ${label} webhook
      console.log('received ${label} event:', payload)
      return c.json({ received: true })
    },
  })
)

export default app
`;
}

function cloudflareTemplate(p: string, env: string, label: string): string {
  return `import { createWebhookHandler } from '@hookflo/tern/cloudflare'

export const onRequestPost = createWebhookHandler({
  platform: '${p}',
  secretEnv: '${env}',
  handler: async (payload) => {
    // TODO: handle ${label} webhook
    console.log('received ${label} event:', payload)
    return { received: true, payload }
  },
})
`;
}

function genericTemplate(p: string, env: string, label: string): string {
  return `import { WebhookVerificationService } from '@hookflo/tern'

export async function handleWebhook(request: Request) {
  const result = await WebhookVerificationService.verify(request, {
    platform: '${p}',
    secret: process.env.${env}!,
  })

  if (!result.isValid) {
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: 400 }
    )
  }

  // TODO: handle ${label} webhook
  console.log('received ${label} event:', result.payload)
  return new Response(
    JSON.stringify({ received: true }),
    { status: 200 }
  )
}
`;
}

function getOtherTemplate(_framework: string): string {
  return `// TODO: add webhook verification for your platform
// see https://github.com/Hookflo/tern for supported platforms

export async function handleWebhook(request: Request) {
  // verify signature here
  
  const body = await request.json()
  console.log('received webhook:', body)

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200 }
  )
}
`;
}
