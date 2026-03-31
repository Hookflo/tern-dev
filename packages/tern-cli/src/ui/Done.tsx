import React from 'react'
import { Box, Text } from 'ink'

interface DoneProps {
  framework: string
  routePath: string
  port: number
}

export const Done = ({ framework, routePath, port }: DoneProps) => (
  <Box flexDirection="column" marginTop={1}>
    <Text bold color="green">✓ Scaffold complete</Text>
    <Box flexDirection="column" marginTop={1} paddingLeft={2}>
      <Text>Framework  <Text color="cyan">{framework}</Text></Text>
      <Text>Route      <Text color="cyan">{routePath}</Text></Text>
    </Box>
    <Box flexDirection="column" marginTop={1} paddingLeft={2}>
      <Text dimColor>Next steps:</Text>
      <Text>  1. Fill in your .env values</Text>
      <Text>  2. <Text color="yellow">npm run dev</Text></Text>
      <Text>  3. <Text color="yellow">npx @hookflo/tern-dev --port {port}</Text>  ← local tunnel</Text>
    </Box>
  </Box>
)
