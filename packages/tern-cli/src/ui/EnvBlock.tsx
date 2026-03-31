import React from 'react'
import { Box, Text } from 'ink'

interface EnvBlockProps {
  vars: { key: string; description: string; required: boolean }[]
}

export const EnvBlock = ({ vars }: EnvBlockProps) => (
  <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="cyan" paddingX={1}>
    <Text bold color="cyan">Environment Variables</Text>
    <Text dimColor>Add these to your .env file:</Text>
    <Box flexDirection="column" marginTop={1}>
      {vars.map((v) => (
        <Box key={v.key}>
          <Text color={v.required ? 'yellow' : 'gray'}>
            {v.key}=<Text dimColor>{v.required ? 'required' : 'optional'}</Text>
            {'  '}<Text dimColor># {v.description}</Text>
          </Text>
        </Box>
      ))}
    </Box>
  </Box>
)
