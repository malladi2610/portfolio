# Cloudflare Visitor Tracking

This replaces the old Google Apps Script view ping with a Cloudflare Worker and D1 database.

The important limitation: this can identify a browser, session, source token, network, approximate location, referrer, and device metadata. It cannot know a real person's name unless you give each person a unique link token such as `?r=linkedin_recruiter_01` or they submit a form/login.

## Why This Approach

- Cloudflare Worker records the server-side timestamp at the edge, so the visit time is reliable.
- D1 stores exact recent visits that you can query, instead of only receiving a weak daily digest.
- Cloudflare request metadata adds country, city, timezone, colo, ASN, and organization when available.
- The browser adds a first-party visitor ID and session ID, so repeat opens from the same browser can be grouped.
- Email notifications send every non-bot visit to your verified email address.
- Optional webhook notifications can still send visits to Discord, Slack, n8n, or another webhook receiver.
- A small dashboard at `/api/visits` loads recent visits after you enter the admin token.

Cloudflare Web Analytics is useful for aggregate traffic, but it is privacy-oriented and not designed to show exact visitor-level rows. Workers Analytics Engine is good for high-volume aggregate analytics. For this portfolio use case, Worker + D1 is the most direct free/low-cost path.

## Free-Tier Fit

As of June 2026, Cloudflare's public docs list:

- Workers Free: 100,000 requests per day.
- D1 Free: 100,000 rows written per day, 5 million rows read per day, and 5 GB total storage.

That is far above normal portfolio traffic.

## Files

- `src/components/VisitorTracking.astro`: browser-side beacon.
- `src/config/site.ts`: `visitorTrackingEndpoint`.
- `cloudflare/visitor-tracker/src/index.js`: Worker API.
- `cloudflare/visitor-tracker/migrations/0001_create_visits.sql`: D1 schema.
- `cloudflare/visitor-tracker/wrangler.toml`: Worker config.

## Deploy

```bash
cd cloudflare/visitor-tracker
npx wrangler login
npx wrangler d1 create portfolio_visitor_tracking
```

Copy the returned D1 `database_id` into `cloudflare/visitor-tracker/wrangler.toml`.

```bash
npx wrangler d1 migrations apply portfolio_visitor_tracking
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put IP_HASH_SECRET
npx wrangler deploy
```

For the default `/api/visit` endpoint, the `itsmns.dev` DNS record must be proxied through Cloudflare and the Worker route in `wrangler.toml` must stay enabled.

If you prefer the `workers.dev` URL, remove the `routes` block from `wrangler.toml`, deploy, then set `visitorTrackingEndpoint` in `src/config/site.ts` to the deployed Worker URL plus `/api/visit`.

## Email Notifications

The simple setup is Cloudflare Email Routing plus a Worker `send_email` binding. Cloudflare's docs say Workers can send email to a verified Email Routing address, and the sender must be an address on the domain where Email Routing is active.

1. In Cloudflare, enable Email Routing for `itsmns.dev`.
2. Add and verify the destination email where you want notifications.
3. In `cloudflare/visitor-tracker/wrangler.toml`, replace both `your-verified-email@example.com` values with that verified destination email.
4. Keep `EMAIL_FROM` as an address on your domain, for example `notifications@itsmns.dev`.
5. Deploy the Worker.

Each non-bot visit sends an email with:

- server-side visit time
- page path and title
- source token or referrer
- approximate location
- network/ASN organization when Cloudflare provides it
- browser timezone/language
- visitor and session IDs

To stop emails temporarily without removing tracking:

```toml
EMAIL_NOTIFICATIONS = "false"
```

## Optional Webhooks

Set a webhook secret to receive a notification for each non-bot visit:

```bash
npx wrangler secret put VISIT_WEBHOOK_URL
```

For Discord, set `WEBHOOK_FORMAT = "discord"` in `cloudflare/visitor-tracker/wrangler.toml`. For Slack, n8n, or generic webhook receivers, keep `WEBHOOK_FORMAT` as `generic`.

## Query Recent Visits

Open the dashboard:

```text
https://itsmns.dev/api/visits
```

Paste `ADMIN_TOKEN` into the password field. The token stays in browser session storage and is sent as an Authorization header, not as a URL query parameter.

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://itsmns.dev/api/visits/recent?limit=25"
```

Include bot/crawler rows:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://itsmns.dev/api/visits/recent?limit=25&bots=1"
```

View a 24-hour summary:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://itsmns.dev/api/visits/summary?hours=24"
```

## Link Tokens

Use link tokens when you want to know which shared link was opened:

```text
https://itsmns.dev/?r=linkedin_dm_2026_06_01
https://itsmns.dev/blog/n8n_pipeline/?r=resume_qr_code
https://itsmns.dev/contact/?utm_source=github_profile
```

The token is stored as `source_label`. Avoid putting sensitive names in public URLs; short private labels are enough.

## Raw IPs

Raw IP addresses are not stored by default. The Worker stores `ip_hash`, which is enough to group visits from the same network without keeping the original IP. If you really need raw IPs, set `STORE_RAW_IP = "true"` in `wrangler.toml` before deploying.

## Cloudflare References

- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- D1 pricing and free limits: https://developers.cloudflare.com/d1/platform/pricing/
- Worker request metadata: https://developers.cloudflare.com/workers/runtime-apis/request/
- Send emails from Workers: https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
