#!/usr/bin/env python3
"""DCD 2026 company/contact pipeline using browser-use in visible mode.

This script intentionally favors resumability and observability over speed.
It drives browser-use sessions for navigation/state capture and uses OpenAI
Responses API for structured extraction/classification.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import math
import re
import shlex
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DOMAINS = {"ai", "robotics", "embedded", "cloud"}
CAPTCHA_HINTS = [
    "captcha",
    "verify you are human",
    "unusual activity",
    "security check",
    "challenge",
]


@dataclass
class Config:
    browser_cmd: str
    browser_mode: str
    browser_profile: str
    headed: bool
    sessions: dict[str, str]
    dcd_participants_url: str
    output_file: str
    checkpoint_file: str
    action_log_file: str
    screenshot_dir: str
    batch_size: int
    source_scroll_max: int
    source_scroll_stagnation_limit: int
    retry_attempts: int
    retry_backoff_seconds: float
    confidence_threshold: float
    min_contacts_per_company: int
    max_contacts_per_company: int
    hr_contacts_min: int
    hr_contacts_max: int
    technical_contacts_min: int
    technical_contacts_max: int
    linkedin_active_window_months: int
    models: dict[str, str]
    hunter: dict[str, Any]


class PipelineError(RuntimeError):
    pass


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "unknown"


def company_id(name: str) -> str:
    cleaned = re.sub(r"\b(inc|corp|corporation|gmbh|ag|llc|ltd|limited|co|company|s\.?a\.?|plc)\b", "", name.lower())
    cleaned = re.sub(r"[^a-z0-9]+", " ", cleaned).strip()
    if not cleaned:
        cleaned = name.lower().strip()
    digest = hashlib.sha1(cleaned.encode("utf-8")).hexdigest()[:10]
    return f"{safe_slug(cleaned)[:40]}-{digest}"


class OpenAIClient:
    def __init__(self, api_key: str | None, timeout: int = 90) -> None:
        self.api_key = api_key
        self.timeout = timeout

    def enabled(self) -> bool:
        return bool(self.api_key)

    def _extract_text(self, payload: dict[str, Any]) -> str:
        output = payload.get("output", [])
        chunks: list[str] = []
        for item in output:
            for content in item.get("content", []):
                if content.get("type") == "output_text" and content.get("text"):
                    chunks.append(content["text"])
        if chunks:
            return "\n".join(chunks).strip()
        # fallback for older formats
        if isinstance(payload.get("output_text"), str):
            return payload["output_text"].strip()
        return ""

    def json_response(self, *, model: str, prompt: str, max_output_tokens: int = 1200) -> dict[str, Any]:
        if not self.api_key:
            raise PipelineError("OPENAI_API_KEY is required for model-powered extraction/classification.")

        body = {
            "model": model,
            "input": [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "input_text",
                            "text": "Return only strict JSON. Do not wrap in markdown.",
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": prompt}],
                },
            ],
            "max_output_tokens": max_output_tokens,
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/responses",
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps(body).encode("utf-8"),
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise PipelineError(f"OpenAI API error {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise PipelineError(f"OpenAI API network error: {exc}") from exc

        text = self._extract_text(data)
        if not text:
            raise PipelineError("OpenAI API returned empty output.")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Recover when model adds pre/postamble around a valid JSON block.
            left = text.find("{")
            right = text.rfind("}")
            if left != -1 and right != -1 and right > left:
                candidate = text[left : right + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError as exc:
                    raise PipelineError(f"Model output was not valid JSON: {text[:300]}") from exc
            raise PipelineError(f"Model output was not valid JSON: {text[:300]}")


class DCDPipeline:
    def __init__(self, cfg: Config, *, visible: bool) -> None:
        self.cfg = cfg
        self.visible = visible
        self.root = Path(__file__).resolve().parents[2]
        self.output_file = self.root / cfg.output_file
        self.checkpoint_file = self.root / cfg.checkpoint_file
        self.action_log_file = self.root / cfg.action_log_file
        self.screenshot_dir = self.root / cfg.screenshot_dir
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        self.checkpoint_file.parent.mkdir(parents=True, exist_ok=True)
        self.action_log_file.parent.mkdir(parents=True, exist_ok=True)
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)

        self.openai = OpenAIClient(os.getenv("OPENAI_API_KEY"))
        self.state = self._load_state()
        if not self.state.get("run_id"):
            self.state["run_id"] = now_iso()
            self._save_state()

    def _load_state(self) -> dict[str, Any]:
        if self.checkpoint_file.exists():
            return json.loads(self.checkpoint_file.read_text(encoding="utf-8"))
        state = {
            "run_id": now_iso(),
            "source_ready": False,
            "companies": {},
            "company_order": [],
            "metrics": {
                "ingested": 0,
                "relevant": 0,
                "contacts_written": 0,
                "emails_found": 0,
            },
        }
        self._save_state(state)
        return state

    def _save_state(self, state: dict[str, Any] | None = None) -> None:
        if state is None:
            state = self.state
        self.checkpoint_file.write_text(json.dumps(state, indent=2), encoding="utf-8")

    def _append_action_log(self, payload: dict[str, Any]) -> None:
        payload["timestamp"] = now_iso()
        with self.action_log_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=True) + "\n")

    def _browser_base_cmd(self, session: str) -> list[str]:
        base = shlex.split(self.cfg.browser_cmd)
        base.extend(["--json", "--session", session, "--browser", self.cfg.browser_mode])
        if self.visible and self.cfg.headed:
            base.append("--headed")
        if self.cfg.browser_mode == "real" and self.cfg.browser_profile:
            base.extend(["--profile", self.cfg.browser_profile])
        return base

    def _run_browser(self, session: str, args: list[str], *, retries: int | None = None) -> dict[str, Any]:
        retries = self.cfg.retry_attempts if retries is None else retries
        cmd = self._browser_base_cmd(session) + args
        last_err: Exception | None = None
        for attempt in range(1, retries + 1):
            try:
                completed = subprocess.run(
                    cmd,
                    check=True,
                    capture_output=True,
                    text=True,
                )
                stdout = completed.stdout.strip()
                parsed = json.loads(stdout) if stdout else {}
                self._append_action_log(
                    {
                        "session": session,
                        "command": args,
                        "success": True,
                        "response": parsed,
                    }
                )
                return parsed
            except Exception as exc:  # broad to keep run alive
                last_err = exc
                self._append_action_log(
                    {
                        "session": session,
                        "command": args,
                        "success": False,
                        "error": str(exc),
                        "attempt": attempt,
                    }
                )
                time.sleep(self.cfg.retry_backoff_seconds * attempt)
        raise PipelineError(f"browser-use command failed after retries: {args}; error={last_err}")

    def _browser_text(self, session: str) -> str:
        state = self._run_browser(session, ["state"])
        data = state.get("data", {})
        if isinstance(data, dict):
            raw = data.get("_raw_text") or ""
            return raw[:200_000]
        return ""

    def _browser_html(self, session: str) -> str:
        html = self._run_browser(session, ["get", "html"])
        data = html.get("data", {})
        if isinstance(data, dict):
            if isinstance(data.get("html"), str):
                return data["html"][:300_000]
            if isinstance(data.get("value"), str):
                return data["value"][:300_000]
        if isinstance(data, str):
            return data[:300_000]
        return ""

    def _collect_source_snapshot(self, session: str) -> tuple[str, str]:
        text = self._browser_text(session)
        html = self._browser_html(session)
        return text, html

    def _collect_source_with_scroll(self, session: str) -> tuple[str, str]:
        # Walk the participant list to gather more than the initially visible entries.
        self._run_browser(session, ["keys", "Home"], retries=1)
        time.sleep(0.6)
        text_chunks: list[str] = []
        html_chunks: list[str] = []
        seen_text_hashes: set[str] = set()
        seen_names: set[str] = set()
        stagnant_rounds = 0

        for _ in range(self.cfg.source_scroll_max):
            text, html = self._collect_source_snapshot(session)
            digest = hashlib.sha1(text.encode("utf-8")).hexdigest()
            if digest not in seen_text_hashes:
                seen_text_hashes.add(digest)
                text_chunks.append(text)
                html_chunks.append(html[:120000])

            parsed = self._extract_companies_regex(text)
            before = len(seen_names)
            seen_names.update(c["name"].lower().strip() for c in parsed if c.get("name"))
            if len(seen_names) == before:
                stagnant_rounds += 1
            else:
                stagnant_rounds = 0

            if stagnant_rounds >= self.cfg.source_scroll_stagnation_limit:
                break

            self._run_browser(session, ["scroll", "down"], retries=1)
            time.sleep(0.7)

        return "\n".join(text_chunks), "\n".join(html_chunks)

    def _extract_companies_from_html_options(self, html: str) -> list[dict[str, str]]:
        if not html:
            return []
        match = re.search(
            r"<select[^>]*id=[\"']id_company[\"'][^>]*>(.*?)</select>",
            html,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if not match:
            return []
        select_body = match.group(1)
        option_re = re.compile(
            r"<option[^>]*value=[\"']([^\"']*)[\"'][^>]*>(.*?)</option>",
            flags=re.IGNORECASE | re.DOTALL,
        )
        out: list[dict[str, str]] = []
        seen: set[str] = set()
        for value, label_html in option_re.findall(select_body):
            if not value or "/bedrijven/" not in value:
                continue
            label = re.sub(r"<[^>]+>", "", label_html)
            label = " ".join(label.split()).strip()
            if not label:
                continue
            key = label.lower()
            if key in seen:
                continue
            seen.add(key)
            company_url = value.strip()
            if company_url.startswith("/"):
                company_url = f"https://dcd.tudelft.nl{company_url}"
            out.append(
                {
                    "name": label,
                    "company_url": company_url,
                    "description": "",
                }
            )
        return out

    def _maybe_manual_pause(self, text: str, reason: str) -> None:
        lower = text.lower()
        if any(k in lower for k in CAPTCHA_HINTS):
            print(f"\nManual action required ({reason}). Solve challenge in browser, then press Enter to continue...", flush=True)
            input()

    def _take_screenshot(self, session: str, label: str) -> None:
        filename = f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}-{safe_slug(label)}.png"
        path = self.screenshot_dir / filename
        self._run_browser(session, ["screenshot", str(path)])

    def _llm_json(self, prompt: str, *, model: str, max_output_tokens: int = 1200) -> dict[str, Any]:
        return self.openai.json_response(model=model, prompt=prompt, max_output_tokens=max_output_tokens)

    def _extract_companies_regex(self, text: str) -> list[dict[str, str]]:
        companies: list[dict[str, str]] = []
        lines = [ln.strip() for ln in text.splitlines()]
        in_list = False
        i = 0
        while i < len(lines):
            line = lines[i]
            if not in_list and "participating companies" in line.lower():
                in_list = True
                i += 1
                continue
            if not in_list:
                i += 1
                continue
            if re.match(r"^\*?\[\d+\]<a(?:\s+[^>]*)?\s*/?>", line):
                name = ""
                industry = ""
                j = i + 1
                while j < len(lines):
                    nxt = lines[j].strip()
                    if not nxt:
                        j += 1
                        continue
                    if re.match(r"^\*?\[\d+\]<a(?:\s+[^>]*)?\s*/?>", nxt):
                        break
                    if re.match(r"^\[\d+\]<", nxt) or nxt.startswith("|SHADOW"):
                        j += 1
                        continue
                    if not name:
                        name = nxt
                    elif not industry:
                        industry = nxt
                        break
                    j += 1
                if name and len(name) <= 120:
                    companies.append({"name": name, "company_url": "", "description": industry})
                i = j
                continue
            i += 1
        # dedupe preserving order
        seen: set[str] = set()
        deduped: list[dict[str, str]] = []
        for c in companies:
            key = c["name"].lower().strip()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(c)
        return deduped

    def _extract_companies_from_source(self, html: str, text: str) -> list[dict[str, str]]:
        if not self.openai.enabled():
            raise PipelineError("OPENAI_API_KEY is required to extract companies from DCD page.")

        # First, try lightweight deterministic parse from browser-use text dump.
        regex_companies = self._extract_companies_regex(text)
        if len(regex_companies) >= 80:
            return regex_companies

        # Fallback to chunked LLM extraction to avoid oversized truncated JSON.
        source = (text or "")[:200000]
        if not source:
            source = (html or "")[:200000]
        lines = source.splitlines()
        chunk_size = 220
        chunk_count = max(1, math.ceil(len(lines) / chunk_size))

        merged: dict[str, dict[str, str]] = {}
        for idx in range(chunk_count):
            start = idx * chunk_size
            end = min(len(lines), (idx + 1) * chunk_size)
            snippet = "\n".join(lines[start:end])
            prompt = (
                "Extract ONLY company entries from this DCD snippet. Return strict JSON: "
                "{\"companies\":[{\"name\":\"\",\"company_url\":\"\",\"description\":\"\"}]}. "
                "If no companies appear, return {\"companies\":[]}. "
                "Do not infer missing companies from outside this snippet.\n\n"
                f"SNIPPET_INDEX: {idx+1}/{chunk_count}\n"
                f"SNIPPET:\n{snippet}"
            )
            result = self._llm_json(
                prompt,
                model=self.cfg.models["classification_fast"],
                max_output_tokens=2000,
            )
            for item in result.get("companies", []):
                name = str(item.get("name", "")).strip()
                if not name:
                    continue
                key = name.lower()
                if key not in merged:
                    merged[key] = {
                        "name": name,
                        "company_url": str(item.get("company_url", "")).strip(),
                        "description": str(item.get("description", "")).strip(),
                    }

        out = list(merged.values())
        if out:
            return out

        return regex_companies

    def _classify_company(self, company: dict[str, Any]) -> dict[str, Any]:
        if not self.openai.enabled():
            raise PipelineError("OPENAI_API_KEY is required for domain classification.")

        prompt = (
            "Classify company relevance to domains [ai, robotics, embedded, cloud]. "
            "Return strict JSON: {domains: string[], confidence: number, reason: string}. "
            "confidence must be 0..1 and reflect evidence quality.\n\n"
            f"Company: {company['name']}\n"
            f"Company URL: {company.get('company_url','')}\n"
            f"Description: {company.get('description','')}\n"
            f"Evidence text: {company.get('evidence_text','')[:7000]}"
        )
        first = self._llm_json(prompt, model=self.cfg.models["classification_fast"], max_output_tokens=600)
        confidence = float(first.get("confidence", 0.0) or 0.0)
        if (0.70 <= confidence < self.cfg.confidence_threshold) or first.get("domains"):
            second = self._llm_json(prompt, model=self.cfg.models["classification_strong"], max_output_tokens=600)
            return second
        return first

    def _linkedin_contacts_from_state(
        self,
        session: str,
        company: dict[str, Any],
        text: str,
        *,
        track: str,
        count_max: int,
    ) -> list[dict[str, str]]:
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        hr_kw = ("recruit", "talent acquisition", "talent partner", "hiring", "human resources", "hr")
        tech_kw = (
            "manager",
            "engineer",
            "staff",
            "lead",
            "architect",
            "director",
            "ai",
            "robotics",
            "embedded",
            "cloud",
            "software",
        )
        company_l = company["name"].lower()
        candidates: list[tuple[int, str, str, int]] = []

        for i, line in enumerate(lines[:-1]):
            m = re.match(r"^\[(\d+)\]<a(?:\s+[^>]*)?\s*/?>$", line)
            if not m:
                continue
            idx = int(m.group(1))
            name = ""
            name_line_idx = i + 1
            for j in range(i + 1, min(i + 6, len(lines))):
                candidate = lines[j]
                if re.match(r"^\*?\[\d+\]<", candidate):
                    continue
                if len(candidate) < 3 or len(candidate) > 80:
                    continue
                if not re.search(r"[A-Za-z]", candidate):
                    continue
                if any(x in candidate.lower() for x in ("connect", "follow", "mutual connection", "followers")):
                    continue
                name = candidate
                name_line_idx = j
                break
            if not name:
                continue
            if len(name) < 3 or len(name) > 80:
                continue
            if any(x in name.lower() for x in ("mutual connection", "followers", "connect", "follow")):
                continue
            if not re.search(r"[A-Za-z]", name):
                continue
            context = " ".join(lines[name_line_idx : name_line_idx + 16])
            context_l = context.lower()
            score = 0
            if company_l in context_l:
                score += 3
            if track == "hr" and any(k in context_l for k in hr_kw):
                score += 3
            if track == "technical" and any(k in context_l for k in tech_kw):
                score += 3
            if track == "technical" and any(k in context_l for k in ("ai", "robotics", "embedded", "cloud")):
                score += 1
            if score <= 0:
                continue
            candidates.append((idx, name, context, score))

        # Prefer strongest matches and avoid duplicate names.
        candidates.sort(key=lambda t: t[3], reverse=True)
        seen_names: set[str] = set()
        out: list[dict[str, str]] = []
        for idx, name, context, _score in candidates:
            nkey = name.lower().strip()
            if nkey in seen_names:
                continue
            seen_names.add(nkey)
            attrs = self._run_browser(session, ["get", "attributes", str(idx)], retries=1)
            href = (
                (attrs.get("data", {}) or {})
                .get("attributes", {})
                .get("href", "")
                .strip()
            )
            if "linkedin.com/in/" not in href:
                continue
            # Derive a concise title-ish snippet from context.
            title = ""
            for frag in context.split("  "):
                frag = frag.strip()
                if not frag:
                    continue
                if re.match(r"^\*?\[\d+\]<", frag):
                    continue
                if frag == name:
                    continue
                if any(tok in frag.lower() for tok in ("connect", "follow", "mutual connection", "followers")):
                    continue
                title = frag
                break
            out.append(
                {
                    "contact_name": name,
                    "contact_title": title,
                    "linkedin_url": href,
                    "linkedin_activity": "unknown",
                    "contact_track": track,
                }
            )
            if len(out) >= count_max:
                break
        return out

    def _linkedin_contacts(self, company: dict[str, Any], *, track: str, count_min: int, count_max: int) -> list[dict[str, str]]:
        session = self.cfg.sessions["linkedin"]
        terms = "talent acquisition OR recruiter OR hiring" if track == "hr" else "manager OR staff engineer OR lead"
        domain_terms = "AI OR Robotics OR Embedded OR Cloud"
        query = urllib.parse.quote_plus(f"{company['name']} {terms} {domain_terms}")
        search_url = f"https://www.linkedin.com/search/results/people/?keywords={query}"
        self._run_browser(session, ["open", search_url])
        time.sleep(2)
        text = self._browser_text(session)
        self._maybe_manual_pause(text, "LinkedIn verification")

        # Deterministic extraction first (index + href lookup from browser-use state).
        deterministic = self._linkedin_contacts_from_state(
            session,
            company,
            text,
            track=track,
            count_max=count_max,
        )
        if len(deterministic) >= count_min:
            return deterministic

        parsed: dict[str, Any] | None = None
        prompt_base = (
            "From this LinkedIn people search content, extract contact candidates for the target company. "
            "Return strict JSON ONLY: {\"contacts\":[{\"name\":\"\",\"title\":\"\",\"linkedin_url\":\"\",\"activity_signal\":\"active_within_12_months|unknown\"}]}. "
            f"Return between {count_min} and {count_max} contacts for track={track}, and never exceed {count_max}. "
            "Prefer people currently at the target company. For technical track, prioritize AI/Robotics/Embedded/Cloud-aligned roles.\n\n"
            f"Target company: {company['name']}\n"
            f"Track: {track}\n"
        )
        for chunk in (text[:28000], text[:12000]):
            prompt = f"{prompt_base}\nRAW_TEXT:\n{chunk}"
            try:
                parsed = self._llm_json(prompt, model=self.cfg.models["classification_fast"], max_output_tokens=1200)
                break
            except PipelineError:
                parsed = None
                continue
        if parsed is None:
            raise PipelineError(f"Failed to parse LinkedIn contacts for {company['name']} ({track}).")
        contacts: list[dict[str, str]] = []
        for c in parsed.get("contacts", []):
            url = str(c.get("linkedin_url", "")).strip()
            name = str(c.get("name", "")).strip()
            title = str(c.get("title", "")).strip()
            activity = str(c.get("activity_signal", "unknown")).strip() or "unknown"
            if not name or not url:
                continue
            contacts.append(
                {
                    "contact_name": name,
                    "contact_title": title,
                    "linkedin_url": url,
                    "linkedin_activity": activity,
                    "contact_track": track,
                }
            )
        # preserve order and dedupe
        seen: set[str] = set()
        unique: list[dict[str, str]] = []
        for c in contacts:
            if c["linkedin_url"] in seen:
                continue
            seen.add(c["linkedin_url"])
            unique.append(c)
        for c in deterministic:
            if c["linkedin_url"] in seen:
                continue
            seen.add(c["linkedin_url"])
            unique.append(c)
        return unique[:count_max]

    def _company_domain(self, company: dict[str, Any]) -> str:
        url = company.get("company_url", "").strip()
        if not url:
            return ""
        parsed = urllib.parse.urlparse(url)
        host = parsed.netloc.lower()
        host = host.replace("www.", "")
        return host

    def _hunter_lookup(self, company: dict[str, Any], contact_name: str) -> tuple[str | None, int, str]:
        mode = str(self.cfg.hunter.get("mode", "portal"))
        company_domain = self._company_domain(company)
        if not company_domain:
            return None, 0, "not_found"

        if mode == "api":
            api_key = os.getenv("HUNTER_API_KEY")
            if not api_key:
                return None, 0, "not_found"
            query = urllib.parse.urlencode({"domain": company_domain, "full_name": contact_name, "api_key": api_key})
            url = f"https://api.hunter.io/v2/email-finder?{query}"
            try:
                with urllib.request.urlopen(url, timeout=30) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                data = payload.get("data", {})
                email = data.get("email")
                score = int(data.get("score") or 0)
                if email and score >= int(self.cfg.hunter.get("high_confidence_score", 80)):
                    status = "verified" if data.get("verification", {}).get("status") == "valid" else "high_confidence"
                    return email, score, status
            except Exception:
                return None, 0, "not_found"
            return None, 0, "not_found"

        # portal mode via visible browser session
        session = self.cfg.sessions["hunter"]
        template = str(self.cfg.hunter.get("portal_query_url_template", "https://hunter.io/search/{domain}"))
        url = template.format(domain=company_domain)
        self._run_browser(session, ["open", url])
        time.sleep(2)
        text = self._browser_text(session)
        self._maybe_manual_pause(text, "Hunter verification")
        if not self.openai.enabled():
            return None, 0, "not_found"
        prompt = (
            "Find the best email for the target person at target company from this Hunter page. "
            "Return strict JSON: {email: string|null, confidence: number, status: 'verified'|'high_confidence'|'not_found'}. "
            "Only return verified/high-confidence candidates; otherwise return null/not_found.\n\n"
            f"Target person: {contact_name}\n"
            f"Target company domain: {company_domain}\n"
            f"RAW_TEXT:\n{text[:30000]}"
        )
        parsed = self._llm_json(prompt, model=self.cfg.models["classification_fast"], max_output_tokens=500)
        email = parsed.get("email")
        confidence = int(parsed.get("confidence", 0) or 0)
        status = str(parsed.get("status", "not_found"))
        if not email:
            return None, confidence, "not_found"
        if status not in {"verified", "high_confidence"}:
            return None, confidence, "not_found"
        return str(email), confidence, status

    def _append_contact_record(self, company: dict[str, Any], contact: dict[str, Any], email: str | None, email_conf: int, email_status: str) -> None:
        record = {
            "run_id": self.state["run_id"],
            "company": company["name"],
            "company_url": company.get("company_url", "") or None,
            "domains": company.get("domains", []),
            "domain_confidence": company.get("domain_confidence", 0.0),
            "domain_evidence": company.get("domain_evidence", []),
            "contact_name": contact["contact_name"],
            "contact_title": contact.get("contact_title", ""),
            "contact_track": contact["contact_track"],
            "linkedin_url": contact["linkedin_url"],
            "linkedin_activity": contact.get("linkedin_activity", "unknown"),
            "hunter_email": email,
            "hunter_confidence": email_conf,
            "hunter_status": email_status,
            "updated_at": now_iso(),
        }
        with self.output_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=True) + "\n")
        self.state["metrics"]["contacts_written"] += 1
        if email:
            self.state["metrics"]["emails_found"] += 1

    def _checkpoint_company(self, cid: str, **updates: Any) -> None:
        self.state["companies"].setdefault(cid, {}).update(updates)
        self._save_state()

    def _ensure_source(self) -> None:
        session = self.cfg.sessions["dcd"]
        if self.cfg.dcd_participants_url:
            self._run_browser(session, ["open", self.cfg.dcd_participants_url])
        else:
            print("Open the official DCD 2026 participant page in the visible browser, then press Enter.", flush=True)
            input()
        self._take_screenshot(session, "source-ready")
        self.state["source_ready"] = True
        self._save_state()

    def _ingest_companies(self) -> None:
        if self.state["company_order"]:
            return
        session = self.cfg.sessions["dcd"]
        text, html = self._collect_source_snapshot(session)
        self._maybe_manual_pause(text, "DCD source verification")
        companies = self._extract_companies_from_html_options(html)
        if len(companies) < 80:
            text, html = self._collect_source_with_scroll(session)
            companies = self._extract_companies_from_html_options(html)
        if len(companies) < 80:
            companies = self._extract_companies_from_source(html, text)

        by_id: dict[str, dict[str, Any]] = {}
        for company in companies:
            cid = company_id(company["name"])
            if cid not in by_id:
                by_id[cid] = {
                    "company_id": cid,
                    "name": company["name"],
                    "company_url": company.get("company_url", ""),
                    "description": company.get("description", ""),
                    "status": "ingested",
                    "contacts": [],
                }
        self.state["companies"] = by_id
        self.state["company_order"] = list(by_id.keys())
        self.state["metrics"]["ingested"] = len(by_id)
        self._save_state()

    def _classify_batch(self, ids: list[str]) -> None:
        for cid in ids:
            company = self.state["companies"][cid]
            if company.get("status") not in {"ingested", "classification_failed"}:
                continue
            try:
                session = self.cfg.sessions["dcd"]
                if company.get("company_url"):
                    self._run_browser(session, ["open", company["company_url"]])
                    page_text = self._browser_text(session)
                else:
                    page_text = ""
                company["evidence_text"] = page_text[:20000]
                result = self._classify_company(company)
                domains = [d for d in result.get("domains", []) if d in DOMAINS]
                confidence = float(result.get("confidence", 0.0) or 0.0)
                company["domains"] = domains
                company["domain_confidence"] = confidence
                company["domain_reason"] = str(result.get("reason", ""))
                company["domain_evidence"] = [company.get("company_url", ""), "dcd_profile"]
                company["status"] = "relevant" if domains and confidence >= self.cfg.confidence_threshold else "irrelevant"
                if company["status"] == "relevant":
                    self.state["metrics"]["relevant"] += 1
                self._checkpoint_company(cid, **company)
            except Exception as exc:
                company["status"] = "classification_failed"
                company["last_error"] = str(exc)
                self._checkpoint_company(cid, **company)

    def _collect_contacts_and_emails(self, cid: str) -> None:
        company = self.state["companies"][cid]
        if company.get("status") in {"ingested", "irrelevant", "classification_failed"}:
            return
        if company.get("contacts_complete"):
            return

        hr = self._linkedin_contacts(
            company,
            track="hr",
            count_min=self.cfg.hr_contacts_min,
            count_max=self.cfg.hr_contacts_max,
        )
        tech = self._linkedin_contacts(
            company,
            track="technical",
            count_min=self.cfg.technical_contacts_min,
            count_max=self.cfg.technical_contacts_max,
        )

        contacts = (hr + tech)[: self.cfg.max_contacts_per_company]
        if len(contacts) < self.cfg.min_contacts_per_company:
            company["status"] = "contact_gap"
            company["contacts"] = contacts
            self._checkpoint_company(cid, **company)
            return

        seen_urls: set[str] = set()
        final_contacts: list[dict[str, Any]] = []
        for c in contacts:
            if c["linkedin_url"] in seen_urls:
                continue
            seen_urls.add(c["linkedin_url"])
            email, conf, status = self._hunter_lookup(company, c["contact_name"])
            c["hunter_email"] = email
            c["hunter_confidence"] = conf
            c["hunter_status"] = status
            final_contacts.append(c)
            self._append_contact_record(company, c, email, conf, status)
            self._save_state()

        company["contacts"] = final_contacts
        company["contacts_complete"] = True
        company["status"] = "done"
        self._checkpoint_company(cid, **company)
        self._take_screenshot(self.cfg.sessions["linkedin"], f"linkedin-{company['name']}")
        self._take_screenshot(self.cfg.sessions["hunter"], f"hunter-{company['name']}")

    def run(self) -> None:
        print("Starting DCD pipeline...")
        self._ensure_source()
        self._ingest_companies()

        order = self.state["company_order"]
        for i in range(0, len(order), self.cfg.batch_size):
            batch = order[i : i + self.cfg.batch_size]
            self._classify_batch(batch)
            for cid in batch:
                try:
                    self._collect_contacts_and_emails(cid)
                except Exception as exc:
                    company = self.state["companies"][cid]
                    company["status"] = "failed"
                    company["last_error"] = str(exc)
                    self._checkpoint_company(cid, **company)

        print("Pipeline completed.")
        print(json.dumps(self.state["metrics"], indent=2))


def load_config(path: Path) -> Config:
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    return Config(
        browser_cmd=data["browser_cmd"],
        browser_mode=data["browser_mode"],
        browser_profile=data.get("browser_profile", "Default"),
        headed=bool(data.get("headed", True)),
        sessions=data["sessions"],
        dcd_participants_url=data.get("dcd_participants_url", ""),
        output_file=data["output_file"],
        checkpoint_file=data["checkpoint_file"],
        action_log_file=data["action_log_file"],
        screenshot_dir=data["screenshot_dir"],
        batch_size=int(data.get("batch_size", 20)),
        source_scroll_max=int(data.get("source_scroll_max", 80)),
        source_scroll_stagnation_limit=int(data.get("source_scroll_stagnation_limit", 5)),
        retry_attempts=int(data.get("retry_attempts", 3)),
        retry_backoff_seconds=float(data.get("retry_backoff_seconds", 2.0)),
        confidence_threshold=float(data.get("confidence_threshold", 0.85)),
        min_contacts_per_company=int(data.get("min_contacts_per_company", 5)),
        max_contacts_per_company=int(data.get("max_contacts_per_company", 6)),
        hr_contacts_min=int(data.get("hr_contacts_min", 2)),
        hr_contacts_max=int(data.get("hr_contacts_max", 3)),
        technical_contacts_min=int(data.get("technical_contacts_min", 2)),
        technical_contacts_max=int(data.get("technical_contacts_max", 3)),
        linkedin_active_window_months=int(data.get("linkedin_active_window_months", 12)),
        models=data["models"],
        hunter=data.get("hunter", {}),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="DCD 2026 extraction pipeline")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).resolve().parent / "config.yaml"),
        help="Path to config file (JSON formatted, .yaml extension allowed)",
    )
    parser.add_argument(
        "--visible",
        action="store_true",
        default=True,
        help="Run browser-use in headed mode for real-time visibility.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    cfg = load_config(Path(args.config))
    pipeline = DCDPipeline(cfg, visible=args.visible)
    try:
        pipeline.run()
        return 0
    except KeyboardInterrupt:
        print("Interrupted; checkpoint preserved.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"Pipeline failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
