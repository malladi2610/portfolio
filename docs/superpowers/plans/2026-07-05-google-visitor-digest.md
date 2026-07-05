# Google Visitor Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cloudflare visitor tracking with a minimal Google Apps Script system that records deduplicated page opens and emails one Amsterdam-time daily digest.

**Architecture:** An inline Astro component sends a small `text/plain` beacon containing page path, title, and an anonymous deduplication ID. Apps Script validates the payload, timestamps and writes it under a script lock, suppresses two-minute duplicates through Script Cache, and sends pending Sheet rows in a daily MailApp digest.

**Tech Stack:** Astro 4, browser Beacon/Fetch APIs, Node.js built-in test runner, Google Apps Script, Google Sheets, MailApp.

---

### Task 1: Browser tracking contract

**Files:**
- Create: `tests/view-ping.test.mjs`
- Create: `src/components/ViewPing.astro`
- Modify: `src/config/site.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Delete: `src/components/VisitorTracking.astro`
- Modify: `package.json`

- [ ] **Step 1: Write failing generated-script tests**

Create Node tests that run `npm run build`, extract the inline tracking script from `dist/index.html`, execute it in a VM with browser stubs, and assert:

```js
assert.equal(beacons.length, 1);
assert.equal(payload.path, "/blog/example");
assert.equal(payload.title, "Example");
assert.deepEqual(Object.keys(payload).sort(), ["dedupeId", "path", "title"]);
assert.equal(localhostBeacons.length, 0);
assert.equal(fallback.options.mode, "no-cors");
assert.equal(fallback.options.keepalive, true);
```

- [ ] **Step 2: Run the browser tests and verify RED**

Run: `node --test tests/view-ping.test.mjs`

Expected: FAIL because `ViewPing.astro` and the generated Google tracking script do not exist.

- [ ] **Step 3: Implement the minimal browser beacon**

Restore `ViewPing.astro` with:

```js
const payload = {
  path: `${window.location.pathname}${window.location.search}`,
  title: document.title,
  dedupeId: getBrowserId()
};
```

Skip local hosts, use a `text/plain` beacon first, and use a `text/plain`, `mode: "no-cors"`, `keepalive: true` fetch fallback. Restore `viewPingUrl` to the historical `/exec` URL and render `ViewPing` from `BaseLayout`.

- [ ] **Step 4: Run the browser tests and verify GREEN**

Run: `node --test tests/view-ping.test.mjs`

Expected: all browser tracking tests pass.

- [ ] **Step 5: Commit the browser contract**

```bash
git add package.json tests/view-ping.test.mjs src/components/ViewPing.astro src/components/VisitorTracking.astro src/config/site.ts src/layouts/BaseLayout.astro
git commit -m "feat: restore minimal Google view beacon"
```

### Task 2: Apps Script visit recording

**Files:**
- Create: `tests/apps-script-visitor-digest.test.mjs`
- Create: `apps-script/visitor-notifications/Code.gs`
- Create: `apps-script/visitor-notifications/appsscript.json`

- [ ] **Step 1: Write failing Apps Script recording tests**

Load `Code.gs` in a Node VM with in-memory mocks for PropertiesService, SpreadsheetApp, LockService, CacheService, ContentService, Utilities, and MailApp. Assert that:

```js
assert.equal(sheet.rows.length, 2);
assert.equal(sheet.rows[1][1], "/blog/example");
assert.equal(sheet.rows[1][2], "Example");
assert.equal(sheet.rows[1][3], "PENDING");
assert.equal(secondResponse.text, "duplicate");
assert.equal(lock.waitCount, lock.releaseCount);
```

Also assert that malformed paths are rejected and long titles are truncated.

- [ ] **Step 2: Run the Apps Script tests and verify RED**

Run: `node --test tests/apps-script-visitor-digest.test.mjs`

Expected: FAIL because `Code.gs` does not exist.

- [ ] **Step 3: Implement validation, timestamping, deduplication, and locked writes**

Implement `doPost(e)` and focused helpers with these limits:

```js
const MAX_PAYLOAD_BYTES = 4096;
const MAX_PATH_LENGTH = 500;
const MAX_TITLE_LENGTH = 200;
const MAX_DEDUPE_ID_LENGTH = 80;
```

Use `new Date()` as the only visit time, `LockService.getScriptLock().waitLock(10000)`, a SHA-256 Script Cache key, a default 120-second cache lifetime, and Sheet rows shaped as:

```js
[serverTime, path, title, "PENDING"]
```

- [ ] **Step 4: Run the recording tests and verify GREEN**

Run: `node --test tests/apps-script-visitor-digest.test.mjs`

Expected: all recording, validation, locking, and deduplication tests pass.

### Task 3: Daily digest and setup helpers

**Files:**
- Modify: `tests/apps-script-visitor-digest.test.mjs`
- Modify: `apps-script/visitor-notifications/Code.gs`
- Modify: `apps-script/visitor-notifications/appsscript.json`

- [ ] **Step 1: Add failing digest tests**

Add tests showing that two pending visits produce one grouped email:

```js
assert.match(message.subject, /2 page views/);
assert.match(message.body, /\/blog\/example: 2/);
assert.match(message.body, /LOCAL:/);
assert.deepEqual(sheet.rows.slice(1).map((row) => row[3]), ["SENT", "SENT"]);
```

Add a failure test where `MailApp.sendEmail()` throws and both statuses remain `PENDING`.

- [ ] **Step 2: Run the digest tests and verify RED**

Run: `node --test tests/apps-script-visitor-digest.test.mjs`

Expected: FAIL because `sendDailyDigest()` and setup helpers are missing.

- [ ] **Step 3: Implement digest reliability and setup**

Implement:

```js
function sendDailyDigest() {}
function setup() {}
function installDailyDigestTrigger() {}
function testRecordSampleVisit() {}
function testNotificationEmail() {}
```

The digest holds the script lock while selecting pending rows, sending one grouped MailApp message, and marking rows `SENT`. Email failure is logged and leaves rows `PENDING`. `setup()` initializes headers, applies `Europe/Amsterdam`, and formats the timestamp column. The install helper replaces only existing `sendDailyDigest` triggers and schedules hour 20 in the configured timezone. The sample-recording test never sends email.

- [ ] **Step 4: Run all Apps Script tests and verify GREEN**

Run: `node --test tests/apps-script-visitor-digest.test.mjs`

Expected: all tests pass, including retry-safe email failure behavior.

- [ ] **Step 5: Commit the Apps Script implementation**

```bash
git add tests/apps-script-visitor-digest.test.mjs apps-script/visitor-notifications
git commit -m "feat: add reliable Google visitor digest"
```

### Task 4: Documentation and Cloudflare repository cleanup

**Files:**
- Modify: `README.md`
- Create: `docs/google-apps-script-visitor-tracking.md`
- Delete: `docs/cloudflare-visitor-tracking.md`
- Delete: `cloudflare/visitor-tracker/migrations/0001_create_visits.sql`
- Delete: `cloudflare/visitor-tracker/src/index.js`
- Delete: `cloudflare/visitor-tracker/wrangler.toml`

- [ ] **Step 1: Document the complete manual workflow**

Document:

- How to search Google Drive for `Portfolio Views` and inspect recent spreadsheets.
- How to search the Apps Script dashboard for the project owning the historical deployment.
- How to open Extensions → Apps Script from candidate Sheets.
- How to set Script Properties and copy the checked-in files.
- How to run `setup()` and `testRecordSampleVisit()` without email.
- How to confirm an Amsterdam-local Sheet row.
- How to update the existing versioned `/exec` deployment.
- How to install the 20:00–21:00 daily trigger.
- How to run `testNotificationEmail()` only after explicit approval.
- Mail quotas, trigger timing, execution logs, permissions, and troubleshooting.
- The fallback of creating a new Sheet/project if the old bound project cannot be found.

- [ ] **Step 2: Remove all Cloudflare visitor-tracking repository files**

Delete the Worker source, D1 migration, Wrangler configuration, and Cloudflare visitor-tracking documentation. State in the Google documentation that this does not delete deployed Cloudflare resources.

- [ ] **Step 3: Update README**

Replace Cloudflare configuration and documentation references with `viewPingUrl` and the Google Apps Script guide.

- [ ] **Step 4: Verify no Cloudflare visitor-tracking references remain**

Run:

```bash
rg -n "VisitorTracking|visitorTrackingEndpoint|cloudflare/visitor-tracker|cloudflare-visitor-tracking" README.md src docs cloudflare
```

Expected: no matches and `cloudflare/` no longer exists.

- [ ] **Step 5: Commit documentation and cleanup**

```bash
git add README.md docs cloudflare
git commit -m "docs: replace Cloudflare visitor tracking guide"
```

### Task 5: Final verification and handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-07-05-google-visitor-digest.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test tests/view-ping.test.mjs tests/apps-script-visitor-digest.test.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Run the required production build**

Run: `npm run build`

Expected: Astro builds all pages successfully.

- [ ] **Step 3: Run repository checks**

Run:

```bash
git diff --check main...HEAD
git status --short
git diff --stat main...HEAD
git diff main...HEAD
```

Expected: no whitespace errors; only visitor-notification implementation, tests, documentation, plan/spec, and Cloudflare cleanup are changed.

- [ ] **Step 4: Mark this plan complete and commit it**

Update every checkbox to `[x]`, then:

```bash
git add docs/superpowers/plans/2026-07-05-google-visitor-digest.md
git commit -m "docs: complete Google visitor digest plan"
```

- [ ] **Step 5: Stop before external actions**

Present the diff and test evidence. Do not push, deploy, send a live notification, or delete deployed Cloudflare resources.
