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
- `visitorTrackingEndpoint` (Cloudflare Worker visit endpoint)

## Blogging

Use the template in `src/content/blog/TEMPLATE.md`. Instructions are in `src/content/blog/README.md`.

## Deployment

GitHub Actions publishes the site to GitHub Pages. The custom domain is stored in `public/CNAME`.

## Visitor Tracking

See `docs/cloudflare-visitor-tracking.md` for the Cloudflare Worker + D1 setup used to capture visit pings and query recent page opens.
