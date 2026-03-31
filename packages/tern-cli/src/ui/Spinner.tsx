import React from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'

export const Loading = ({ label }: { label: string }) => (
  <Box>
    <Text color="cyan"><Spinner type="dots" /></Text>
    <Text>  {label}</Text>
  </Box>
)
