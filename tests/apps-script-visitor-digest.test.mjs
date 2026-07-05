import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(
  repositoryRoot,
  "apps-script",
  "visitor-notifications",
  "Code.gs"
);
const scriptExists = fs.existsSync(scriptPath);

function createRange(state, row, column, rowCount = 1, columnCount = 1) {
  return {
    getValues() {
      return Array.from({ length: rowCount }, (_, rowOffset) =>
        Array.from(
          { length: columnCount },
          (_, columnOffset) => state.rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
        )
      );
    },
    setNumberFormat(format) {
      state.numberFormat = format;
      return this;
    },
    setValue(value) {
      return this.setValues([[value]]);
    },
    setValues(values) {
      values.forEach((valuesRow, rowOffset) => {
        const targetIndex = row - 1 + rowOffset;
        state.rows[targetIndex] ??= [];

        valuesRow.forEach((value, columnOffset) => {
          state.rows[targetIndex][column - 1 + columnOffset] = value;
        });
      });
      return this;
    }
  };
}

function createHarness({ mailFailure = false } = {}) {
  assert.ok(scriptExists, "Apps Script source must exist before it can be loaded");

  const state = {
    cache: new Map(),
    errors: [],
    lock: { releaseCount: 0, waitCount: 0 },
    mailFailure,
    messages: [],
    numberFormat: "",
    rows: [],
    timezone: "",
    triggers: []
  };

  const sheet = {
    appendRow(row) {
      state.rows.push([...row]);
      return this;
    },
    getDataRange() {
      const width = Math.max(4, ...state.rows.map((row) => row.length));
      return createRange(state, 1, 1, state.rows.length, width);
    },
    getLastRow() {
      return state.rows.length;
    },
    getRange(row, column, rowCount, columnCount) {
      return createRange(state, row, column, rowCount, columnCount);
    },
    setFrozenRows(count) {
      state.frozenRows = count;
      return this;
    }
  };

  const spreadsheet = {
    getSheetByName() {
      return sheet;
    },
    insertSheet() {
      return sheet;
    },
    setSpreadsheetTimeZone(timezone) {
      state.timezone = timezone;
      return this;
    }
  };

  const properties = {
    DEDUPLICATION_SECONDS: "120",
    DIGEST_HOUR: "20",
    NOTIFICATION_EMAIL: "owner@example.com",
    SHEET_NAME: "Views",
    SPREADSHEET_ID: "spreadsheet-id",
    TIMEZONE: "Europe/Amsterdam"
  };

  const context = {
    CacheService: {
      getScriptCache() {
        return {
          get(key) {
            return state.cache.get(key) ?? null;
          },
          put(key, value, seconds) {
            state.cache.set(key, value);
            state.cacheSeconds = seconds;
          }
        };
      }
    },
    console: {
      error(...args) {
        state.errors.push(args);
      },
      log() {}
    },
    ContentService: {
      MimeType: { TEXT: "text/plain" },
      createTextOutput(text) {
        return {
          mimeType: "",
          text,
          getContent() {
            return this.text;
          },
          setMimeType(mimeType) {
            this.mimeType = mimeType;
            return this;
          }
        };
      }
    },
    Date,
    JSON,
    LockService: {
      getScriptLock() {
        return {
          releaseLock() {
            state.lock.releaseCount += 1;
          },
          waitLock() {
            state.lock.waitCount += 1;
          }
        };
      }
    },
    MailApp: {
      sendEmail(message) {
        if (state.mailFailure) {
          throw new Error("mail unavailable");
        }
        state.messages.push(message);
      }
    },
    Math,
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperties() {
            return { ...properties };
          }
        };
      }
    },
    ScriptApp: {
      getProjectTriggers() {
        return state.triggers;
      },
      deleteTrigger(trigger) {
        state.triggers = state.triggers.filter((candidate) => candidate !== trigger);
      },
      newTrigger(handler) {
        const draft = { handler };

        return {
          atHour(hour) {
            draft.hour = hour;
            return this;
          },
          create() {
            const trigger = {
              ...draft,
              getHandlerFunction() {
                return handler;
              }
            };
            state.triggers.push(trigger);
            return trigger;
          },
          everyDays(days) {
            draft.days = days;
            return this;
          },
          inTimezone(timezone) {
            draft.timezone = timezone;
            return this;
          },
          timeBased() {
            return this;
          }
        };
      }
    },
    SpreadsheetApp: {
      openById() {
        return spreadsheet;
      }
    },
    String,
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      base64EncodeWebSafe(bytes) {
        return Buffer.from(bytes.map((byte) => (byte < 0 ? byte + 256 : byte))).toString(
          "base64url"
        );
      },
      computeDigest(_algorithm, value) {
        return [...createHash("sha256").update(value).digest()].map((byte) =>
          byte > 127 ? byte - 256 : byte
        );
      },
      formatDate(date) {
        return `LOCAL:${date.toISOString()}`;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(scriptPath, "utf8"), context, { filename: scriptPath });

  return { context, properties, sheet, state };
}

function post(context, payload) {
  const contents = JSON.stringify(payload);
  return context.doPost({ postData: { contents, length: contents.length } });
}

