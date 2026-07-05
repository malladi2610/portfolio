# Portfolio

Lightweight portfolio + blog built with Astro. Hosted on GitHub Pages with a custom domain.

## Quick Start

1. Install dependencies.
2. Run the dev server.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Configuration

Edit `src/config/site.ts`:

- `siteUrl`
- `contactFormEndpoint` (Formspree URL)
- `viewPingUrl` (Google Apps Script Web App URL)

## Blogging

Use the template in `src/content/blog/TEMPLATE.md`. Instructions are in `src/content/blog/README.md`.

## Deployment

GitHub Actions publishes the site to GitHub Pages. The custom domain is stored in `public/CNAME`.

## Page-view Digest

See `docs/google-apps-script-visitor-tracking.md` for the Google Sheets page-view log and daily email digest setup.
