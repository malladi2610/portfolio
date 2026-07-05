# CV Role Picker Design

## Goal

Replace the temporary CV maintenance state with a small role picker on the homepage. A recruiter chooses the specialization relevant to the vacancy, and the matching PDF opens in the browser's native viewer.

The site will not embed or render PDFs itself.

## Recruiter Flow

1. The recruiter clicks **Download CV** on the homepage.
2. A native modal dialog opens with the heading **Looking for...**.
3. The dialog presents four vertical role options:
   - Embedded Software Engineer
   - Software Engineer
   - Robotics Engineer
   - Edge AI Engineer
4. Selecting a role opens its PDF in a new browser tab.
5. The dialog closes, and the portfolio remains available in the original tab.

The dialog can be closed with its close button, the Escape key, or a backdrop click.

## CV Mapping

| Role label | PDF |
| --- | --- |
| Embedded Software Engineer | `/Subhash_CV.pdf` |
| Software Engineer | `/CV_AI_software_engineer.pdf` |
| Robotics Engineer | `/CV_Robotics.pdf` |
| Edge AI Engineer | `/CV_Edge_AI.pdf` |

These PDF URLs are also the direct, shareable specialization links. No separate `/cv/` page or role query-string routing will be added.

## Visual Design

The dialog will use the approved command-menu presentation:

- A narrow vertical panel with a maximum width of approximately 430px.
- One restrained accent color matching the existing homepage.
- A document icon beside the heading.
- Four rows in one cohesive bordered list rather than separate colored cards.
- A monochrome line icon for each role and an external-link icon at the right.
- Subtle depth, backdrop blur, hover feedback, and a short opening transition.
- Border radii no greater than 8px.
- No role descriptions, multicolor accents, dropdowns, or embedded preview.

On small screens, the dialog stays within the viewport and role names wrap without overlapping icons or controls.

## Implementation

The change stays within the existing Astro homepage and global stylesheet:

- Replace the maintenance anchor with a real button that opens the dialog.
- Remove the maintenance status message.
- Add the native `<dialog>` markup to the homepage.
- Add minimal client-side behavior for opening, closing, and backdrop clicks.
- Close the dialog in the original tab after a role link is activated.
- Use ordinary links with `target="_blank"` and `rel="noopener"` for the four PDFs.
- Add scoped dialog and role-list styles to the existing global stylesheet.
- Reuse inline SVG icon styling; add no package dependencies and no new page route.

The existing contact CTA, topic navigation, typewriter behavior, and pointer effects remain unchanged.

## Accessibility

- Use a native `<dialog>` with `aria-labelledby`.
- Use a semantic button to open the dialog and a labeled icon button to close it.
- Use semantic links for role choices.
- Preserve visible keyboard focus styles.
- Rely on the native dialog for focus management and Escape-key dismissal.
- Disable the opening transition when reduced motion is requested.

## Failure Behavior

The PDFs are static assets. If a mapped PDF is missing, its link would return a 404; verification must confirm all four files exist and are emitted by the production build.

Browser PDF behavior is intentionally delegated to the visitor's platform. Desktop browsers usually show a native viewer, while some mobile devices may open a PDF application or download the file.

## Verification

- Run the production Astro build successfully.
- Assert that generated homepage markup contains the dialog, all four role labels, all four PDF paths, and new-tab link attributes.
- Assert that the maintenance message is absent.
- Test opening and closing the dialog with pointer and keyboard input.
- Confirm that role selection closes the dialog in the original tab.
- Test each role link and confirm its mapped PDF is reachable.
- Check desktop and mobile layouts for clipping, overlap, and readable wrapping.
- Confirm no browser console errors during the interaction.

## Out of Scope

- Custom PDF rendering or an embedded PDF viewer.
- A homepage dropdown.
- A dedicated CV page.
- CV analytics or download tracking.
- Changes to the CV documents themselves.
