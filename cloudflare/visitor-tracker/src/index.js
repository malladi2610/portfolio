import { EmailMessage } from "cloudflare:email";

const MAX_RECENT_LIMIT = 200;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "portfolio-visitor-tracker" }, request, env);
    }

    if (url.pathname === "/api/visit" && request.method === "POST") {
      return collectVisit(request, env, ctx);
    }

    if (url.pathname === "/api/visits" && request.method === "GET") {
      return dashboardHtml();
    }

    if (url.pathname === "/api/visits/recent" && request.method === "GET") {
      const auth = requireAdmin(request, env);
      if (auth) return auth;
      return recentVisits(request, env);
    }

    if (url.pathname === "/api/visits/summary" && request.method === "GET") {
      const auth = requireAdmin(request, env);
      if (auth) return auth;
      return visitSummary(request, env);
    }

    return json({ error: "not_found" }, request, env, 404);
  }
};

async function collectVisit(request, env, ctx) {
  if (!isAllowedIngestRequest(request, env)) {
    return json({ error: "forbidden_origin" }, request, env, 403);
  }

  const payload = await readPayload(request);
  const userAgent = clean(request.headers.get("User-Agent"), 800);
  const ip = getClientIp(request);
  const cf = request.cf || {};
  const serverTs = new Date().toISOString();
  const path = normalizePath(payload.path);
  const referrer = clean(payload.referrer, 800);
  const referrerHost = getUrlHost(referrer);
  const sourceLabel = getSourceLabel(payload, path);
  const isBot = looksLikeBot(userAgent) ? 1 : 0;
  const visit = {
    id: crypto.randomUUID(),
    serverTs,
    clientTs: clean(payload.clientTs || payload.ts, 80),
    path,
    title: clean(payload.title, 300),
    referrer,
    referrerHost,
    visitorId: clean(payload.visitorId, 80),
    sessionId: clean(payload.sessionId, 80),
    sourceLabel,
    utmSource: clean(payload.utmSource, 120),
    utmMedium: clean(payload.utmMedium, 120),
    utmCampaign: clean(payload.utmCampaign, 160),
    userAgent,
    browserLanguage: clean(payload.browserLanguage || payload.language, 50),
    browserTimezone: clean(payload.browserTimezone || payload.timezone, 80),
    screen: clean(payload.screen, 40),
    viewport: clean(payload.viewport, 40),
    ipHash: await hashIp(ip, env),
    ip: env.STORE_RAW_IP === "true" ? ip : "",
    country: clean(cf.country, 8),
    region: clean(cf.region, 120),
    city: clean(cf.city, 120),
    postalCode: clean(cf.postalCode, 40),
    timezone: clean(cf.timezone, 80),
    latitude: clean(cf.latitude, 40),
    longitude: clean(cf.longitude, 40),
    colo: clean(cf.colo, 20),
    asn: Number.isFinite(cf.asn) ? cf.asn : null,
    asOrganization: clean(cf.asOrganization, 200),
    cfRay: clean(request.headers.get("CF-Ray"), 120),
    isBot
  };

  await env.DB.prepare(
    `INSERT INTO visits (
      id, server_ts, client_ts, path, title, referrer, referrer_host,
      visitor_id, session_id, source_label, utm_source, utm_medium, utm_campaign,
      user_agent, browser_language, browser_timezone, screen, viewport,
      ip_hash, ip, country, region, city, postal_code, timezone, latitude,
      longitude, colo, asn, as_organization, cf_ray, is_bot
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      visit.id,
      visit.serverTs,
      visit.clientTs,
      visit.path,
      visit.title,
      visit.referrer,
      visit.referrerHost,
      visit.visitorId,
      visit.sessionId,
      visit.sourceLabel,
      visit.utmSource,
      visit.utmMedium,
      visit.utmCampaign,
      visit.userAgent,
      visit.browserLanguage,
      visit.browserTimezone,
      visit.screen,
      visit.viewport,
      visit.ipHash,
      visit.ip,
      visit.country,
      visit.region,
      visit.city,
      visit.postalCode,
      visit.timezone,
      visit.latitude,
      visit.longitude,
      visit.colo,
      visit.asn,
      visit.asOrganization,
      visit.cfRay,
      visit.isBot
    )
    .run();

  if (!visit.isBot) {
    if (env.NOTIFICATION_EMAIL && env.EMAIL_NOTIFICATIONS !== "false") {
      ctx.waitUntil(sendVisitEmail(env, visit));
    }

    if (env.VISIT_WEBHOOK_URL) {
      ctx.waitUntil(sendVisitWebhook(env, visit));
    }
  }

  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

async function recentVisits(request, env) {
  const url = new URL(request.url);
  const limit = clampNumber(url.searchParams.get("limit"), 50, 1, MAX_RECENT_LIMIT);
  const includeBots = url.searchParams.get("bots") === "1";
  const botClause = includeBots ? "" : "WHERE is_bot = 0";
  const rows = await env.DB.prepare(
    `SELECT
      id, server_ts, client_ts, path, title, referrer, referrer_host,
      visitor_id, session_id, source_label, utm_source, utm_medium, utm_campaign,
      browser_language, browser_timezone, screen, viewport, ip_hash, ip,
      country, region, city, timezone, latitude, longitude, colo, asn,
      as_organization, cf_ray, is_bot
    FROM visits
    ${botClause}
    ORDER BY server_ts DESC
    LIMIT ${limit}`
  ).all();

  return json({ visits: rows.results || [] }, request, env);
}

async function visitSummary(request, env) {
  const url = new URL(request.url);
  const hours = clampNumber(url.searchParams.get("hours"), 24, 1, 24 * 30);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const totals = await env.DB.prepare(
    `SELECT
      COUNT(*) AS views,
      COUNT(DISTINCT visitor_id) AS browsers,
      COUNT(DISTINCT session_id) AS sessions,
      COUNT(DISTINCT ip_hash) AS networks
    FROM visits
    WHERE server_ts >= ? AND is_bot = 0`
  )
    .bind(since)
    .first();

  const topPaths = await env.DB.prepare(
    `SELECT path, COUNT(*) AS views
    FROM visits
    WHERE server_ts >= ? AND is_bot = 0
    GROUP BY path
    ORDER BY views DESC
    LIMIT 10`
  )
    .bind(since)
    .all();

  const topSources = await env.DB.prepare(
    `SELECT COALESCE(NULLIF(source_label, ''), NULLIF(referrer_host, ''), 'direct') AS source, COUNT(*) AS views
    FROM visits
    WHERE server_ts >= ? AND is_bot = 0
    GROUP BY source
    ORDER BY views DESC
    LIMIT 10`
  )
    .bind(since)
    .all();

  const topLocations = await env.DB.prepare(
    `SELECT country, city, COUNT(*) AS views
    FROM visits
    WHERE server_ts >= ? AND is_bot = 0
    GROUP BY country, city
    ORDER BY views DESC
    LIMIT 10`
  )
    .bind(since)
    .all();

  return json(
    {
      since,
      hours,
      totals,
      topPaths: topPaths.results || [],
      topSources: topSources.results || [],
      topLocations: topLocations.results || []
    },
    request,
    env
  );
}

function dashboardHtml() {
  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Portfolio Visits</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; background: #f6f7f9; color: #17202a; }
      main { width: min(1120px, calc(100% - 32px)); margin: 32px auto; }
      header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
      h1 { margin: 0; font-size: 28px; line-height: 1.1; }
      p { margin: 6px 0 0; color: #5f6b7a; }
      form { display: flex; gap: 8px; align-items: center; margin: 0 0 20px; }
      input { min-width: 280px; flex: 1; border: 1px solid #cfd6df; border-radius: 6px; padding: 10px 12px; font: inherit; background: white; color: inherit; }
      button { border: 0; border-radius: 6px; padding: 10px 14px; font: inherit; font-weight: 650; background: #1457d9; color: white; cursor: pointer; }
      button.secondary { background: #e8edf4; color: #1f2937; }
      .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
      .stat, .panel { background: white; border: 1px solid #dce2ea; border-radius: 8px; box-shadow: 0 8px 22px rgba(16, 24, 40, 0.06); }
      .stat { padding: 14px; }
      .stat strong { display: block; font-size: 24px; }
      .stat span { color: #697586; font-size: 13px; }
      .panel { overflow: hidden; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 11px 12px; border-bottom: 1px solid #e5e9ef; text-align: left; vertical-align: top; }
      th { background: #f0f3f7; font-size: 12px; color: #4b5563; }
      tr:last-child td { border-bottom: 0; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
      .muted { color: #697586; }
      .error { color: #b42318; font-weight: 650; }
      @media (max-width: 760px) {
        header, form { display: block; }
        input, button { width: 100%; box-sizing: border-box; margin-top: 8px; }
        .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .panel { overflow-x: auto; }
      }
      @media (prefers-color-scheme: dark) {
        body { background: #101418; color: #edf2f7; }
        p, .muted, .stat span { color: #9aa7b4; }
        input, .stat, .panel { background: #171d24; border-color: #2c3642; }
        th { background: #202832; color: #c8d2dc; }
        td, th { border-color: #2c3642; }
        button.secondary { background: #283342; color: #edf2f7; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Portfolio Visits</h1>
          <p id="status">Enter the admin token to load recent non-bot visits.</p>
        </div>
        <button class="secondary" id="refresh" type="button">Refresh</button>
      </header>
      <form id="token-form">
        <input id="token" type="password" autocomplete="current-password" placeholder="ADMIN_TOKEN" />
        <button type="submit">Load</button>
      </form>
      <section class="stats" aria-label="24-hour summary">
        <div class="stat"><strong id="views">-</strong><span>views</span></div>
        <div class="stat"><strong id="browsers">-</strong><span>browsers</span></div>
        <div class="stat"><strong id="sessions">-</strong><span>sessions</span></div>
        <div class="stat"><strong id="networks">-</strong><span>networks</span></div>
      </section>
      <section class="panel">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Page</th>
              <th>Source</th>
              <th>Location</th>
              <th>Network</th>
              <th>Browser</th>
            </tr>
          </thead>
          <tbody id="visits">
            <tr><td colspan="6" class="muted">No data loaded.</td></tr>
          </tbody>
        </table>
      </section>
    </main>
    <script>
      const form = document.getElementById("token-form");
      const tokenInput = document.getElementById("token");
      const refreshButton = document.getElementById("refresh");
      const statusEl = document.getElementById("status");
      const visitsEl = document.getElementById("visits");
      const statIds = ["views", "browsers", "sessions", "networks"];
      const escapeHtml = (value) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        };

        return String(value || "").replace(/[&<>"']/g, (char) => entities[char]);
      };
      const short = (value) => value ? String(value).slice(0, 10) : "";

      tokenInput.value = sessionStorage.getItem("portfolio_visit_admin_token") || "";

      async function loadVisits() {
        const token = tokenInput.value.trim();
        if (!token) {
          statusEl.textContent = "Enter ADMIN_TOKEN first.";
          statusEl.className = "error";
          return;
        }

        sessionStorage.setItem("portfolio_visit_admin_token", token);
        statusEl.textContent = "Loading...";
        statusEl.className = "";

        const headers = { Authorization: "Bearer " + token };
        const [summaryRes, recentRes] = await Promise.all([
          fetch("/api/visits/summary?hours=24", { headers }),
          fetch("/api/visits/recent?limit=50", { headers })
        ]);

        if (!summaryRes.ok || !recentRes.ok) {
          statusEl.textContent = "Could not load visits. Check ADMIN_TOKEN and Worker deployment.";
          statusEl.className = "error";
          return;
        }

        const summary = await summaryRes.json();
        const recent = await recentRes.json();
        const totals = summary.totals || {};
        statIds.forEach((id) => {
          document.getElementById(id).textContent = totals[id] ?? 0;
        });

        visitsEl.innerHTML = (recent.visits || []).map((visit) => {
          const source = visit.source_label || visit.referrer_host || "direct";
          const location = [visit.city, visit.region, visit.country].filter(Boolean).join(", ") || "-";
          const network = visit.as_organization || short(visit.ip_hash) || "-";
          const browser = [visit.browser_language, visit.browser_timezone].filter(Boolean).join(" / ") || "-";
          return "<tr>" +
            "<td><code>" + escapeHtml(visit.server_ts) + "</code></td>" +
            "<td>" + escapeHtml(visit.path) + "</td>" +
            "<td>" + escapeHtml(source) + "</td>" +
            "<td>" + escapeHtml(location) + "</td>" +
            "<td>" + escapeHtml(network) + "</td>" +
            "<td>" + escapeHtml(browser) + "</td>" +
          "</tr>";
        }).join("") || '<tr><td colspan="6" class="muted">No non-bot visits found.</td></tr>';

        statusEl.textContent = "Last refresh: " + new Date().toLocaleString();
        statusEl.className = "";
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        loadVisits().catch((err) => {
          statusEl.textContent = err.message;
          statusEl.className = "error";
        });
      });

      refreshButton.addEventListener("click", () => {
        loadVisits().catch((err) => {
          statusEl.textContent = err.message;
          statusEl.className = "error";
        });
      });
    </script>
  </body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'"
    }
  });
}

async function readPayload(request) {
  const text = await request.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    return {};
  }
}

function isAllowedIngestRequest(request, env) {
  const allowedOrigins = getAllowedOrigins(env);

  if (allowedOrigins.length === 0) {
    return true;
  }

  const origin = request.headers.get("Origin");
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  const referer = request.headers.get("Referer");
  if (!referer) {
    return false;
  }

  return allowedOrigins.includes(getUrlOrigin(referer));
}

function requireAdmin(request, env) {
  const token = env.ADMIN_TOKEN || "";
  const auth = request.headers.get("Authorization") || "";
  const provided = auth.replace(/^Bearer\s+/i, "");

  if (token && safeEqual(provided, token)) {
    return null;
  }

  return json({ error: "unauthorized" }, request, env, 401);
}

function getAllowedOrigins(env) {
  return String(env.SITE_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const allowedOrigins = getAllowedOrigins(env);
  const requestOrigin = request.headers.get("Origin");
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin"
  };
}

function json(body, request, env, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=UTF-8"
    }
  });
}

function normalizePath(value) {
  const path = clean(value, 1000) || "/";

  if (!path.startsWith("/")) {
    return "/";
  }

  return path;
}

function getSourceLabel(payload, path) {
  const explicit = clean(payload.sourceLabel, 160);
  if (explicit) return explicit;

  const url = new URL(path, "https://example.com");
  return clean(
    url.searchParams.get("r") ||
      url.searchParams.get("ref") ||
      url.searchParams.get("source") ||
      url.searchParams.get("utm_source"),
    160
  );
}

function getClientIp(request) {
  return clean(
    request.headers.get("CF-Connecting-IP") ||
      request.headers.get("True-Client-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0],
    120
  );
}

async function hashIp(ip, env) {
  if (!ip) {
    return "";
  }

  const secret = env.IP_HASH_SECRET || "portfolio-visitor-tracker";
  const bytes = new TextEncoder().encode(`${secret}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function looksLikeBot(userAgent) {
  return /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|whatsapp|telegrambot|discordbot/i.test(
    userAgent || ""
  );
}

function getUrlHost(value) {
  try {
    return new URL(value).host;
  } catch (err) {
    return "";
  }
}

function getUrlOrigin(value) {
  try {
    return new URL(value).origin;
  } catch (err) {
    return "";
  }
}

function clean(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function safeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}

async function sendVisitEmail(env, visit) {
  const to = env.EMAIL_TO || "";
  const from = env.EMAIL_FROM || "notifications@itsmns.dev";

  if (!to) {
    return;
  }

  const source = visit.sourceLabel || visit.referrerHost || "direct";
  const location = [visit.city, visit.region, visit.country].filter(Boolean).join(", ") || "unknown location";
  const network = visit.asOrganization || visit.ipHash.slice(0, 12) || "unknown network";
  const subject = `Portfolio visit: ${visit.path}`;
  const body = [
    `Time: ${visit.serverTs}`,
    `Page: ${visit.path}`,
    `Title: ${visit.title || "-"}`,
    `Source: ${source}`,
    `Referrer: ${visit.referrer || "-"}`,
    `Location: ${location}`,
    `Network: ${network}`,
    `Browser timezone: ${visit.browserTimezone || "-"}`,
    `Browser language: ${visit.browserLanguage || "-"}`,
    `Visitor ID: ${visit.visitorId || "-"}`,
    `Session ID: ${visit.sessionId || "-"}`,
    "",
    "Recent visits dashboard:",
    "https://itsmns.dev/api/visits"
  ].join("\n");

  const message = new EmailMessage(from, to, buildTextEmail({ from, to, subject, body }));
  await env.NOTIFICATION_EMAIL.send(message);
}

function buildTextEmail({ from, to, subject, body }) {
  const headers = [
    `From: Portfolio Notifications <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeEmailHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit"
  ];

  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

function encodeEmailHeader(value) {
  const text = String(value || "");

  if (/^[\x00-\x7f]*$/.test(text)) {
    return text.replace(/[\r\n]+/g, " ");
  }

  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `=?UTF-8?B?${btoa(binary)}?=`;
}

async function sendVisitWebhook(env, visit) {
  const location = [visit.city, visit.region, visit.country].filter(Boolean).join(", ") || "unknown location";
  const source = visit.sourceLabel || visit.referrerHost || "direct";
  const text = [
    `Portfolio visit: ${visit.path}`,
    `Time: ${visit.serverTs}`,
    `Source: ${source}`,
    `Location: ${location}`,
    `Network: ${visit.asOrganization || visit.ipHash.slice(0, 12)}`
  ].join("\n");

  const body = env.WEBHOOK_FORMAT === "discord"
    ? { content: text }
    : { text, visit };

  await fetch(env.VISIT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
