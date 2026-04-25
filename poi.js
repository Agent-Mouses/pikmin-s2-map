// POI layer: Overpass API with wide-area preload + local filtering
// Architecture inspired by scott0127/pik_tool (MIT License)

const POI = (() => {
  const SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  let serverIdx = 0, lastReq = 0, abortCtrl = null;

  // --- In-memory store: all loaded POIs + loaded region ---
  let allPoints = [];
  let loadedRegion = null; // { south, west, north, east }

  // --- localStorage cache (persist across sessions) ---
  const CACHE_KEY = 'pikmin-s2-poi-store';
  const CACHE_TTL = 30 * 60 * 1000;

  const loadStore = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; } };
  const saveStore = () => {
    if (!loadedRegion || !allPoints.length) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ region: loadedRegion, points: allPoints, ts: Date.now() })); } catch { /* quota */ }
  };

  // Restore from localStorage on init
  const restore = () => {
    const s = loadStore();
    if (s && Date.now() - s.ts < CACHE_TTL && s.region && s.points) {
      allPoints = s.points;
      loadedRegion = s.region;
      return true;
    }
    return false;
  };
  restore();

  // --- Filter points within viewport (instant, no API) ---
  const filterInBounds = (bounds) =>
    allPoints.filter(p => p.lat >= bounds.south && p.lat <= bounds.north && p.lon >= bounds.west && p.lon <= bounds.east);

  // --- Check if viewport is within loaded region ---
  const isWithinLoaded = (bounds) =>
    loadedRegion &&
    bounds.south >= loadedRegion.south && bounds.north <= loadedRegion.north &&
    bounds.west >= loadedRegion.west && bounds.east <= loadedRegion.east;

  // --- Expand bounds to ~2km for preload ---
  const expandBounds = (bounds) => {
    const PAD = 0.01; // ~1km each direction → ~2km total
    return {
      south: bounds.south - PAD, north: bounds.north + PAD,
      west: bounds.west - PAD, east: bounds.east + PAD
    };
  };

  // --- Build compact Overpass query ---
  const buildQuery = (bounds, rules) => {
    const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    const grouped = new Map();
    for (const rule of rules) {
      for (const tag of rule.tags) {
        const [k, v] = tag.split('=');
        if (k && v) {
          if (!grouped.has(k)) grouped.set(k, new Set());
          grouped.get(k).add(v);
        }
      }
    }
    if (!grouped.size) return '';
    const parts = [];
    for (const [k, vals] of grouped) {
      const filter = vals.size === 1
        ? `["${k}"="${[...vals][0]}"]`
        : `["${k}"~"^(${[...vals].join('|')})$"]`;
      parts.push(`  nw${filter}(${bbox});`);
    }
    return `[out:json][timeout:25];\n(\n${parts.join('\n')}\n);\nout center qt 2000;`;
  };

  const matchRule = (tags, rulesMap) => {
    for (const [, rule] of rulesMap) {
      for (const t of rule.tags) {
        const [k, v] = t.split('=');
        if (k && v && tags[k] === v) return rule;
      }
    }
    return null;
  };

  // --- Fetch from Overpass (only when needed) ---
  const fetchFromAPI = async (fetchBounds, rules) => {
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    const now = Date.now();
    if (now - lastReq < 2000) await new Promise(r => setTimeout(r, 2000 - (now - lastReq)));
    lastReq = Date.now();

    const query = buildQuery(fetchBounds, rules);
    if (!query) return [];

    const rulesMap = new Map(rules.map(r => [r.id, r]));

    for (let i = 0; i < SERVERS.length; i++) {
      const url = SERVERS[(serverIdx + i) % SERVERS.length];
      try {
        const res = await fetch(url, {
          method: 'POST', body: query,
          headers: { 'Content-Type': 'text/plain' },
          signal: abortCtrl.signal
        });
        if (res.status === 429) { serverIdx = (serverIdx + 1) % SERVERS.length; continue; }
        if (!res.ok) continue;
        const data = await res.json();
        const points = [];
        for (const el of data.elements) {
          if (!el.tags) continue;
          const lat = el.type === 'node' ? el.lat : el.center?.lat;
          const lon = el.type === 'node' ? el.lon : el.center?.lon;
          if (!lat || !lon) continue;
          const rule = matchRule(el.tags, rulesMap);
          if (!rule) continue;
          points.push({
            id: `${el.type}-${el.id}`, lat, lon,
            name: el.tags.name || el.tags['name:zh'] || el.tags['name:zh-TW'] || el.tags['name:en'] || rule.name,
            decorId: rule.id, decorName: rule.name, decorIcon: rule.icon
          });
        }
        return points;
      } catch (e) {
        if (e.name === 'AbortError') return null;
      }
    }
    return [];
  };

  // --- Main API: get POIs for viewport ---
  // Returns { points, loading } — points are instant, loading = true means background fetch in progress
  const getPOIs = (viewBounds, rules, onUpdate) => {
    // Always return what we have instantly
    const instant = loadedRegion ? filterInBounds(viewBounds) : [];

    if (isWithinLoaded(viewBounds)) {
      return { points: instant, loading: false };
    }

    // Need to fetch — do it in background
    const fetchBounds = expandBounds(viewBounds);
    fetchFromAPI(fetchBounds, rules).then(newPoints => {
      if (!newPoints) return; // aborted
      // Merge: dedupe by id
      const seen = new Set(newPoints.map(p => p.id));
      const kept = allPoints.filter(p => !seen.has(p.id));
      allPoints = [...kept, ...newPoints];
      // Expand loaded region
      loadedRegion = loadedRegion ? {
        south: Math.min(loadedRegion.south, fetchBounds.south),
        north: Math.max(loadedRegion.north, fetchBounds.north),
        west: Math.min(loadedRegion.west, fetchBounds.west),
        east: Math.max(loadedRegion.east, fetchBounds.east)
      } : fetchBounds;
      saveStore();
      if (onUpdate) onUpdate(filterInBounds(viewBounds));
    });

    return { points: instant, loading: true };
  };

  // Reset (when user toggles POI off)
  const clear = () => { allPoints = []; loadedRegion = null; };

  return { getPOIs, filterInBounds, clear };
})();
