# AI Agent Guide

Static web app for Pikmin Bloom farming strategy. Hosted on GitHub Pages.

## Stack

- **Pure HTML/JS** — no build step, no framework
- **Deploy:** GitHub Pages from `main` branch root
- **Live:** https://agent-mouses.github.io/pikmin-s2-map/

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main app (single page) |
| `app.js` | Map logic, S2 cell rendering, GPS |
| `s2.js` | S2 geometry library |
| `collection.js` | Decor collection tracker |
| `decor.json` | Decor catalog data |
| `poi.js` | POI/Overpass API integration |

## How to Update

1. Edit files directly
2. Push to `main` → GitHub Pages auto-deploys
3. No build step needed
