# tern-dev

![npm version](https://img.shields.io/npm/v/%40hookflo%2Ftern-dev)
![MIT License](https://img.shields.io/badge/license-MIT-10b981)
![Node 18+](https://img.shields.io/badge/node-%3E%3D18-10b981)
![Zero Storage](https://img.shields.io/badge/storage-zero-10b981)

**Local webhook tunnel. No ngrok. No account. Nothing stored.**

Everything lives in RAM. Gone the moment you `Ctrl+C`.

---

## Quickstart

```bash
npx @hookflo/tern-dev --port 3000
```

```
  ████████╗███████╗██████╗ ███╗  ██╗
     ██║   ██╔════╝██╔══██╗████╗ ██║
     ██║   █████╗  ██████╔╝██╔██╗██║
     ██║   ██╔══╝  ██╔══██╗██║╚████║
     ██║   ███████╗██║  ██║██║ ╚███║
     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚══╝

  v0.2.1 · open source webhook tunnel

  tunnel    →  https://abc123.relay.tern.hookflo.com
  dashboard →  http://localhost:2019
  forwarding →  localhost:3000

  Ctrl+C to end session · use --ttl 60 to auto-kill

  no ttl set — tunnel runs until Ctrl+C
```

1. Paste the tunnel URL into your webhook provider (Stripe, GitHub, Sentry, etc.)
2. Open `http://localhost:2019` to see events arrive live
3. `Ctrl+C` when done — everything clears instantly

---

## Or use `--forward` for a full path

```bash
npx @hookflo/tern-dev --forward localhost:3000/api/webhooks/stripe
```

Parses port and path in one flag. No need for separate `--port` and `--path`.

---

## How it works

tern-dev opens a WebSocket to the relay server and receives a public tunnel URL. When a platform sends a webhook to that URL, the relay pipes the raw request to your machine over the WebSocket. Your local server receives it exactly as if the platform called it directly.

```
Stripe → https://abc123.relay.tern.hookflo.com
              ↓
         relay (Cloudflare Workers)
              ↓  WebSocket
         tern-dev (your machine)
              ↓  HTTP
         localhost:3000/api/webhooks
```

---

## Dashboard

Open `http://localhost:2019` after starting tern-dev.

| Feature | Description |
|---------|-------------|
| **Live event log** | Every webhook that arrives, in real time |
| **Payload tab** | Full request body, pretty-printed JSON |
| **Headers tab** | All headers, signature headers highlighted |
| **Response tab** | HTTP status, latency, response body |
| **Verify tab** | Signature verification guidance per provider |
| **Payload diff** | `Cmd+Click` any two events → git-style side-by-side comparison |
| **Headers diff** | Diff request headers between any two events |
| **Metadata** | Timestamp delta, latency diff, payload size, provider detection |
| **Ignore fields** | Exclude dynamic fields (id, timestamp) from diff |
| **DLQ** | Failed events (4xx/5xx) grouped for easy replay |
| **Replay** | Re-send any event to localhost with one click |
| **Replay all** | Bulk replay all failed events |
| **Copy as curl** | Get a curl command for any captured event |
| **Copy as fetch** | Get a fetch() snippet for any captured event |

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `↑↓` | Navigate events |
| `R` | Replay selected event |
| `C` | Copy tunnel URL |
| `D` | Open compare panel |
| `1 2 3 4` | Switch compare tabs |
| `Escape` | Close compare / deselect |

---

## CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | required | Local port to forward to |
| `--forward` | — | Full address e.g. `localhost:3000/api/webhooks` |
| `--path` | `/` | Path prefix on local server |
| `--ui-port` | `2019` | Dashboard port |
| `--no-ui` | false | Disable dashboard |
| `--relay` | `wss://tern-relay.hookflo-tern.workers.dev` | Custom relay URL |
| `--max-events` | `500` | Events kept in memory |
| `--ttl` | unset | Auto-kill session after N minutes |
| `--rate-limit` | unset | Max incoming requests/min; excess returns 429 |
| `--allow-ip` | unset | Comma-separated allowlist of IPs/CIDR ranges (IPv4) |
| `--block-paths` | unset | Comma-separated blocked path prefixes |
| `--block-methods` | unset | Comma-separated blocked HTTP methods |
| `--block-headers` | unset | Comma-separated `name:glob` block rules |
| `--log` | unset | Append audit lines to a file |
| `--local-cert` | unset | TLS cert path for local forwarding |
| `--local-key` | unset | TLS key path for local forwarding |
| `--version` | — | Print version |
| `--help` | — | Print help |

---

## Configuration file

tern-dev searches for `tern.config.json` or `.ternrc.json` from your current directory upward.

**Priority:** CLI flags > `tern.config.json` > built-in defaults

```json
{
  "$schema": "./tern-config.schema.json",
  "port": 3000,
  "path": "/webhooks",
  "uiPort": 2019,
  "relay": "wss://tern-relay.hookflo-tern.workers.dev",
  "maxEvents": 500,
  "ttl": 60,
  "rateLimit": 100,
  "allowIp": ["54.187.174.169", "192.30.252.0/22"],
  "block": {
    "paths": ["/admin", "/debug"],
    "methods": ["DELETE"],
    "headers": { "user-agent": "curl*" }
  },
  "log": "./tern-audit.log"
}
```

Add `"$schema"` for full VS Code autocomplete on all fields.

---

## Audit log

When `--log` is set, tern-dev appends one line per completed request:

```
[2025-01-15T10:23:45.123Z] POST /webhooks/stripe from 54.187.174.169 → 200 OK 45ms
```

Nothing is written to disk unless you explicitly set this flag.

---

## Signature verification

tern-dev intentionally does not verify signatures at the tunnel layer. Verification belongs in your app handler using the raw body and headers.

Use [`@hookflo/tern`](https://github.com/Hookflo/tern) for cross-platform signature verification:

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

> Always use `express.raw({ type: '*/*' })`. Never `express.json()` — it re-parses the body and breaks HMAC verification.

---

## Self-hosting the relay

For full data isolation, run your own relay:

```bash
git clone https://github.com/hookflo/tern-relay
# deploy to Cloudflare Workers — follow its README
# then point tern-dev to it:

npx @hookflo/tern-dev --port 3000 --relay wss://your-relay.your-domain.com
```

Or in `tern.config.json`:
```json
{
  "relay": "wss://your-relay.your-domain.com"
}
```

---

## Privacy

| What | Where | Persists? |
|------|-------|-----------|
| Captured events | RAM only | ❌ cleared on exit |
| Rate limit counters | RAM only | ❌ cleared on exit |
| Config | Your `tern.config.json` | ✅ your file |
| Audit log | Your log file (opt-in) | ✅ append-only |
| Transit traffic | Cloudflare Workers relay | ❌ not stored |

For stricter trust boundaries, self-host the relay — zero third-party infrastructure in your request path.

---

## Related

| Package | Description |
|---------|-------------|
| [`@hookflo/tern`](https://github.com/Hookflo/tern) | Webhook signature verification SDK |
| [`@hookflo/tern-mcp`](https://github.com/Hookflo/tern-mcp) | MCP server for AI-assisted webhook debugging |
| [`tern-relay`](https://github.com/Hookflo/tern-relay) | Self-hostable relay server (Cloudflare Workers) |

---

## License

MIT © [Hookflo](https://github.com/Hookflo)