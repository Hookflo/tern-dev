import React from 'react'
import { Box, Text } from 'ink'

export const Banner = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold color="cyan">tern-dev</Text>
    <Text dimColor>webhook scaffolding · local tunnel · zero config</Text>
  </Box>
)
