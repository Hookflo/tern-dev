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
Tunnel URL: https://abc123.relay.tern.hookflo.com
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
| `--path` | `/` | Path prefix on local server |
| `--ui-port` | `2019` | Dashboard port |
| `--no-ui` | false | Disable dashboard |
| `--relay` | `wss://tern-relay.hookflo-tern.workers.dev` | Custom relay URL (for self-hosting) |
| `--max-events` | `500` | Events kept in memory |
| `--ttl` | unset | Auto-kill session after N minutes |
| `--rate-limit` | unset | Max incoming requests/min; excess returns 429 |
| `--allow-ip` | unset | Comma-separated allowlist of IP/CIDR ranges |
| `--block-paths` | unset | Comma-separated blocked path prefixes |
| `--block-methods` | unset | Comma-separated blocked methods |
| `--block-headers` | unset | Comma-separated `name:glob` block rules (supports `*`) |
| `--log` | unset | Append request audit lines to a file |
| `--local-cert` | unset | TLS certificate path for local forwarding |
| `--local-key` | unset | TLS private key path for local forwarding |

## Configuration

tern-dev also supports loading config from `tern.config.json` (or `.ternrc.json`) by searching from your current directory upward.

Priority order is:

1. CLI flags
2. `tern.config.json`
3. built-in defaults

Example `tern.config.json`:

```json
{
  "$schema": "./tern-config.schema.json",
  "port": 3000,
  "path": "/webhooks",
  "uiPort": 2019,
  "noUi": false,
  "relay": "wss://tern-relay.hookflo-tern.workers.dev",
  "maxEvents": 500,
  "ttl": 60,
  "rateLimit": 100,
  "allowIp": ["54.187.174.169", "192.30.252.0/22"],
  "block": {
    "paths": ["/admin", "/debug", "/metrics"],
    "methods": ["DELETE"],
    "headers": {
      "user-agent": "curl*"
    }
  },
  "log": "./tern-audit.log"
}
```

Notes:

- IP allowlisting supports exact IPv4 and CIDR ranges.
- Webhook signature verification (Stripe, GitHub, Clerk, etc.) belongs in your app handler; tern-dev intentionally does not do signature auth at the tunnel layer.
- The local dashboard at `localhost:2019` remains open and unauthenticated by design.
- Pressing `Ctrl+C` performs a graceful shutdown: relay WebSocket and dashboard server are closed cleanly, then tern-dev prints a final session-end confirmation.

If `--log` is set, tern-dev writes one line per completed request in this format:

```text
[<ISO timestamp>] <METHOD> <path> from <source-ip> → <status-code> <status-text> <duration>ms
```

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

- Nothing is stored to disk unless you explicitly set `--log`
- By default, traffic passes through a hosted relay on Cloudflare Workers, so Cloudflare can see in-transit traffic like any relay provider.
- For stricter trust boundaries, self-host the relay and point tern-dev to it with `--relay`.
- All event data is session-scoped in memory — cleared when you close the terminal
- The relay source is small and fully auditable

## License

MIT
