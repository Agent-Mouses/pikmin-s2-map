# 🌱 Pikmin Bloom S2 Cell Map Tool

> **AI Agent?** Read **[AI-GUIDE.md](AI-GUIDE.md)** for project orientation and operations.

All-in-one mobile web tool for Pikmin Bloom farming strategy — S2 Cell grid, decor catalog, collection tracker, POI map.

**🌐 Live:** https://agent-mouses.github.io/pikmin-s2-map/

## Features

### 🗺️ Map Tab
- **S2 Cell grid overlay** — Level 12-20, viewport-based rendering
- **GPS positioning** — Real-time location + current cell highlight
- **Cell click info** — Cell ID, level, center coordinates
- **Cell marking** — Mark cells as ✅ Farmed / ⏳ Cooldown / ⭐ Bookmarked (persisted in localStorage)
- **POI layer** — Toggle Overpass API to show nearby decor-type locations (restaurants, parks, stations, etc.)

### 📖 Decor Tab
- **Full decor catalog** — 96 categories with all variants and Pikmin types
- **Collection tracking** — Tap to mark collected, persisted in localStorage
- **Filter & search** — By category type (Location/Event/Roadside/Weather/Regional)
- **Progress tracking** — Per-category completion percentage

### 📊 Stats Tab
- **Overall progress** — Total collection percentage
- **By-category breakdown** — Completion stats per decor category
- **Cell mark summary** — Count of farmed/cooldown/bookmarked cells
- **Export/Import** — Backup and restore your data as JSON

## Tech Stack

- **Leaflet.js** — Map rendering (CDN, Canvas renderer)
- **S2 Geometry** — Ported from jonatkins/s2-geometry-javascript
- **Overpass API** — OSM POI querying with multi-server failover
- **localStorage** — Zero-account persistence
- **Vanilla JS** — No build tools, no framework, no backend
- **GitHub Pages** — Free static hosting

## Local Development

```bash
# Any static server works
python3 -m http.server 8080
# Open http://localhost:8080
```

## Credits

Decor data and OSM mapping rules from [scott0127/pik_tool](https://github.com/scott0127/pik_tool) (MIT).
S2 geometry from [jonatkins/s2-geometry-javascript](https://github.com/jonatkins/s2-geometry-javascript).
Decor images from [Pikipedia](https://www.pikminwiki.com/) (CC BY-SA 4.0).
Map data from [OpenStreetMap](https://www.openstreetmap.org/) (ODbL).

See [CREDITS.md](CREDITS.md) for full attribution.

## License

Original code: MIT. Game assets © Nintendo. See [CREDITS.md](CREDITS.md).
