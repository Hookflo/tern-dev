import React from 'react'
import { Box, Text } from 'ink'

interface Props {
  filePath: string
  envKeys: string[]
  framework: string
}

export const Complete = ({ filePath, envKeys, framework }: Props) => (
  <Box flexDirection="column" marginTop={1}>
    <Text color="green">✓  Created <Text bold>{filePath}</Text></Text>

    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>  Add to your .env:</Text>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={0}
        marginTop={1}
        marginLeft={2}
      >
        {envKeys.map((k) => (
          <Text key={k} color="yellow">{k}=</Text>
        ))}
      </Box>
    </Box>

    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>  next steps:</Text>
      <Text>  1. fill in your .env values above</Text>
      <Text>  2. <Text color="cyan" bold>npm run dev</Text></Text>
      <Text dimColor>     (or wrangler dev for Cloudflare)</Text>
      <Text dimColor>  framework: {framework}</Text>
    </Box>
  </Box>
)
