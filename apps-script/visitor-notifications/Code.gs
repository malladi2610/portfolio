var HEADERS = ["Visit Time", "Page", "Page Title", "Digest Status"];
var MAX_PAYLOAD_BYTES = 4096;
var MAX_PATH_LENGTH = 500;
var MAX_TITLE_LENGTH = 200;
var MAX_DEDUPE_ID_LENGTH = 80;

function doPost(e) {
  var payload = parsePayload_(e);

  if (!payload) {
    return textResponse_("invalid");
  }

  var path = cleanText_(payload.path, MAX_PATH_LENGTH);
  var title = cleanText_(payload.title, MAX_TITLE_LENGTH);
  var dedupeId = cleanText_(payload.dedupeId, MAX_DEDUPE_ID_LENGTH);

  if (
    !path ||
    path.charAt(0) !== "/" ||
    path.indexOf("//") === 0 ||
    !/^[A-Za-z0-9_-]{8,80}$/.test(dedupeId)
  ) {
    return textResponse_("invalid");
  }

  var config;

  try {
    config = getConfig_();
  } catch (error) {
    console.error("visitor_config_error", error);
    return textResponse_("error");
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = createDedupeKey_(dedupeId, path);

    if (cache.get(cacheKey)) {
      return textResponse_("duplicate");
    }

    var sheet = getSheet_(config);
    sheet.appendRow([new Date(), path, title, "PENDING"]);
    cache.put(cacheKey, "1", config.deduplicationSeconds);
  } catch (error) {
    console.error("visitor_record_error", error);
    return textResponse_("error");
  } finally {
    lock.releaseLock();
  }

  return textResponse_("ok");
}

function sendDailyDigest() {
  var config;

  try {
    config = getConfig_();
  } catch (error) {
    console.error("digest_config_error", error);
    return "failed";
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var sheet = getSheet_(config);
    var rows = sheet.getDataRange().getValues();
    var pending = [];

    for (var index = 1; index < rows.length; index += 1) {
      if (rows[index][3] === "PENDING") {
        pending.push({ index: index, row: rows[index] });
      }
    }

    if (pending.length === 0) {
      return "empty";
    }

    var pageCounts = {};

    pending.forEach(function (entry) {
      var page = String(entry.row[1] || "/");
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    });

    var body = buildDigestBody_(pending, pageCounts, config.timezone);
    var count = pending.length;

    try {
      MailApp.sendEmail({
        to: config.notificationEmail,
        subject:
          "Portfolio digest: " + count + " page " + (count === 1 ? "view" : "views"),
        body: body
      });
    } catch (error) {
      console.error("digest_email_error", error);
      return "failed";
    }

    pending.forEach(function (entry) {
      rows[entry.index][3] = "SENT";
    });

    var statuses = rows.slice(1).map(function (row) {
      return [row[3]];
    });
    sheet.getRange(2, 4, statuses.length, 1).setValues(statuses);
    return "sent";
  } catch (error) {
    console.error("digest_error", error);
    return "failed";
  } finally {
    lock.releaseLock();
  }
}

function setup() {
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  spreadsheet.setSpreadsheetTimeZone(config.timezone);
  getSheet_(config);
  return "ready";
}

function installDailyDigestTrigger() {
  var config = getConfig_();
  var hour = parseInt(config.digestHour, 10);

  if (!isFinite(hour) || hour < 0 || hour > 23) {
    hour = 20;
  }

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "sendDailyDigest") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("sendDailyDigest")
    .timeBased()
    .atHour(hour)
    .everyDays(1)
    .inTimezone(config.timezone)
    .create();

  return "installed";
}

function testRecordSampleVisit() {
  var contents = JSON.stringify({
    path: "/test/sample",
    title: "Apps Script sample visit",
    dedupeId: "apps-script-sample-visit"
  });

  return doPost({
    postData: {
      contents: contents,
      length: contents.length
    }
  }).getContent();
}

function testNotificationEmail() {
  var config = getConfig_();
  var now = new Date();

  MailApp.sendEmail({
    to: config.notificationEmail,
    subject: "Portfolio digest test",
    body:
      "This is a manual notification test.\n\nAmsterdam time: " +
      formatLocalTime_(now, config.timezone)
  });

  return "sent";
}

function buildDigestBody_(pending, pageCounts, timezone) {
  var lines = [
    "Portfolio page-view digest",
    "",
    "Total page views: " + pending.length,
    "",
    "Views by page:"
  ];

  Object.keys(pageCounts)
    .sort()
    .forEach(function (page) {
      lines.push(page + ": " + pageCounts[page]);
    });

  lines.push("", "Visit details (" + timezone + "):");

  pending.forEach(function (entry) {
    var time = formatLocalTime_(entry.row[0], timezone);
    var page = String(entry.row[1] || "/");
    var title = String(entry.row[2] || "");
    lines.push(time + " - " + page + (title ? " - " + title : ""));
  });

  return lines.join("\n");
}

function formatLocalTime_(date, timezone) {
  return Utilities.formatDate(new Date(date), timezone, "yyyy-MM-dd HH:mm:ss z");
}

function parsePayload_(e) {
  if (!e || !e.postData || typeof e.postData.contents !== "string") {
    return null;
  }

  var length = Number(e.postData.length || e.postData.contents.length);

  if (!isFinite(length) || length <= 0 || length > MAX_PAYLOAD_BYTES) {
    return null;
  }

  try {
    var payload = JSON.parse(e.postData.contents);
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  } catch (error) {
    return null;
  }
}

function cleanText_(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function createDedupeKey_(dedupeId, path) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    dedupeId + "\n" + path
  );
  return "view:" + Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "");
}

function getConfig_() {
  var values = PropertiesService.getScriptProperties().getProperties();
  var required = ["SPREADSHEET_ID", "SHEET_NAME", "NOTIFICATION_EMAIL"];

  required.forEach(function (key) {
    if (!cleanText_(values[key], 500)) {
      throw new Error("Missing Script Property: " + key);
    }
  });

  var deduplicationSeconds = parseInt(values.DEDUPLICATION_SECONDS || "120", 10);

  if (!isFinite(deduplicationSeconds) || deduplicationSeconds < 1 || deduplicationSeconds > 21600) {
    deduplicationSeconds = 120;
  }

  return {
    deduplicationSeconds: deduplicationSeconds,
    digestHour: cleanText_(values.DIGEST_HOUR || "20", 2),
    notificationEmail: cleanText_(values.NOTIFICATION_EMAIL, 320),
    sheetName: cleanText_(values.SHEET_NAME, 100),
    spreadsheetId: cleanText_(values.SPREADSHEET_ID, 200),
    timezone: cleanText_(values.TIMEZONE || "Europe/Amsterdam", 100)
  };
}

function getSheet_(config) {
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(config.sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(2, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
  } else {
    var existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];

    if (existingHeaders.join("\n") !== HEADERS.join("\n")) {
      throw new Error(
        'Sheet "' + config.sheetName + '" has incompatible headers; configure a new SHEET_NAME.'
      );
    }
  }

  return sheet;
}

function textResponse_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
