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
  const loadMarks = () => {
    try { return JSON.parse(localStorage.getItem(CELL_MARKS_KEY)) || {}; } catch { return {}; }
  };
  const saveMarks = (data) => localStorage.setItem(CELL_MARKS_KEY, JSON.stringify(data));

  const MARK_TYPES = { farmed: '✅', cooldown: '⏳', bookmark: '⭐' };
  const getCellMark = (cellKey) => loadMarks()[cellKey] || null;
  const setCellMark = (cellKey, markType) => {
    const m = loadMarks();
    if (m[cellKey] === markType) delete m[cellKey]; else m[cellKey] = markType;
    saveMarks(m);
    return m[cellKey] || null;
  };
  const getAllMarks = () => loadMarks();

  return { isCollected, toggle, getStats, getCellMark, setCellMark, getAllMarks, MARK_TYPES, loadCollection };
})();
