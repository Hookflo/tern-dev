# tern-dev

Zero-storage local webhook tunnel. No account. No ngrok. No data leaves your machine.

```bash
npx @hookflo/tern-dev --port 3000
```

## What you get

- Public relay tunnel URL for webhook providers
- Live event log dashboard at `http://localhost:2019`
- Failed-event filtering (DLQ-style workflow)
- Replay any captured webhook back to localhost
- Copy request as `curl` or `fetch`

## CLI flags

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--port` | number | required | Local app port to forward requests to |
| `--path` | string | `/` | Path prefix for forwarded requests |
| `--ui-port` | number | `2019` | Dashboard HTTP port |
| `--no-ui` | boolean | `false` | Disable dashboard and browser websocket server |
| `--relay` | string | `RELAY_URL` or `wss://relay.tern.hookflo.com` | Relay websocket URL |
| `--max-events` | number | `500` | Maximum number of events kept in memory |

## Privacy

Tern DevKit stores nothing on disk, persists nothing in the cloud, and keeps all event data session-scoped in local memory.

## Self-hosting relay

Run your own relay infrastructure via [`hookflo/tern-relay`](https://github.com/hookflo/tern-relay), then point this CLI to it with `--relay`.

## License

MIT
