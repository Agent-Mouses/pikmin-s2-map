// POI layer: Overpass API integration
// Architecture inspired by scott0127/pik_tool (MIT License)

const POI = (() => {
  const SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  let serverIdx = 0, lastReq = 0, abortCtrl = null;

  // --- Cache: localStorage + TTL (30 min) ---
  const CACHE_KEY = 'pikmin-s2-poi-cache';
  const CACHE_TTL = 30 * 60 * 1000;
  const CACHE_MAX = 20;

  const cacheKey = (bounds) => `${bounds.south.toFixed(3)},${bounds.west.toFixed(3)},${bounds.north.toFixed(3)},${bounds.east.toFixed(3)}`;

  const loadCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; } };
  const saveCache = (c) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* quota */ } };

  const getCached = (key) => {
    const c = loadCache();
    const entry = c[key];
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    if (entry) { delete c[key]; saveCache(c); }
    return null;
  };

  const setCache = (key, data) => {
    const c = loadCache();
    c[key] = { data, ts: Date.now() };
    // evict oldest if over limit
    const keys = Object.keys(c);
    if (keys.length > CACHE_MAX) {
      keys.sort((a, b) => c[a].ts - c[b].ts);
      keys.slice(0, keys.length - CACHE_MAX).forEach(k => delete c[k]);
    }
    saveCache(c);
  };

  const buildQuery = (bounds, rules) => {
    const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    const queries = [];
    for (const rule of rules) {
      for (const tag of rule.tags) {
        const [k, v] = tag.split('=');
        if (k && v) {
          queries.push(`  node["${k}"="${v}"](${bbox});`);
          queries.push(`  way["${k}"="${v}"](${bbox});`);
        }
      }
    }
    if (!queries.length) return '';
    return `[out:json][timeout:30];\n(\n${queries.join('\n')}\n);\nout center;`;
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

  const fetchPOIs = async (bounds, rules, onStatus) => {
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    const ck = cacheKey(bounds);
    const cached = getCached(ck);
    if (cached) return cached;

    const now = Date.now();
    if (now - lastReq < 2000) await new Promise(r => setTimeout(r, 2000 - (now - lastReq)));
    lastReq = Date.now();

    const query = buildQuery(bounds, rules);
    if (!query) return [];

    const rulesMap = new Map(rules.map(r => [r.id, r]));

    for (let i = 0; i < SERVERS.length; i++) {
      const url = SERVERS[(serverIdx + i) % SERVERS.length];
      if (onStatus) onStatus(`查詢興趣點中...`);
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
        setCache(ck, points);
        return points;
      } catch (e) {
        if (e.name === 'AbortError') return [];
      }
    }
    return [];
  };

  return { fetchPOIs };
})();
