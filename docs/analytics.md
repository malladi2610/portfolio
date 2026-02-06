# View Notifications (Free)

This site can send a lightweight view ping to a Google Apps Script endpoint. The script records visits in a Google Sheet and sends a daily email digest.

## Setup Steps

1. Create a new Google Sheet named `Portfolio Views`.
2. Open Extensions -> Apps Script.
3. Paste the script below and deploy as a Web App.
4. Copy the Web App URL and set it in `src/config/site.ts` as `viewPingUrl`.

## Apps Script

```js
const SHEET_NAME = "Views";
const EMAIL_TO = "your-email@domain.com";

function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");
  const sheet = getSheet();
  sheet.appendRow([
    new Date(),
    data.path || "",
    data.referrer || "",
    data.ua || ""
  ]);
  return ContentService.createTextOutput("ok");
}

function getSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Timestamp", "Path", "Referrer", "User Agent"]);
  }
  return sheet;
}

function dailyDigest() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return;

  const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = rows.slice(1).filter((row) => row[0] >= lastDay);
  if (recent.length === 0) return;

  const body = recent.map((row) => `${row[0]} | ${row[1]} | ${row[2]}`).join("\n");
  MailApp.sendEmail(EMAIL_TO, "Portfolio Views - Daily Digest", body);
}
```

## Notes

- Set up a time-driven trigger in Apps Script for `dailyDigest`.
- Keep the Web App access to "Anyone" so the site can send pings.
