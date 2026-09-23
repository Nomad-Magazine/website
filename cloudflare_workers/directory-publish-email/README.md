# Directory Publish Email Worker

Cloudflare Worker that handles SmartSuite webhook notifications when a company is published in the Nomad Directory, waits 30 minutes (configurable), and then triggers a webhook to Martin (Grok Bot) to send a confirmation email with a directory screenshot.

## Architecture

This worker uses **Cloudflare Durable Objects** with alarms to schedule the delayed webhook delivery. This survives Worker request time limits and provides reliable scheduling.

**Note**: This worker uses `new_sqlite_classes` migration for Durable Objects, which is required for free-plan Cloudflare accounts.

- **Webhook endpoint**: Receives POST from SmartSuite automation when `s8d891d4b4` (Send Confirmation Email) field becomes `true`
- **Idempotency**: Uses KV to prevent duplicate processing of the same record on the same day
- **Delayed webhook**: Uses Durable Object alarm to wait before sending to Martin (configurable via `DELAY_MINUTES` env var). **Currently set to 0 for testing (immediate send)**.
- **Screenshot hosting**: Temporary public hosting for email-embedded screenshots with 7-day TTL

**Note**: This worker does NOT trigger GitHub sync. Publishing and sync are handled separately via the `sf4ad525dd` (Published) field automation.

## Screenshot Hosting

### Upload Screenshot (Authenticated)

```bash
curl -X POST https://directory-publish.nomad-magazine.com/screenshot \
  -H "X-Webhook-Secret: your_secret_here" \
  -H "Content-Type: image/jpeg" \
  --data-binary @screenshot.jpg
```

Response:

```json
{
  "url": "https://directory-publish.nomad-magazine.com/screenshot/aBcDeF12"
}
```

### Get Screenshot (Public)

```bash
curl https://directory-publish.nomad-magazine.com/screenshot/aBcDeF12
```

Returns raw image bytes with correct `Content-Type` header (`image/jpeg`, `image/png`, etc.) and `Cache-Control: public, max-age=3600`.

**Authentication**: Upload requires the same `X-Webhook-Secret` or `Authorization: Bearer <secret>` used by the SmartSuite webhook endpoint.

**Storage**: Images are stored in KV with key prefix `screenshot:` and expire after 7 days.

**ID format**: 8-character alphanumeric random ID (e.g. `aBcDeF12`).

## Setup

### 1. Create KV Namespace

```bash
bunx wrangler kv namespace create PUBLISH_KV --preview=false
```

Copy the returned ID and update `wrangler.jsonc` KV binding `id` field.

### 2. Configure Secrets

Set the following secrets in Cloudflare Workers:

```bash
# SmartSuite webhook authentication (shared secret)
bunx wrangler secret put SMARTSUITE_WEBHOOK_SECRET

# Martin's webhook URL (Grok Bot routine endpoint)
bunx wrangler secret put MARTIN_WEBHOOK_URL

# Martin's webhook authentication secret (Bearer token)
bunx wrangler secret put MARTIN_WEBHOOK_SECRET
```

### 3. Deploy

Deployment is automatic when pushing to `main` branch with changes in `cloudflare_workers/` folder. The existing `.github/workflows/deploy_smart_suite_dashboard.yml` workflow has been extended to deploy this worker.

Manual deployment:

```bash
cd cloudflare_workers/directory-publish-email
bunx wrangler deploy
```

## SmartSuite Integration

### Webhook Configuration

In SmartSuite, create an automation that triggers when the `s8d891d4b4` (Send Confirmation Email) field becomes `true`:

1. **Trigger**: Record Updated
2. **Condition**: `s8d891d4b4` = `true`
3. **Action**: Send Webhook

**Webhook Settings**:
- **URL**: `https://directory-publish.nomad-magazine.com/webhook`
- **Method**: `POST`
- **Headers**:
  - `Content-Type`: `application/json`
  - `X-Webhook-Secret`: `<your SMARTSUITE_WEBHOOK_SECRET value>`
  - (Or use `Authorization: Bearer <secret>`)
- **Body**: Send the full record object (SmartSuite default JSON payload)

### Expected Payload Structure

The worker accepts flexible payload structures:

