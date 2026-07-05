import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builtHomePage = fs.readFileSync(path.join(repositoryRoot, "dist", "index.html"), "utf8");
const scripts = [...builtHomePage.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(
  (match) => match[1]
);
const trackingScript = scripts.find((script) => script.includes("portfolio_view_dedupe_id"));

function runTrackingScript({ hostname = "itsmns.dev", beaconResult = true } = {}) {
  assert.ok(trackingScript, "generated ViewPing script was not found");

  const beacons = [];
  const fetches = [];
  const storage = new Map();
  const localStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    }
  };

  class FakeBlob {
    constructor(parts, options) {
      this.body = parts.join("");
      this.type = options.type;
    }
  }

  const context = {
    Blob: FakeBlob,
    crypto: { randomUUID: () => "11111111-2222-4333-8444-555555555555" },
    document: { title: "Example" },
    fetch(url, options) {
      fetches.push({ url, options });
      return Promise.resolve({ ok: true });
    },
    navigator: {
      sendBeacon(url, body) {
        beacons.push({ url, body });
        return beaconResult;
      }
    },
    window: {
      localStorage,
      location: {
        hostname,
        pathname: "/blog/example",
        search: "?ignored=true"
      }
    }
  };

  vm.runInNewContext(trackingScript, context);
  return { beacons, fetches };
}

test("generated production script sends only the minimal page-view payload", () => {
  const { beacons, fetches } = runTrackingScript();

  assert.equal(beacons.length, 1);
  assert.equal(fetches.length, 0);
  assert.equal(
    beacons[0].url,
    "https://script.google.com/macros/s/AKfycbxfae-l73JOKDiozVDgvcdai_7FkDHh0cznCAT3-TNLDsF4QZIiZzyRAniv0BjwRkJU/exec"
  );
  assert.equal(beacons[0].body.type, "text/plain;charset=UTF-8");

  const payload = JSON.parse(beacons[0].body.body);
  assert.equal(payload.path, "/blog/example");
  assert.equal(payload.title, "Example");
  assert.equal(payload.dedupeId, "11111111-2222-4333-8444-555555555555");
  assert.deepEqual(Object.keys(payload).sort(), ["dedupeId", "path", "title"]);
});

test("generated script skips localhost traffic", () => {
  const { beacons, fetches } = runTrackingScript({ hostname: "localhost" });

  assert.equal(beacons.length, 0);
  assert.equal(fetches.length, 0);
});

test("generated script uses a no-cors keepalive fallback when beacon queuing fails", () => {
  const { beacons, fetches } = runTrackingScript({ beaconResult: false });

  assert.equal(beacons.length, 1);
  assert.equal(fetches.length, 1);
  assert.equal(fetches[0].options.method, "POST");
  assert.equal(fetches[0].options.mode, "no-cors");
  assert.equal(fetches[0].options.keepalive, true);
  assert.equal(fetches[0].options.headers["Content-Type"], "text/plain;charset=UTF-8");
  assert.equal(JSON.parse(fetches[0].options.body).path, "/blog/example");
});
