# CV Role Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CV maintenance state with a new-tab `/cv/` role selector that opens one of four specialized PDFs in the browser's native viewer.

**Architecture:** Keep the homepage CTA as a normal anchor that opens a static Astro route in a new tab. The `/cv/` route renders a compact, page-scoped, PDF-viewer-inspired selector whose ordinary same-tab links navigate directly to static PDF assets. Verify the generated static markup with Node's built-in test runner.

**Tech Stack:** Astro 4, scoped CSS, Node.js built-in `node:test`

---

## File Structure

- Create `tests/cv-role-picker.test.mjs`: generated-markup regression tests for the homepage and `/cv/`.
- Modify `package.json`: add the focused `test:cv` command.
- Modify `src/pages/index.astro`: reactivate the Download CV CTA as a new-tab `/cv/` link and remove the maintenance notice.
- Create `src/pages/cv.astro`: render the compact role selector and page-scoped viewer-style CSS.

### Task 1: Add the Generated-Markup Regression Test

**Files:**
- Create: `tests/cv-role-picker.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the focused static-output test**

Create `tests/cv-role-picker.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeHtml = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");

test("homepage opens the CV selector in a new tab", () => {
  const cvLink = homeHtml.match(/<a\b[^>]*href="\/cv\/"[^>]*>/)?.[0];

  assert.ok(cvLink, "missing homepage CV selector link");
  assert.match(cvLink, /target="_blank"/);
  assert.match(cvLink, /rel="noopener"/);
  assert.doesNotMatch(homeHtml, /cv-maintenance|temporarily under maintenance/i);
});

test("CV selector exposes every specialized PDF", () => {
  const cvHtml = readFileSync(new URL("../dist/cv/index.html", import.meta.url), "utf8");
  const profiles = [
    ["Embedded Software Engineer", "/Subhash_CV.pdf"],
    ["Software Engineer", "/CV_AI_software_engineer.pdf"],
    ["Robotics Engineer", "/CV_Robotics.pdf"],
    ["Edge AI Engineer", "/CV_Edge_AI.pdf"]
  ];

  for (const [label, href] of profiles) {
    assert.ok(cvHtml.includes(label), `missing role label: ${label}`);
    assert.ok(cvHtml.includes(`href="${href}"`), `missing PDF link: ${href}`);
  }
});
```

- [ ] **Step 2: Add the focused test command**

Add this script to `package.json` after `build`:

```json
"test:cv": "npm run build && node --test tests/cv-role-picker.test.mjs",
```

- [ ] **Step 3: Run the test to verify the current site fails**

Run:

```bash
npm run test:cv
```

Expected: FAIL because the homepage still points to `#cv-maintenance` and `dist/cv/index.html` does not exist.

### Task 2: Reactivate the Homepage CTA

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Point the CV CTA at the new selector**

Replace the maintenance CTA entry with:

```js
{ href: "/cv/", label: "Download CV", icon: "download", target: "_blank", rel: "noopener" },
```

- [ ] **Step 2: Render the new-tab attributes**

Add `target` and `rel` to the existing mapped anchor:

```astro
<a
  class:list={["hero-cta", cta.secondary && "hero-cta--secondary"]}
  href={cta.href}
  download={cta.download}
  target={cta.target}
  rel={cta.rel}
>
```

- [ ] **Step 3: Remove the maintenance status**

Delete:

```astro
<p id="cv-maintenance" class="form-status" role="status">
  CV downloads are temporarily under maintenance while I prepare updated CVs.
</p>
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
npm run test:cv
```

Expected: FAIL because `dist/cv/index.html` still does not exist, while the homepage assertion now passes.

### Task 3: Build the Compact `/cv/` Selector

**Files:**
- Create: `src/pages/cv.astro`

- [ ] **Step 1: Add the static selector page**

