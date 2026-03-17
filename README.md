# tern-dev

![npm version](https://img.shields.io/npm/v/%40hookflo%2Ftern-dev)
![MIT License](https://img.shields.io/badge/license-MIT-green)
![Node 18+](https://img.shields.io/badge/node-%3E%3D18-10b981)

**Local webhook tunnel. No ngrok. No account. Nothing stored.**

## Quickstart

```bash
npx @hookflo/tern-dev --port 3000
```

Output:

```text
tern  ●  https://tern-relay.hookflo-tern.workers.dev/s/abc12345 → localhost:3000
       ●  Dashboard → http://localhost:2019
```

1. Copy the tunnel URL.
2. Paste it as your webhook endpoint in Stripe/GitHub/etc (append `/webhook` or whatever path your server uses).
3. Open `http://localhost:2019` to see events arrive live.

## How it works

tern-dev opens a WebSocket to the relay server and receives a public tunnel URL. When a platform sends a webhook to that URL, the relay pipes the raw request to your machine over the WebSocket. Your local server receives it exactly as if the platform called it directly.

## CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | required | Local port to forward to |
| `--path` | `/` | Path on local server |
| `--ui-port` | `2019` | Dashboard port |
| `--no-ui` | false | Disable dashboard |
| `--relay` | hosted relay | Custom relay URL (for self-hosting) |
| `--max-events` | `500` | Events kept in memory |

## Dashboard features

- Live event log — every webhook that arrives
- Payload tab — full request body, pretty-printed JSON
- Headers tab — all request headers, signature headers highlighted
- Response tab — HTTP status, latency, response body
- DLQ — failed events (4xx/5xx) grouped for easy replay
- Replay — re-send any event to localhost with one click
- Replay all — bulk replay all failed events
- Copy as curl — get a curl command for any event
- Copy as fetch — get a fetch() snippet for any event

## Using with Tern SDK

```ts
import { WebhookVerificationService } from '@hookflo/tern'

app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    req,
    'stripe',
    process.env.STRIPE_WEBHOOK_SECRET!
  )
  if (!result.isValid) return res.status(400).json({ error: result.error })
  console.log('✅ verified:', result.payload.type)
  res.json({ received: true })
})
```

> `express.raw({ type: '*/*' })` is required. Never use `express.json()` — it re-parses the body and breaks HMAC signature verification.

## Self-hosting the relay

If you need full data isolation, run your own relay:

```bash
git clone https://github.com/hookflo/tern-relay
# follow its README to deploy to Cloudflare Workers
# then:
RELAY_URL=wss://your-relay.your-account.workers.dev \
  npx @hookflo/tern-dev --port 3000
```

## Privacy

- Nothing is stored to disk
- Nothing is sent to Hookflo servers (except through the relay, which stores nothing)
- All event data is session-scoped in memory — cleared when you close the terminal
- The relay source is small and fully auditable

## License

MIT
