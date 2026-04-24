# Credits & Attribution

## ⚖️ Disclaimer

This is an **unofficial fan tool**, not affiliated with or endorsed by Nintendo or Niantic, Inc.

- **Pikmin Bloom** is a registered trademark of Nintendo and Niantic, Inc.
- All game-related images, names, and data are copyrighted by Nintendo.
- This project does not claim ownership of any game content.
- Usage of game assets is under **fair use** for non-commercial, informational purposes.
- If Nintendo or Niantic requests removal of any content, we will comply immediately.

## 📦 Open Source Projects Referenced

### scott0127/pik_tool
- **URL:** https://github.com/scott0127/pik_tool
- **License:** MIT
- **What we used:**
  - `decor.json` — Complete Pikmin Bloom decor definitions (96 categories, variants, Pikmin type availability, image URLs)
  - OSM tag → decor type mapping rules (42 decor rules with OpenStreetMap tag associations)
  - Overpass API query architecture (multi-server failover, rate limiting, query building pattern)
- **Original author:** scott0127
- **Live tool:** https://pik-tool.onrender.com

### jonatkins/s2-geometry-javascript
- **URL:** https://github.com/jonatkins/s2-geometry-javascript
- **What we used:** Core S2 Cell geometry algorithms ported to our `s2.js`:
  - Lat/Lng ↔ XYZ ↔ Face/UV ↔ ST ↔ IJ coordinate conversions
  - Hilbert curve quad-tree encoding
  - Cell vertex (corner) calculation via IJ offsets
  - Face projection and UV/ST quadratic scaling
- **Original context:** Built for Ingress Intel map S2 Cell visualization

### s2-geometry (npm package)
- **URL:** https://www.npmjs.com/package/s2-geometry
- **License:** MIT / Apache-2.0 / ISC
- **Author:** coolaj86
- **What we referenced:** S2 Cell ID encoding (face + Hilbert position → 64-bit ID), key/id conversion patterns

### pixlpirate/pikmin-map
- **URL:** https://github.com/pixlpirate/pikmin-map
- **License:** AGPL-3.0
- **What we referenced:** Concept of using OpenStreetMap data to map Pikmin Bloom decor locations
- **Live tool:** https://pikmin-map.pixelpirate.fr

### Leaflet.js
- **URL:** https://leafletjs.com/
- **License:** BSD-2-Clause
- **Usage:** Interactive map rendering, tile layers, markers, polygons, GPS geolocation

### OpenStreetMap
- **URL:** https://www.openstreetmap.org/
- **License:** Open Data Commons Open Database License (ODbL)
- **Usage:** Map tile data, POI data via Overpass API

### Overpass API
- **URL:** https://overpass-api.de/
- **Usage:** Querying OpenStreetMap data for POI locations (restaurants, parks, stations, etc.)

### Google S2 Geometry
- **URL:** https://s2geometry.io/
- **License:** Apache-2.0
- **What we referenced:** S2 Cell system documentation, cell statistics, projection algorithms

## 🖼️ Image Sources

### Pikipedia / Pikmin Wiki
- **URL:** https://www.pikminwiki.com/
- **License:** CC BY-SA 4.0
- **Usage:** Pikmin decor images displayed in the decor catalog (loaded from pikmin.wiki.gallery)

## 📝 Community Data Sources

- S2 Cell farming mechanics: Community research shared via Threads (@ai.jc_), Reddit, Pokemon GO Hub
- Decor definitions: Community-maintained dataset from pik_tool project
- OSM tag mappings: Verified against Pikmin Bloom Wiki and Taiwan OSM data

## 📄 This Project's License

The **original code** of this project (s2.js, app.js, poi.js, collection.js, decor-rules.js, index.html) is released under the **MIT License**.

Game assets, images, and trademarks remain the property of their respective owners.
