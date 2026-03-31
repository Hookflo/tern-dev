import React from 'react'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'

interface Item { label: string; value: string }

interface Props {
  question: string
  items: Item[]
  onSelect: (item: Item) => void
}

export const SelectPrompt = ({ question, items, onSelect }: Props) => (
  <Box flexDirection="column">
    <Text color="cyan">◆  {question}</Text>
    <SelectInput items={items} onSelect={onSelect} />
  </Box>
)
