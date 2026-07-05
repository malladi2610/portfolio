# Google Apps Script Page-view Digest

The portfolio sends a small page-view event to Google Apps Script. Apps Script records accepted events in Google Sheets and sends one daily email with:

- Total page views since the previous successful digest.
- View totals grouped by page.
- Each visit's Amsterdam-local time and page.

The system does not identify visitors and does not collect IP addresses, user agents, locations, screen details, referrers, or tracking parameters.

## Files

- `src/components/ViewPing.astro`: browser beacon.
- `src/config/site.ts`: deployed Apps Script `/exec` URL.
- `apps-script/visitor-notifications/Code.gs`: Apps Script implementation.
- `apps-script/visitor-notifications/appsscript.json`: Apps Script manifest.

## Find the old Sheet and Apps Script project

The historical deployment URL currently configured in `src/config/site.ts` is:

```text
https://script.google.com/macros/s/AKfycbxfae-l73JOKDiozVDgvcdai_7FkDHh0cznCAT3-TNLDsF4QZIiZzyRAniv0BjwRkJU/exec
```

The old code used `SpreadsheetApp.getActive()`. That strongly suggests it was attached to a Google Sheet.

1. Open [Google Drive](https://drive.google.com/drive/my-drive) using the Google account that originally received the notifications.
2. Search for `Portfolio Views`.
3. Also search for spreadsheets containing `Views`, then check Recent and Trash.
4. Open each likely Sheet and select **Extensions → Apps Script**.
5. In Apps Script, open **Deploy → Manage deployments**.
6. Compare its Web App URL with the historical URL above. The deployment ID is the text between `/s/` and `/exec`.
7. Also open the [Apps Script dashboard](https://script.google.com/home/my), inspect likely projects, and compare their managed-deployment URLs.

When the correct Sheet is open, its URL has this form:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Copy the value between `/d/` and `/edit`; it becomes the `SPREADSHEET_ID` Script Property.

If the old project cannot be found, create a new Google Sheet and Apps Script project. Deploying a new project produces a new `/exec` URL, which must replace `viewPingUrl` in `src/config/site.ts`.

## Install or update the Apps Script

1. Open the correct Sheet.
2. Select **Extensions → Apps Script**.
3. Replace the editor's `Code.gs` with `apps-script/visitor-notifications/Code.gs`.
4. In Apps Script Project Settings, enable **Show "appsscript.json" manifest file in editor**.
5. Replace the manifest with `apps-script/visitor-notifications/appsscript.json`.
6. In **Project Settings → Script Properties**, add:

| Property | Value |
| --- | --- |
| `SPREADSHEET_ID` | ID copied from the Google Sheet URL |
| `SHEET_NAME` | `Page Views` |
| `NOTIFICATION_EMAIL` | Email address that should receive the digest |
| `TIMEZONE` | `Europe/Amsterdam` |
| `DIGEST_HOUR` | `20` |
| `DEDUPLICATION_SECONDS` | `120` |

Use `Page Views` as a new sheet tab name even if the old workbook contains a tab named `Views`. The script refuses to overwrite a tab with incompatible historical columns.

## Initialize and test the Sheet without email

1. Select `setup` in the Apps Script function menu.
2. Click **Run**.
3. Approve the requested Google Sheets, mail-send, and trigger-management permissions.
4. Confirm that a `Page Views` tab exists with these columns:
   - Visit Time
   - Page
   - Page Title
   - Digest Status
5. Select `testRecordSampleVisit` and click **Run**.
6. Confirm that one row appears with:
   - The current Amsterdam-local time.
   - `/test/sample`
   - `Apps Script sample visit`
   - `PENDING`

`testRecordSampleVisit` never sends email. Running it again within two minutes may return `duplicate`; wait two minutes before retrying.

Apps Script creates the authoritative visit time with `new Date()`. It does not accept a browser timestamp. The Sheet timezone is set to `Europe/Amsterdam`, and digest details use `yyyy-MM-dd HH:mm:ss z`, so the email shows CET or CEST instead of UTC.

## Update the existing Web App deployment

1. Open **Deploy → Manage deployments**.
2. Select the deployment matching the historical `/exec` URL.
3. Click the edit pencil.
4. Select **New version**.
5. Confirm:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**.
7. Confirm that its `/exec` URL still matches `viewPingUrl` in `src/config/site.ts`.

If **Anyone** is unavailable, a Google Workspace administrator may be restricting anonymous Web Apps. Use an account that permits anonymous deployment or ask the administrator to allow it.

The browser uses `sendBeacon()` and a `text/plain`, `no-cors` fallback. A browser cannot inspect the Web App response, so verification must be done in the Sheet and Apps Script execution history.

## Install the daily digest

1. Select `installDailyDigestTrigger`.
2. Click **Run** once.
3. Open the Apps Script **Triggers** page.
4. Confirm there is exactly one daily trigger for `sendDailyDigest`.

With `DIGEST_HOUR=20`, Google normally runs the digest at a stable time between 20:00 and 21:00 Amsterdam time. Time-driven triggers are not guaranteed to run at exactly 20:00.

The digest includes every `PENDING` row. Rows change to `SENT` only after `MailApp.sendEmail()` succeeds. If email delivery throws an error, rows remain `PENDING` and the next digest retries them.

## Test email only after approval

Do not run this step until a live notification test is approved.

1. Select `testNotificationEmail`.
2. Click **Run**.
3. Confirm that `NOTIFICATION_EMAIL` receives a message titled `Portfolio digest test`.
4. Check Spam if it does not appear.

To test a real digest later, leave at least one row as `PENDING`, select `sendDailyDigest`, and run it manually. Confirm the message arrives and the row changes to `SENT`.

## Confirm website events

After the updated Web App and website are deployed:

1. Open the production website, not localhost.
2. Open one page once.
3. Refresh the Sheet after several seconds.
4. Confirm a new `PENDING` row appears with the correct Amsterdam-local time and page.
5. Reloading the same page from the same browser within two minutes should not create another row.

## Quotas

Apps Script quotas can change. At the time this implementation was prepared:

- Consumer Gmail accounts can send to 100 recipients per day through MailApp.
- Google Workspace accounts can send to 1,500 recipients per day.
- Script runtime is limited to six minutes per execution.
- Simultaneous executions are limited, which is why Sheet operations use `LockService`.

This implementation sends to one recipient once daily, so normal portfolio traffic should remain far below the mail quota. Current limits are documented in [Google Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).

## Troubleshooting

### No Sheet row

- Confirm the production site is using the correct `/exec` URL.
- Confirm the Web App is deployed as **Execute as me** and accessible to **Anyone**.
- Open Apps Script **Executions** and inspect the latest `doPost` run.
- Verify all Script Properties are spelled exactly as documented.
- Run `setup()` again.
- If the log reports incompatible headers, set `SHEET_NAME` to a new tab name such as `Page Views`.
- Ensure the edited code was published as a new deployment version; saving code alone does not update a versioned Web App.

### Wrong time

- Confirm `TIMEZONE` is `Europe/Amsterdam`.
- Confirm Apps Script Project Settings use `Europe/Amsterdam`.
- Confirm the Google Sheet timezone is `Europe/Amsterdam` under **File → Settings**.
- Run `setup()` again after correcting the property.

### No digest email

- Confirm pending rows exist.
- Confirm `NOTIFICATION_EMAIL` is correct.
- Run `testNotificationEmail` only when a live test is approved.
- Check Spam and the Apps Script **Executions** log.
- Check the trigger owner: installable triggers run as the Google account that created them.
- Check MailApp daily quota.

### Duplicate or missing reload rows

The same browser opening the same page again within 120 seconds is intentionally suppressed. Change `DEDUPLICATION_SECONDS` if a different window is needed.

## Repository verification

```bash
npm run test:tracking
npm run build
```

The first command builds the generated site, executes its browser tracker in a controlled VM, and tests Apps Script behavior with in-memory Google service substitutes. It does not contact Google or send email.
