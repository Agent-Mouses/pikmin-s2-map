// POI layer: Overpass API integration
// Architecture inspired by scott0127/pik_tool (MIT License)

const POI = (() => {
  const SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  let serverIdx = 0, lastReq = 0, abortCtrl = null;

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
        return points;
      } catch (e) {
        if (e.name === 'AbortError') return [];
      }
    }
    return [];
  };

  return { fetchPOIs };
})();
