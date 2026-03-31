export function getTemplate(framework: string, platform: string): string {
  const env = `${platform.toUpperCase().replace(/-/g, '_')}_WEBHOOK_SECRET`

  switch (framework) {
    case 'hono':
      return `import { Hono } from 'hono'\nimport { createWebhookHandler } from '@hookflo/tern/hono'\n\nconst router = new Hono()\n\nrouter.post('/${platform}', createWebhookHandler({\n  platform: '${platform}',\n  secret: process.env.${env}!,\n  // queue: { retries: 3 }, // uncomment + add QSTASH_* env vars for guaranteed delivery\n  handler: async (payload) => {\n    console.log('${platform} event:', payload?.type)\n    // TODO: handle payload\n    return { received: true }\n  },\n}))\n\nexport default router\n`
    case 'nextjs':
      return `import { createWebhookHandler } from '@hookflo/tern/nextjs'\n\nexport const POST = createWebhookHandler({\n  platform: '${platform}',\n  secret: process.env.${env}!,\n  // queue: true, // uncomment + add QSTASH_* env vars for guaranteed delivery (Vercel only)\n  // queue: { token: process.env.QSTASH_TOKEN!, retries: 3 }, // explicit config\n  handler: async (payload) => {\n    console.log('${platform} event:', payload?.type)\n    // TODO: handle payload\n    return { received: true }\n  },\n})\n`
    case 'express':
      return `import { Router } from 'express'\nimport { createWebhookMiddleware } from '@hookflo/tern/express'\n\nconst router = Router()\n\n// Note: register this router BEFORE express.json() in src/index.ts\nrouter.post('/${platform}',\n  createWebhookMiddleware({\n    platform: '${platform}',\n    secret: process.env.${env}!,\n  }),\n  (req, res) => {\n    const { payload } = (req as any).webhook\n    console.log('${platform} event:', payload?.type)\n    // TODO: handle payload\n    res.json({ received: true })\n  }\n)\n\nexport default router\n`
    case 'cloudflare':
      return `import { createWebhookHandler } from '@hookflo/tern/cloudflare'\n\nexport interface Env {\n  WEBHOOK_SECRET: string // set via: wrangler secret put WEBHOOK_SECRET\n}\n\nexport default {\n  async fetch(request: Request, env: Env): Promise<Response> {\n    const url = new URL(request.url)\n\n    if (url.pathname === '/webhooks/${platform}' && request.method === 'POST') {\n      const handler = createWebhookHandler({\n        platform: '${platform}',\n        secret: env.WEBHOOK_SECRET, // Workers use env.*, not process.env\n        handler: async (payload) => {\n          console.log('${platform} event:', payload?.type)\n          // TODO: handle payload\n          return { received: true }\n        },\n      })\n      return handler(request, env)\n    }\n\n    return new Response('not found', { status: 404 })\n  },\n}\n`
    default:
      return `export default async function handler(request: Request) {\n  const payload = await request.json()\n  console.log('${platform} event:', payload?.type)\n  return new Response(JSON.stringify({ received: true }), { status: 200 })\n}\n`
  }
}

export function getEnvKeys(platform: string): string[] {
  const secret = `${platform.toUpperCase().replace(/-/g, '_')}_WEBHOOK_SECRET`
  return [secret]
}
