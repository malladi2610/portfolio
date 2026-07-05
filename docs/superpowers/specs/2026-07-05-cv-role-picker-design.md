# CV Role Picker Design

## Goal

Replace the temporary CV maintenance state with a dedicated, compact role picker at `/cv/`. A recruiter chooses the specialization relevant to the vacancy, and the matching PDF opens in the browser's native viewer.

The site will not embed or render PDFs itself.

## Recruiter Flow

1. The recruiter clicks **Download CV** on the homepage.
2. The browser opens `/cv/` in a new tab.
3. The new tab shows a small selector with the heading **Looking for...** and four vertical role options:
   - Embedded Software Engineer
   - Software Engineer
   - Robotics Engineer
   - Edge AI Engineer
4. Selecting a role replaces the selector tab with the matching PDF in the browser's native viewer.
5. The portfolio remains untouched in the original tab.

The browser decides whether `target="_blank"` creates a tab or window according to the visitor's settings. The site will not request a sized popup window.

## CV Mapping

| Role label | PDF |
| --- | --- |
| Embedded Software Engineer | `/Subhash_CV.pdf` |
| Software Engineer | `/CV_AI_software_engineer.pdf` |
| Robotics Engineer | `/CV_Robotics.pdf` |
| Edge AI Engineer | `/CV_Edge_AI.pdf` |

These PDF URLs are also direct, shareable specialization links. The `/cv/` page is the shareable generic role selector; no role query-string routing will be added.

## Visual Design

The `/cv/` page will use a compact, PDF-viewer-inspired presentation:

- A neutral dark-gray page similar in tone and density to common native PDF viewers.
- A narrow selector with a maximum width of approximately 340px.
- A small **Looking for...** heading above four compact rows.
- Four rows in one cohesive list rather than separate cards.
- Monochrome controls, one restrained accent, tight spacing, and subtle hover feedback.
- Row heights of approximately 44-48px and border radii no greater than 6px.
- No role descriptions, decorative effects, multicolor accents, dropdowns, or embedded preview.
- No fake browser toolbar or controls that could be mistaken for browser chrome.

On small screens, the selector stays within the viewport and role names wrap without overlapping controls.

## Implementation

The change uses the existing Astro homepage plus one small static page:

- Replace the maintenance anchor with a normal `/cv/` link using `target="_blank"` and `rel="noopener"`.
- Remove the maintenance status message.
- Add `src/pages/cv.astro` for the compact role selector.
- Use ordinary same-tab links from `/cv/` to the four PDFs so the native viewer replaces the selector tab.
- Keep selector styling scoped to the new page or to narrowly named global classes.
- Add no client-side JavaScript, package dependencies, or custom PDF renderer.

The existing contact CTA, topic navigation, typewriter behavior, and pointer effects remain unchanged.

## Accessibility

- Use a semantic homepage link with a descriptive accessible name.
- Give the `/cv/` page a clear document title and heading.
- Use semantic links for role choices.
- Preserve visible keyboard focus styles.
- Keep all role choices reachable in a logical keyboard order.

## Failure Behavior

The PDFs are static assets. If a mapped PDF is missing, its link would return a 404; verification must confirm all four files exist and are emitted by the production build.

Browser PDF behavior is intentionally delegated to the visitor's platform. Desktop browsers usually show a native viewer, while some mobile devices may open a PDF application or download the file.

## Verification

- Run the production Astro build successfully.
- Assert that generated homepage markup contains the `/cv/` link and new-tab attributes.
- Assert that generated `/cv/` markup contains all four role labels and all four PDF paths.
- Assert that the maintenance message is absent.
- Confirm the homepage link opens the selector in a new tab in a standard browser.
- Test each role link and confirm its mapped PDF is reachable.
- Check desktop and mobile layouts for clipping, overlap, and readable wrapping.
- Confirm no browser console errors during the interaction.

## Out of Scope

- Custom PDF rendering or an embedded PDF viewer.
- A homepage dropdown.
- An in-page homepage modal.
- A script-opened or sized popup window.
- CV analytics or download tracking.
- Changes to the CV documents themselves.
