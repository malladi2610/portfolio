# Frontend Modernization Plan (No Infrastructure Revamp)

## Summary
This plan modernizes the existing UI by removing selected homepage/layout elements, adding two CTA buttons, and extending the bubble visual treatment across the full home page height, while keeping the current Astro structure, routes, and infrastructure unchanged.

## Plan Artifact
- Create plan file: [`frontend_plan.md`](/Users/subhash/Projects/portfolio/frontend_plan.md)
- Use the content of this plan as the file body for review/feedback before implementation.

## Scope Locked
- Remove `Subhash`, `Home`, `Blog`, `Contact` UI elements globally.
- Remove footer copyright and `Built with Astro` globally.
- Remove homepage subtitle text: `Focused writing and projects across systems, intelligence, and autonomous machines.`
- Remove homepage `Latest Writing` section.
- Add two homepage buttons under topic cards: `Download CV` and `Contact Page`.
- Bubble background expansion applies to home page only (top-to-bottom).
- Keep `/blog` and `/contact` routes live (no route removal).

## Files To Change
- [`src/layouts/BaseLayout.astro`](/Users/subhash/Projects/portfolio/src/layouts/BaseLayout.astro)
- [`src/pages/index.astro`](/Users/subhash/Projects/portfolio/src/pages/index.astro)
- [`src/styles/global.css`](/Users/subhash/Projects/portfolio/src/styles/global.css)
- Static asset dependency: [`public/Subhash_CV.pdf`](/Users/subhash/Projects/portfolio/public/Subhash_CV.pdf)

## Implementation Steps

1. Update global layout (no route/infrastructure changes)
- In `BaseLayout.astro`, remove the `<header class="site-header">...</header>` block.
- In `BaseLayout.astro`, remove the `<footer class="site-footer">...</footer>` block.
- Keep `<main><slot /></main>` and all SEO/meta logic unchanged.
- Keep page/component structure intact; no new layout system.

2. Update homepage content structure
- In `index.astro`, remove `<p class="hero-subtitle">Focused writing...</p>`.
- Remove the entire `Latest Writing` section block (`<section class="section">...</section>` currently below hero).
- Add a new CTA row directly below the existing topic row with:
  - `Download CV` linking to `/Subhash_CV.pdf` and using `download` attribute.
  - `Contact Page` linking to `/contact/`.

3. Expand bubble background from top to bottom on home page
- In `index.astro`, wrap home content in a page-level container (e.g., `.home-shell`) and keep bubble elements at shell level instead of hero-only containment.
- Ensure bubble elements are in a dedicated layer (e.g., `.bubble-layer`) with `pointer-events: none`.
- In `global.css`, define home-shell layering so bubbles are visible behind all homepage sections from top to bottom.
- Reposition/add bubble variants as needed to cover upper, middle, and lower home-page zones.
- Keep motion behavior and `prefers-reduced-motion` support.

4. CSS cleanup and consistency
- In `global.css`, remove obsolete `.site-header`, `.site-logo`, `.site-nav`, and `.site-footer` styling after layout markup removal.
- Add styles for new CTA container/buttons (desktop + mobile).
- Keep existing typography/colors/tokens and Astro file architecture unchanged.

5. CV asset readiness
- Add final CV file at `public/Subhash_CV.pdf`.
- If missing, button will resolve to 404; treat this as pre-deploy blocker for this task.

## Public APIs / Interfaces / Types
- No TypeScript interfaces or schema changes.
- UI contract changes:
  - Global layout no longer renders header/footer navigation UI.
  - Homepage exposes new CTA links: `/Subhash_CV.pdf` and `/contact/`.
- Route contracts unchanged (`/`, `/blog`, `/contact`, `/topics/*` remain available).

## Test Cases and Scenarios

1. Global layout verification
- Open `/`, `/blog/`, `/contact/`, and a blog post page.
- Confirm no `Subhash/Home/Blog/Contact` top UI is rendered.
- Confirm no footer copyright or `Built with Astro`.

2. Homepage content verification
- Confirm title `Electronics | AI | Robotics` remains.
- Confirm `Focused writing...` subtitle is removed.
- Confirm `Latest Writing` section is removed.

3. CTA verification
- Confirm `Download CV` appears below topic cards and points to `/Subhash_CV.pdf`.
- Confirm `Contact Page` appears and routes to `/contact/`.
- Confirm keyboard focus order is logical and both buttons are tabbable.

4. Bubble background coverage
- Confirm bubbles/background are visible from top to bottom of homepage content.
- Confirm no clipping gaps when scrolling.
- Confirm bubbles do not block clicks (`pointer-events: none` behavior).

5. Responsive checks
- Validate at common widths (mobile/tablet/desktop).
- Confirm CTA layout stacks/wraps cleanly and no overlap with bubbles.

6. Accessibility/safety regression checks
- Verify contrast and text readability over bubble layer.
- Verify `prefers-reduced-motion` disables bubble animation.

## Assumptions and Defaults
- `Download CV` target is fixed to `/Subhash_CV.pdf`.
- Header/footer removal is global by design.
- Bubble expansion is limited to the homepage.
- No infrastructure revamp: no new framework, no route deletions, no content-model changes, no deployment pipeline changes.
