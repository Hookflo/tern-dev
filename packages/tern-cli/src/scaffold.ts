import fs from 'node:fs'
import path from 'node:path'
import { getTemplate, getEnvKeys } from './templates.js'

interface ScaffoldOptions {
  platform: string
  framework: string
}

interface ScaffoldResult {
  filePath: string
  envKeys: string[]
}

export async function scaffold({ platform, framework }: ScaffoldOptions): Promise<ScaffoldResult> {
  const filePath = getFilePath(framework, platform)
  const template = getTemplate(framework, platform)
  const envKeys = getEnvKeys(platform)

  const absoluteFilePath = path.join(process.cwd(), filePath)
  fs.mkdirSync(path.dirname(absoluteFilePath), { recursive: true })
  fs.writeFileSync(absoluteFilePath, template, 'utf8')

  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) {
    const envContent = envKeys.map((k) => `${k}=`).join('\n') + '\n'
    fs.writeFileSync(envPath, envContent, 'utf8')
  } else {
    const existing = fs.readFileSync(envPath, 'utf8')
    const missing = envKeys.filter((k) => !existing.includes(`${k}=`))
    if (missing.length) {
      fs.appendFileSync(envPath, `\n${missing.map((k) => `${k}=`).join('\n')}\n`)
    }
  }

  return { filePath, envKeys }
}

function getFilePath(framework: string, platform: string): string {
  switch (framework) {
    case 'hono':
    case 'express':
      return `src/routes/webhooks/${platform}.ts`
    case 'nextjs':
      return `app/api/webhooks/${platform}/route.ts`
    case 'cloudflare':
      return 'src/index.ts'
    default:
      return `src/webhooks/${platform}.ts`
  }
}
