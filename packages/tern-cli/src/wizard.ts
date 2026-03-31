import minimist from 'minimist'

export const PLATFORMS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'github', label: 'GitHub' },
  { value: 'clerk', label: 'Clerk' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'dodopayments', label: 'Dodo Payments' },
  { value: 'paddle', label: 'Paddle' },
  { value: 'lemonsqueezy', label: 'Lemon Squeezy' },
  { value: 'polar', label: 'Polar' },
  { value: 'workos', label: 'WorkOS' },
  { value: 'gitlab', label: 'GitLab' },
  { value: 'sentry', label: 'Sentry' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'other', label: 'Other' },
] as const

export const FRAMEWORKS = [
  { value: 'nextjs', label: 'Next.js' },
  { value: 'express', label: 'Express' },
  { value: 'hono', label: 'Hono' },
  { value: 'cloudflare', label: 'Cloudflare Workers' },
  { value: 'other', label: 'Other' },
] as const

export const ENV_VARS: Record<string, string> = {
  stripe: 'STRIPE_WEBHOOK_SECRET',
  github: 'GITHUB_WEBHOOK_SECRET',
  clerk: 'CLERK_WEBHOOK_SECRET',
  shopify: 'SHOPIFY_WEBHOOK_SECRET',
  dodopayments: 'DODOPAYMENTS_WEBHOOK_SECRET',
  paddle: 'PADDLE_WEBHOOK_SECRET',
  lemonsqueezy: 'LEMONSQUEEZY_WEBHOOK_SECRET',
  polar: 'POLAR_WEBHOOK_SECRET',
  workos: 'WORKOS_WEBHOOK_SECRET',
  gitlab: 'GITLAB_WEBHOOK_SECRET',
  sentry: 'SENTRY_CLIENT_SECRET',
  razorpay: 'RAZORPAY_WEBHOOK_SECRET',
  other: 'WEBHOOK_SECRET',
}

export type Platform = (typeof PLATFORMS)[number]['value']
export type Framework = (typeof FRAMEWORKS)[number]['value']
export type Action = 'both' | 'handler' | 'tunnel'

export interface WizardAnswers {
  platform: Platform
  framework: Framework
  action: Action
  port: string
}

export async function askQuestions(): Promise<WizardAnswers> {
  const args = minimist(process.argv.slice(2), {
    string: ['platform', 'framework', 'action', 'port'],
    alias: { p: 'platform', f: 'framework' },
  })

  const platform = (args.platform ?? 'stripe') as Platform
  const framework = (args.framework ?? 'nextjs') as Framework
  const action = (args.action ?? 'both') as Action
  const port = String(args.port ?? '3000')

  return { platform, framework, action, port }
}

export function getPlatformLabel(platform: string): string {
  const found = PLATFORMS.find((p) => p.value === platform)
  return found?.label ?? platform
}