```json
{
  "record": {
    "id": "record_id_here",
    "title": "Company Name",
    "sd6842e687": "contact@company.com",
    "s16e7a9d78": "Contact Name",
    "sfca9050a8": "Alternative Name Field",
    "s8d891d4b4": true
  }
}
```

Or flat:

```json
{
  "id": "record_id_here",
  "title": "Company Name",
  "sd6842e687": "contact@company.com",
  "s16e7a9d78": "Contact Name",
  "s8d891d4b4": true
}
```

### Field ID Reference

From SmartSuite Nomad Directory table:

- `s8d891d4b4`: Send Confirmation Email (boolean) - triggers this worker
- `sd6842e687`: Contact Email (string or array)
- `s16e7a9d78`: Contact Name (first choice)
- `sfca9050a8`: Alternative Name Field (fallback)
- `title`: Company Name

**Note**: The worker does NOT require `sf4ad525dd` (Published) field to be true for sending emails. The email trigger is independent of the published status.

## Testing

### Manual Test with curl

```bash
curl -X POST https://directory-publish.nomad-magazine.com/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret_here" \
  -d '{
    "record": {
      "id": "test_record_123",
      "title": "Test Company",
      "sd6842e687": "test@example.com",
      "s16e7a9d78": "John Doe",
      "s8d891d4b4": true
    }
  }'
```

Expected response:

```json
{
  "success": true,
  "message": "Webhook scheduled",
  "record_id": "test_record_123",
  "send_after": "2025-01-15T12:30:00.000Z"
}
```

### Fast Testing (1-minute delay)

Set `DELAY_MINUTES` to `1` in `wrangler.jsonc` or as a secret:

```bash
bunx wrangler secret put DELAY_MINUTES
# Enter: 1
```

### Health Check

```bash
curl https://directory-publish.nomad-magazine.com/
```

Expected response:

```json
{
  "status": "ok",
  "service": "directory-publish-email",
  "version": "1.0.0"
}
```

## Martin Webhook Payload

After the delay (30 minutes by default), the worker sends this payload to Martin's webhook URL:

```json
{
  "event": "directory_published",
  "record_id": "abc123",
  "company_name": "Acme Corp",
  "contact_email": "john@acme.com",
  "contact_name": "John Doe",
  "directory_url": "https://nomad-magazine.com/nomad_directory/",
  "published_at": "2025-01-15T12:00:00.000Z",
  "send_after": "2025-01-15T12:30:00.000Z"
}
```

**Authentication**: The webhook includes `Authorization: Bearer <MARTIN_WEBHOOK_SECRET>` header.

Martin should:
1. Parse the payload
2. Take a screenshot of the `directory_url` (or the specific company page)
3. Send a confirmation email to `contact_email` with the screenshot and congratulations message

## Environment Variables

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `SMARTSUITE_WEBHOOK_SECRET` | Secret | Shared secret for authenticating SmartSuite webhooks | (required) |
| `MARTIN_WEBHOOK_URL` | Secret | Grok Bot webhook routine URL | (required) |
| `MARTIN_WEBHOOK_SECRET` | Secret | Bearer token for Martin webhook authentication | (required) |
| `DELAY_MINUTES` | Var | Minutes to wait before sending webhook to Martin | `0` |

## Deployment Workflow

The existing `.github/workflows/deploy_smart_suite_dashboard.yml` has been extended to deploy this worker. It now:

1. Deploys `smartsuite-dashboard` worker
2. Deploys `directory-publish-email` worker

Both deployments use the same `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `PERSONAL_ACCESS_TOKEN` secrets.

## Idempotency

The worker uses KV to track processed webhooks with a key pattern:

```
email:{record_id}:{YYYY-MM-DD}
```

If SmartSuite sends the same record twice in one day, the second webhook is skipped. Idempotency keys expire after 7 days. The key prefix is `email:` to distinguish this email trigger from the separate publishing flow.

## Troubleshooting

### Check Worker Logs

```bash
bunx wrangler tail directory-publish-email
```

### Check Durable Object State

Use Cloudflare dashboard → Workers & Pages → directory-publish-email → Durable Objects → PublishScheduler instances to inspect state.

### Verify KV Binding

```bash
bunx wrangler kv:key list --namespace-id=<your_kv_id>
```


## License

Part of Nomad Magazine website infrastructure.
