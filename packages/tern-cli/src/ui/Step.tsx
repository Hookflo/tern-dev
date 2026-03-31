import React from 'react'
import { Box, Text } from 'ink'

type Status = 'pending' | 'running' | 'done' | 'error'

interface StepProps {
  label: string
  status: Status
}

const icons: Record<Status, string> = { pending: '○', running: '◆', done: '✓', error: '✗' }
const colors: Record<Status, 'gray' | 'yellow' | 'green' | 'red'> = {
  pending: 'gray', running: 'yellow', done: 'green', error: 'red',
}

export const Step = ({ label, status }: StepProps) => (
  <Box>
    <Text color={colors[status]}>{icons[status]} </Text>
    <Text>{label}</Text>
  </Box>
)
