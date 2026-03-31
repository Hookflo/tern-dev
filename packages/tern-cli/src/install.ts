import { execSync } from 'node:child_process'
import * as fs from 'node:fs'

export function detectPackageManager(): string {
  if (fs.existsSync('yarn.lock')) return 'yarn add'
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm add'
  return 'npm install'
}

export async function installTern(): Promise<void> {
  try {
    const pm = detectPackageManager()
    execSync(`${pm} @hookflo/tern`, { stdio: 'pipe' })
  } catch {
    process.stdout.write('warning: could not auto-install @hookflo/tern; run manually\n')
  }
}
