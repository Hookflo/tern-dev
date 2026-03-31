import { CYAN, GRAY, GREEN, RESET } from './colors.js'

export function printUrlBox(platformLabel: string, url: string, copied: boolean): void {
  const line1 = `  paste this in ${platformLabel} webhook settings:`
  const width = Math.max(line1.length, url.length + 4) + 2
  const pad = (s: string): string => s + ' '.repeat(width - s.length)

  console.log()
  console.log(`  ${GREEN}┌${'─'.repeat(width)}┐${RESET}`)
  console.log(`  ${GREEN}│${RESET}${' '.repeat(width)}${GREEN}│${RESET}`)
  console.log(`  ${GREEN}│${RESET}${pad(line1)}${GREEN}│${RESET}`)
  console.log(`  ${GREEN}│${RESET}${' '.repeat(width)}${GREEN}│${RESET}`)
  console.log(`  ${GREEN}│${RESET}  ${CYAN}${url}${RESET}${' '.repeat(width - url.length - 2)}${GREEN}│${RESET}`)
  if (copied) {
    console.log(`  ${GREEN}│${RESET}  ${GREEN}✓ copied to clipboard${RESET}${' '.repeat(width - 23)}${GREEN}│${RESET}`)
  }
  console.log(`  ${GREEN}│${RESET}${' '.repeat(width)}${GREEN}│${RESET}`)
  console.log(`  ${GREEN}└${'─'.repeat(width)}┘${RESET}`)
  console.log(`  ${GRAY}Ctrl+C to stop · auto-ends in 60 min${RESET}\n`)
}
