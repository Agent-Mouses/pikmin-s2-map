// Collection tracker with localStorage persistence
const Collection = (() => {
  const STORAGE_KEY = 'pikmin-s2-collection';
  const CELL_MARKS_KEY = 'pikmin-s2-cell-marks';

  // --- Decor Collection ---
  const loadCollection = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  };
  const saveCollection = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  const isCollected = (itemId) => !!loadCollection()[itemId];
  const toggle = (itemId) => {
    const c = loadCollection();
    c[itemId] ? delete c[itemId] : c[itemId] = Date.now();
    saveCollection(c);
    return !!c[itemId];
  };
  const getStats = (decorData) => {
    const c = loadCollection();
    let total = 0, collected = 0;
    const byCat = {};
    for (const def of decorData) {
      const catId = def.category.id;
      if (!byCat[catId]) byCat[catId] = { total: 0, collected: 0 };
      for (const variant of def.variants) {
        for (const pType of def.availablePikminTypes) {
          const id = `${catId}_${variant.id}_${pType}`;
          total++;
          byCat[catId].total++;
          if (c[id]) { collected++; byCat[catId].collected++; }
        }
      }
    }
    return { total, collected, pct: total ? Math.round(collected / total * 100) : 0, byCat };
  };

  // --- Cell Marks ---
  // New format: { cellKey: { cd_seed?: ts, cd_fruit?: ts, farmed?: true, bookmark?: true } }
  // Legacy: string "cooldown"/"farmed"/"bookmark" or { type, ts? }
  const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h (社群共識)
  const loadMarks = () => {
    try { return JSON.parse(localStorage.getItem(CELL_MARKS_KEY)) || {}; } catch { return {}; }
  };
  const saveMarks = (data) => localStorage.setItem(CELL_MARKS_KEY, JSON.stringify(data));

  // migrate legacy → new format
  const norm = (v) => {
    if (!v) return {};
    if (typeof v === 'string') {
      if (v === 'cooldown') return { cd_seed: Date.now() };
      if (v === 'farmed') return { farmed: true };
      if (v === 'bookmark') return { bookmark: true };
      return {};
    }
    if (v.type) { // old {type, ts?} format
      if (v.type === 'cooldown') return { cd_seed: v.ts || Date.now() };
      if (v.type === 'farmed') return { farmed: true };
      if (v.type === 'bookmark') return { bookmark: true };
    }
    return v; // already new format
  };

  const isExpired = (ts) => ts && Date.now() - ts >= COOLDOWN_MS;
  const isEmpty = (m) => !m.cd_seed && !m.cd_fruit && !m.farmed && !m.bookmark && !m.decor;

  // resolve display type for a cell (for coloring)
  const getCellMark = (cellKey) => {
    const marks = loadMarks();
    const m = norm(marks[cellKey]);
    let dirty = false;
    if (m.cd_seed && isExpired(m.cd_seed)) { delete m.cd_seed; m.farmed = true; dirty = true; }
    if (m.cd_fruit && isExpired(m.cd_fruit)) { delete m.cd_fruit; m.farmed = true; dirty = true; }
    if (dirty) { marks[cellKey] = isEmpty(m) ? undefined : m; if (!marks[cellKey]) delete marks[cellKey]; saveMarks(marks); }
    if (m.cd_seed && m.cd_fruit) return 'cd_both';
    if (m.cd_seed) return 'cd_seed';
    if (m.cd_fruit) return 'cd_fruit';
    if (m.farmed) return 'farmed';
    if (m.bookmark) return 'bookmark';
    return null;
  };

  const setCellMark = (cellKey, markType) => {
    const marks = loadMarks();
    const m = norm(marks[cellKey]);
    if (markType === 'cd_seed') {
      m.cd_seed ? delete m.cd_seed : (m.cd_seed = Date.now());
    } else if (markType === 'cd_fruit') {
      m.cd_fruit ? delete m.cd_fruit : (m.cd_fruit = Date.now());
    } else if (markType === 'farmed') {
      m.farmed ? delete m.farmed : (m.farmed = true);
    } else if (markType === 'bookmark') {
      m.bookmark ? delete m.bookmark : (m.bookmark = true);
    }
    if (isEmpty(m)) delete marks[cellKey]; else marks[cellKey] = m;
    saveMarks(marks);
  };

  const getCooldownRemaining = (cellKey, cdType) => {
    const m = norm(loadMarks()[cellKey]);
    const ts = m[cdType];
    if (!ts) return null;
    const left = COOLDOWN_MS - (Date.now() - ts);
    return left > 0 ? left : 0;
  };

  const getAllMarks = () => {
    const raw = loadMarks(), out = {};
    let dirty = false;
    for (const k in raw) {
      const m = norm(raw[k]);
      let changed = false;
      if (m.cd_seed && isExpired(m.cd_seed)) { delete m.cd_seed; m.farmed = true; changed = true; }
      if (m.cd_fruit && isExpired(m.cd_fruit)) { delete m.cd_fruit; m.farmed = true; changed = true; }
      if (changed) { dirty = true; if (isEmpty(m)) { delete raw[k]; continue; } else raw[k] = m; }
      if (m.cd_seed && m.cd_fruit) out[k] = 'cd_both';
      else if (m.cd_seed) out[k] = 'cd_seed';
      else if (m.cd_fruit) out[k] = 'cd_fruit';
      else if (m.farmed) out[k] = 'farmed';
      else if (m.bookmark) out[k] = 'bookmark';
    }
    if (dirty) saveMarks(raw);
    return out;
  };

  // --- Daily seedling counter ---
  const DAILY_KEY = 'pikmin-s2-daily';
  const today = () => new Date().toISOString().slice(0, 10);
  const loadDaily = () => { try { return JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch { return {}; } };
  const getDailyCount = () => { const d = loadDaily(); return d.date === today() ? (d.count || 0) : 0; };
  const bumpDaily = (n = 1) => { const d = loadDaily(); const c = d.date === today() ? (d.count || 0) : 0; localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today(), count: c + n })); return c + n; };
  const resetDaily = () => { localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today(), count: 0 })); return 0; };

  // --- Cell decor label ---
  const getCellDecor = (cellKey) => { const m = norm(loadMarks()[cellKey]); return m.decor || null; };
  const setCellDecor = (cellKey, decor) => {
    const marks = loadMarks(); const m = norm(marks[cellKey]);
    if (decor) m.decor = decor; else delete m.decor;
    if (isEmpty(m) && !m.decor) delete marks[cellKey]; else marks[cellKey] = m;
    saveMarks(marks);
  };

  return { isCollected, toggle, getStats, getCellMark, setCellMark, getCooldownRemaining, getAllMarks, loadCollection, getDailyCount, bumpDaily, resetDaily, getCellDecor, setCellDecor };
})();
