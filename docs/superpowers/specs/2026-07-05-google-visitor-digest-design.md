# Google Visitor Digest Design

## Goal

Restore the simple Google-based visitor notification system: record legitimate portfolio page opens in Google Sheets and send one reliable daily email showing how many pages were viewed, which pages were viewed, and the Amsterdam-local time of each view.

## Scope

The website will send only the page path, page title, and an anonymous short-lived deduplication value. The system will not collect visitor identity, screen details, browser language, timezone, referrer, user agent, location, IP address, or campaign data. It will not provide a real-time dashboard or immediate per-visit email.

## Website behavior

`src/components/ViewPing.astro` will replace `VisitorTracking.astro`.

The component will:

- Do nothing on `localhost`, `127.0.0.1`, or `::1`.
- Send the current page path and title to the configured Google Apps Script Web App.
- Use `navigator.sendBeacon()` with a `text/plain` JSON body.
- Fall back to a `text/plain`, `no-cors`, keepalive `fetch()` request if beacon queuing fails.
- Create an anonymous browser value used only to suppress another view of the same page for two minutes.
- Never block page rendering or expose tracking errors to visitors.

## Apps Script behavior

The repository will contain the Apps Script source and manifest under `apps-script/visitor-notifications/`.

`doPost(e)` will:

1. Parse a size-limited JSON payload.
2. Validate and truncate the page path, page title, and deduplication value.
3. Reject malformed requests without writing a row.
4. Create the authoritative visit time with `new Date()` on the Apps Script server.
5. Use a script lock around deduplication and Google Sheet writes.
6. Suppress an identical browser-and-page event received within two minutes.
7. Append accepted visits to the configured Sheet.
8. Return a small text response without requiring the browser to read it.

The Sheet will contain:

- Visit Time
- Page
- Page Title
- Digest Status

The spreadsheet timezone and all displayed timestamps will be `Europe/Amsterdam`. Visit times will be formatted as `yyyy-MM-dd HH:mm:ss z`, producing CET or CEST as appropriate. Browser-supplied timestamps will not be accepted.

## Daily email

An installable trigger will run `sendDailyDigest()` once daily in the 20:00 Amsterdam trigger window. Google may execute an hourly trigger at any stable time between 20:00 and 21:00.

The digest will include:

- The number of pending page views.
- A count grouped by page.
- A chronological list of Amsterdam-local visit times and pages.

Rows will be marked as sent only after `MailApp.sendEmail()` succeeds. If sending fails, the function will log the error and leave rows pending so the next run can retry them. If no visits are pending, no email will be sent.

## Configuration

These values will be stored in Apps Script Properties rather than source code:

- `SPREADSHEET_ID`
- `SHEET_NAME`
- `NOTIFICATION_EMAIL`
- `TIMEZONE` (`Europe/Amsterdam`)
- `DIGEST_HOUR` (`20`)
- `DEDUPLICATION_SECONDS` (`120`)

The project will include setup helpers to initialize the Sheet, set its timezone, and install exactly one daily digest trigger.

## Testing

The repository will include:

- A Node test that builds the Astro site and validates the generated tracking script.
- Checks that local development hosts do not send events.
- Checks that the production script uses beacon and the no-CORS fallback.
- An Apps Script test function that writes a sample visit without sending email.
- A separate notification test function that will not be run without explicit approval.

Verification will include `npm run build`, the focused tracking test, Apps Script source checks, and a review of the final diff.

## Migration and cleanup

The frontend will switch from the Cloudflare Worker endpoint to the existing Google Apps Script Web App URL. Documentation will explain how to locate the historical Apps Script project and its bound or configured Sheet in Google Drive and Apps Script.

After the Google implementation and repository tests pass, all Cloudflare visitor-tracking source, D1 migration, Wrangler configuration, and Cloudflare-specific documentation will be removed from the repository. This repository cleanup does not delete or modify the deployed Cloudflare Worker or D1 database.

No deployment, live page-view request, notification email, push, or external Cloudflare resource change will occur without explicit user approval.