Create `src/pages/cv.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";

const profiles = [
  { label: "Embedded Software Engineer", href: "/Subhash_CV.pdf" },
  { label: "Software Engineer", href: "/CV_AI_software_engineer.pdf" },
  { label: "Robotics Engineer", href: "/CV_Robotics.pdf" },
  { label: "Edge AI Engineer", href: "/CV_Edge_AI.pdf" }
];
---

<BaseLayout
  title="Choose a CV"
  description="Choose the CV specialization that matches your open role."
>
  <section class="cv-selector-shell" aria-labelledby="cv-selector-title">
    <div class="cv-selector">
      <h1 id="cv-selector-title">Looking for...</h1>

      <nav class="cv-profile-list" aria-label="CV specializations">
        {profiles.map((profile) => (
          <a class="cv-profile-link" href={profile.href}>
            <span>{profile.label}</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </a>
        ))}
      </nav>
    </div>
  </section>

  <style>
    :global(html),
    :global(body) {
      background: #525659;
    }

    :global(body::before),
    :global(body::after) {
      display: none;
    }

    .cv-selector-shell {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 20px;
      background: #525659;
    }

    .cv-selector {
      width: min(100%, 340px);
      padding: 10px;
      border: 1px solid #45494d;
      border-radius: 6px;
      background: #323639;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
    }

    .cv-selector h1 {
      margin: 0;
      padding: 8px 10px 12px;
      color: #f1f3f4;
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 1.3;
    }

    .cv-profile-list {
      overflow: hidden;
      border: 1px solid #4f5357;
      border-radius: 4px;
    }

    .cv-profile-link {
      display: flex;
      min-height: 46px;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 8px 12px;
      color: #f1f3f4;
      font-size: 0.86rem;
      font-weight: 500;
      line-height: 1.3;
      transition: background-color 140ms ease;
    }

    .cv-profile-link + .cv-profile-link {
      border-top: 1px solid #4f5357;
    }

    .cv-profile-link:hover {
      background: #3c4043;
    }

    .cv-profile-link:focus-visible {
      position: relative;
      outline: 2px solid #8ab4f8;
      outline-offset: -2px;
    }

    .cv-profile-link svg {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      stroke: #bdc1c6;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    @media (max-width: 380px) {
      .cv-selector-shell {
        padding: 14px;
      }

      .cv-selector {
        padding: 8px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .cv-profile-link {
        transition: none;
      }
    }
  </style>
</BaseLayout>
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm run test:cv
```

Expected: PASS with 2 tests and 0 failures.

- [ ] **Step 3: Verify formatting and static assets**

Run:

```bash
git diff --check
test -f public/Subhash_CV.pdf
test -f public/CV_AI_software_engineer.pdf
test -f public/CV_Robotics.pdf
test -f public/CV_Edge_AI.pdf
```

Expected: all commands exit with status 0.

- [ ] **Step 4: Commit the implementation**

```bash
git add package.json tests/cv-role-picker.test.mjs src/pages/index.astro src/pages/cv.astro
git commit -m "Add specialized CV role selector"
```

### Task 4: Browser Verification

**Files:**
- Verify only; no planned file changes.

- [ ] **Step 1: Open the homepage and verify the new-tab selector flow**

Run the existing Astro development server and open:

```text
http://127.0.0.1:4321/
```

Confirm:

- The CTA reads **Download CV**.
- Activating it opens `/cv/` separately and leaves the homepage available.
- The maintenance message is absent.

- [ ] **Step 2: Verify the selector interaction**

Open:

```text
http://127.0.0.1:4321/cv/
```

Confirm:

- The selector is centered and no wider than 340px.
- The page uses a compact neutral gray PDF-viewer-inspired style.
- All four role labels are visible and keyboard reachable.
- Each role replaces the selector page with the expected native PDF viewer.

- [ ] **Step 3: Verify responsive layout and runtime health**

Check at desktop and 390x844 mobile viewports.

Expected:

- No clipped or overlapping labels or controls.
- No horizontal scrolling.
- No browser console errors.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run test:cv
git status --short --branch
```

Expected: the focused test passes with 2 tests and 0 failures; only the two unrelated warehouse-blog paths remain untracked.