test("Apps Script visitor digest source exists", () => {
  assert.ok(scriptExists, "apps-script/visitor-notifications/Code.gs is missing");
});

test(
  "doPost records a validated visit with a server timestamp under a script lock",
  { skip: !scriptExists },
  () => {
    const { context, state } = createHarness();
    const response = post(context, {
      dedupeId: "11111111-2222-4333-8444-555555555555",
      path: "/blog/example",
      title: "Example"
    });

    assert.equal(response.text, "ok");
    assert.equal(state.rows.length, 2);
    assert.deepEqual(state.rows[0], ["Visit Time", "Page", "Page Title", "Digest Status"]);
    assert.equal(state.rows[1][0] instanceof Date, true);
    assert.equal(state.rows[1][1], "/blog/example");
    assert.equal(state.rows[1][2], "Example");
    assert.equal(state.rows[1][3], "PENDING");
    assert.equal(state.lock.waitCount, 1);
    assert.equal(state.lock.releaseCount, 1);
    assert.equal(state.cacheSeconds, 120);
  }
);

test(
  "doPost suppresses a duplicate browser and page within the configured window",
  { skip: !scriptExists },
  () => {
    const { context, state } = createHarness();
    const payload = {
      dedupeId: "11111111-2222-4333-8444-555555555555",
      path: "/blog/example",
      title: "Example"
    };

    assert.equal(post(context, payload).text, "ok");
    assert.equal(post(context, payload).text, "duplicate");
    assert.equal(state.rows.length, 2);
    assert.equal(state.lock.waitCount, 2);
    assert.equal(state.lock.releaseCount, 2);
  }
);

test(
  "doPost rejects malformed paths without writing to the Sheet",
  { skip: !scriptExists },
  () => {
    const { context, state } = createHarness();
    const response = post(context, {
      dedupeId: "11111111-2222-4333-8444-555555555555",
      path: "https://malicious.example/",
      title: "Invalid"
    });

    assert.equal(response.text, "invalid");
    assert.equal(state.rows.length, 0);
    assert.equal(state.lock.waitCount, 0);
  }
);

test(
  "doPost removes control characters and truncates long page titles",
  { skip: !scriptExists },
  () => {
    const { context, state } = createHarness();
    const response = post(context, {
      dedupeId: "11111111-2222-4333-8444-555555555555",
      path: "/",
      title: `Example\u0000${"x".repeat(250)}`
    });

    assert.equal(response.text, "ok");
    assert.equal(state.rows[1][2].includes("\u0000"), false);
    assert.equal(state.rows[1][2].length, 200);
  }
);

test(
  "sendDailyDigest groups pending page views and marks them sent after email succeeds",
  { skip: !scriptExists },
  () => {
    const { context, state } = createHarness();
    post(context, {
      dedupeId: "11111111-2222-4333-8444-555555555555",
      path: "/blog/example",
      title: "Example"
    });
    post(context, {
      dedupeId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      path: "/blog/example",
      title: "Example"
    });

    assert.equal(context.sendDailyDigest(), "sent");
    assert.equal(state.messages.length, 1);
    assert.match(state.messages[0].subject, /2 page views/);
    assert.match(state.messages[0].body, /\/blog\/example: 2/);
    assert.match(state.messages[0].body, /LOCAL:/);
    assert.deepEqual(
      state.rows.slice(1).map((row) => row[3]),
      ["SENT", "SENT"]
    );
  }
);

test(
  "sendDailyDigest leaves rows pending when email delivery fails",
  { skip: !scriptExists },
  () => {
    const { context, state } = createHarness({ mailFailure: true });
    post(context, {
      dedupeId: "11111111-2222-4333-8444-555555555555",
      path: "/",
      title: "Home"
    });

    assert.equal(context.sendDailyDigest(), "failed");
    assert.deepEqual(
      state.rows.slice(1).map((row) => row[3]),
      ["PENDING"]
    );
    assert.equal(state.errors.length, 1);
  }
);

test(
  "setup initializes Amsterdam time and trigger installation stays idempotent",
  { skip: !scriptExists },
  () => {
    const { context, state } = createHarness();

    assert.equal(context.setup(), "ready");
    assert.equal(state.timezone, "Europe/Amsterdam");
    assert.equal(state.numberFormat, "yyyy-mm-dd hh:mm:ss");

    context.installDailyDigestTrigger();
    context.installDailyDigestTrigger();

    assert.equal(state.triggers.length, 1);
    assert.equal(state.triggers[0].handler, "sendDailyDigest");
    assert.equal(state.triggers[0].hour, 20);
    assert.equal(state.triggers[0].days, 1);
    assert.equal(state.triggers[0].timezone, "Europe/Amsterdam");
  }
);

test(
  "sample visit helper records a row without sending email",
  { skip: !scriptExists },
  () => {
    const { context, state } = createHarness();

    assert.equal(context.testRecordSampleVisit(), "ok");
    assert.equal(state.rows.length, 2);
    assert.equal(state.rows[1][1], "/test/sample");
    assert.equal(state.messages.length, 0);
    assert.equal(typeof context.testNotificationEmail, "function");
  }
);
