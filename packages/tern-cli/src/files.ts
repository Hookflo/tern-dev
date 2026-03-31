import * as fs from 'node:fs'
import * as path from 'node:path'
import { getDotEnvTemplate, getEnvModuleTemplate, getServerEntryTemplate, getWebhookIndexTemplate } from './templates'

export function getFilePath(framework: string, platform: string): string {
  switch (framework) {
    case 'nextjs': {
      const cwd = process.cwd()
      if (fs.existsSync(path.join(cwd, 'src/app'))) return `src/app/api/webhooks/${platform}/route.ts`
      return `app/api/webhooks/${platform}/route.ts`
    }
    case 'express':
    case 'hono':
      return `src/routes/webhooks/${platform}.ts`
    case 'cloudflare':
      return 'src/index.ts'
    default:
      return `webhooks/${platform}.ts`
  }
}

export function getWebhookPath(framework: string, platform: string): string {
  return framework === 'nextjs' ? `/api/webhooks/${platform}` : `/webhooks/${platform}`
}

export function createHandlerFile(filePath: string, content: string): void {
  const fullPath = path.join(process.cwd(), filePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content, 'utf8')
    return
  }
  const current = fs.readFileSync(fullPath, 'utf8')
  if (current !== content) fs.writeFileSync(fullPath, content, 'utf8')
}

export function createSupportFiles(framework: string, platform: string, envVar: string): void {
  if (framework === 'hono' || framework === 'express') {
    const routerIndex = getWebhookIndexTemplate(framework, platform)
    const entry = getServerEntryTemplate(framework)
    if (routerIndex) createHandlerFile('src/routes/webhooks/index.ts', routerIndex)
    if (entry) createHandlerFile('src/index.ts', entry)
    createHandlerFile('src/env.ts', getEnvModuleTemplate(envVar))
    ensureNodeTsConfig()
  }

  ensureDotEnv(envVar)
  ensureGitIgnoreDotEnv()
  ensurePackageScripts(framework)
}

function ensureDotEnv(envVar: string): void {
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, getDotEnvTemplate(envVar), 'utf8')
    return
  }

  const existing = fs.readFileSync(envPath, 'utf8')
  if (!existing.includes(`${envVar}=`)) {
    fs.writeFileSync(envPath, `${getDotEnvTemplate(envVar)}\n${existing}`, 'utf8')
  }
}

function ensureGitIgnoreDotEnv(): void {
  const ignorePath = path.join(process.cwd(), '.gitignore')
  if (!fs.existsSync(ignorePath)) {
    fs.writeFileSync(ignorePath, '.env\n', 'utf8')
    return
  }
  const existing = fs.readFileSync(ignorePath, 'utf8')
  if (!existing.split('\n').includes('.env')) {
    fs.writeFileSync(ignorePath, `${existing.trimEnd()}\n.env\n`, 'utf8')
  }
}

function ensurePackageScripts(framework: string): void {
  const packagePath = path.join(process.cwd(), 'package.json')
  if (!fs.existsSync(packagePath)) return

  const raw = fs.readFileSync(packagePath, 'utf8')
  const pkg = JSON.parse(raw) as Record<string, any>
  pkg.scripts = pkg.scripts ?? {}

  if (framework === 'hono' || framework === 'express') {
    pkg.scripts.dev = 'tsx --env-file=.env watch src/index.ts'
    pkg.scripts.build = 'tsc'
    pkg.scripts.start = 'node --env-file=.env dist/index.js'
  } else if (framework === 'nextjs') {
    pkg.scripts.dev = 'next dev'
    pkg.scripts.build = 'next build'
    pkg.scripts.start = 'next start'
  } else if (framework === 'cloudflare') {
    pkg.scripts.dev = 'wrangler dev'
    pkg.scripts.deploy = 'wrangler deploy'
  }

  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
}

function ensureNodeTsConfig(): void {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      lib: ['ES2022'],
      strict: true,
      skipLibCheck: true,
      outDir: 'dist',
      rootDir: 'src',
    },
    include: ['src'],
  }

  if (!fs.existsSync(tsconfigPath)) {
    fs.writeFileSync(tsconfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  }
}
