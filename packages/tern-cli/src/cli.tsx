#!/usr/bin/env node
import React, { useState } from 'react'
import { render, Box, useApp } from 'ink'
import { Logo } from './ui/Logo.js'
import { SelectPrompt } from './ui/SelectPrompt.js'
import { Loading } from './ui/Spinner.js'
import { Complete } from './ui/Complete.js'
import { scaffold } from './scaffold.js'

type Step = 'platform' | 'framework' | 'loading' | 'done'

const PLATFORMS = [
  { label: 'Stripe', value: 'stripe' },
  { label: 'GitHub', value: 'github' },
  { label: 'Clerk', value: 'clerk' },
  { label: 'Dodo Payments', value: 'dodopayments' },
  { label: 'Shopify', value: 'shopify' },
  { label: 'Polar', value: 'polar' },
  { label: 'Other', value: 'other' },
]

const FRAMEWORKS = [
  { label: 'Hono', value: 'hono' },
  { label: 'Next.js', value: 'nextjs' },
  { label: 'Cloudflare Workers', value: 'cloudflare' },
  { label: 'Express', value: 'express' },
]

interface Result {
  filePath: string
  envKeys: string[]
}

const App = () => {
  const { exit } = useApp()
  const [step, setStep] = useState<Step>('platform')
  const [platform, setPlatform] = useState('')
  const [framework, setFramework] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const handlePlatform = ({ value }: { value: string }) => {
    setPlatform(value)
    setStep('framework')
  }

  const handleFramework = async ({ value }: { value: string }) => {
    setFramework(value)
    setStep('loading')
    const res = await scaffold({ platform, framework: value })
    setResult(res)
    setStep('done')
    setTimeout(() => exit(), 100)
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Logo />
      {step === 'platform' && (
        <SelectPrompt
          question="Which platform are you integrating?"
          items={PLATFORMS}
          onSelect={handlePlatform}
        />
      )}
      {step === 'framework' && (
        <SelectPrompt
          question="Which framework?"
          items={FRAMEWORKS}
          onSelect={handleFramework}
        />
      )}
      {step === 'loading' && <Loading label="Setting up your webhook handler..." />}
      {step === 'done' && result && (
        <Complete filePath={result.filePath} envKeys={result.envKeys} framework={framework} />
      )}
    </Box>
  )
}

render(<App />)
