import * as fs from 'node:fs'
import * as path from 'node:path'

export function createConfig(
  port: string,
  webhookPath: string,
  platform: string,
  framework: string,
): void {
  const configPath = path.join(process.cwd(), 'tern.config.json')
  const config = `{
  "$schema": "./tern-config.schema.json",
  "port": ${Number(port)},
  "path": "${webhookPath}",
  "platform": "${platform}",
  "framework": "${framework}",
  "uiPort": 2019,
  "relay": "wss://tern-relay.hookflo-tern.workers.dev",
  "maxEvents": 500,
  "ttl": 30,
  "rateLimit": 100,
  "allowIp": [],
  "block": { "paths": [], "methods": [], "headers": {} },
  "log": ""
}
`

  fs.writeFileSync(configPath, config, 'utf8')
}
