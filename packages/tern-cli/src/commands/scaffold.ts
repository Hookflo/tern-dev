import { createConfig } from '../config'
import { createHandlerFile, createSupportFiles, getFilePath, getWebhookPath } from '../files'
import { installTern } from '../install'
import { getTemplate } from '../templates'
import { startTunnel } from '../tunnel'
import { askQuestions, ENV_VARS, getPlatformLabel } from '../wizard'

export async function run(): Promise<{ framework: string; routePath: string; port: number; envVar: string }> {
  const { platform, framework, action, port } = await askQuestions()
  const envVar = ENV_VARS[platform] ?? 'WEBHOOK_SECRET'

  if (action !== 'tunnel') {
    await installTern()
    const filePath = getFilePath(framework, platform)
    const content = getTemplate(framework, platform, envVar)
    createHandlerFile(filePath, content)
    createSupportFiles(framework, platform, envVar)
  }

  const webhookPath = getWebhookPath(framework, platform)

  if (action !== 'handler') {
    createConfig(port, webhookPath, platform, framework)
    startTunnel(port, webhookPath, getPlatformLabel(platform))
  }

  return { framework, routePath: webhookPath, port: Number(port), envVar }
}
