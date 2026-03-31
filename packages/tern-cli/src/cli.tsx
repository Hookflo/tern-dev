#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { run } from './commands/scaffold.js'
import { Banner } from './ui/Banner.js'
import { Done } from './ui/Done.js'
import { EnvBlock } from './ui/EnvBlock.js'

const banner = render(<Banner />)

run()
  .then(({ framework, routePath, port, envVar }) => {
    banner.unmount()
    render(
      <>
        <EnvBlock
          vars={[
            { key: envVar, description: 'platform webhook signing secret', required: true },
            { key: 'QSTASH_TOKEN', description: 'Upstash QStash token for queue retries', required: false },
            { key: 'QSTASH_CURRENT_SIGNING_KEY', description: 'QStash current signing key', required: false },
            { key: 'QSTASH_NEXT_SIGNING_KEY', description: 'QStash next signing key', required: false },
            { key: 'SLACK_WEBHOOK_URL', description: 'Slack alerting endpoint', required: false },
            { key: 'DISCORD_WEBHOOK_URL', description: 'Discord alerting endpoint', required: false },
            { key: 'PORT', description: 'local server port', required: false },
          ]}
        />
        <Done framework={framework} routePath={routePath} port={port} />
      </>,
    )
  })
  .catch((err: unknown) => {
    banner.unmount()
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  })
