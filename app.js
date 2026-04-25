// Pikmin Bloom S2 Cell 地圖工具
(() => {
  'use strict';

  let currentLevel = 17, currentTab = 'map';
  let cellLayer = null, userMarker = null, userCellHL = null, selCellHL = null;
  let poiLayer = null, poiEnabled = false, decorData = null;
  let pureLayer = null, pureEnabled = false;
  let moveTimer = null, lastBounds = null;
  const LEVEL_COLORS = {
    12:'#e74c3c',13:'#e67e22',14:'#f1c40f',15:'#2ecc71',16:'#1abc9c',
    17:'#3498db',18:'#9b59b6',19:'#e91e63',20:'#795548'
  };
  const LEVEL_DESC = {
    12:'區域級',13:'城市級',14:'行政區',15:'社區級',16:'街區 (~150m)',
    17:'飾品格 (~50-70m) 🌱',18:'精細 (~30m)',19:'極細 (~15m)',20:'超細 (~8m)'
  };
  const MARK_COLORS = { farmed: '#4ade80', cd_seed: '#fbbf24', cd_fruit: '#fb923c', cd_both: '#ef4444', bookmark: '#f472b6' };
  const MARK_LABELS = { cd_seed: '🌱 盆CD', cd_fruit: '🍎 果CD', farmed: '✅ 已刷', bookmark: '⭐ 收藏' };
  const fmtMs = (ms) => { const h = Math.floor(ms/3600000), m = Math.floor(ms%3600000/60000); return `${h}h ${m}m`; };
  let cdInterval = null;

  const $ = (id) => document.getElementById(id);

  const map = L.map('map', { center: [25.033, 121.565], zoom: 16, zoomControl: false, renderer: L.canvas() });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom: 21
  }).addTo(map);

  // --- 分頁切換 ---
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${currentTab}`));
      if (currentTab === 'map') { map.invalidateSize(); renderCells(); }
      if (currentTab === 'decor') renderDecorCatalog();
      if (currentTab === 'collection') renderCollectionStats();
    });
  });

  // --- Level 控制 ---
  const slider = $('level-slider');
  const updateLevel = () => {
    $('level-display').textContent = `L${currentLevel}`;
    $('level-info').textContent = LEVEL_DESC[currentLevel] || '';
    slider.value = currentLevel;
  };
  slider.addEventListener('input', e => { currentLevel = +e.target.value; updateLevel(); lastBounds = null; renderCells(); });
  document.querySelectorAll('.level-btn').forEach(b =>
    b.addEventListener('click', () => { currentLevel = +b.dataset.level; updateLevel(); lastBounds = null; renderCells(); })
  );

  // --- 格子渲染 ---
  const renderCells = () => {
    if (cellLayer) map.removeLayer(cellLayer);
    if (selCellHL) { map.removeLayer(selCellHL); selCellHL = null; }
    const b = map.getBounds();
    const bounds = { sw: { lat: b.getSouth(), lng: b.getWest() }, ne: { lat: b.getNorth(), lng: b.getEast() } };
    const cells = S2.getCellsInBounds(bounds, currentLevel);
    if (cells.size > 3000) { $('cell-count').textContent = `格子太多，請放大地圖`; return; }

    const marks = Collection.getAllMarks();
    const color = LEVEL_COLORS[currentLevel] || '#3498db';
    const group = L.featureGroup();

    cells.forEach(cell => {
      const corners = S2.cellCorners(cell);
      const latlngs = corners.map(c => [c.lat, c.lng]);
      const key = S2.cellKey(cell);
      const mark = marks[key];
      const poly = L.polygon(latlngs, {
        color: mark ? MARK_COLORS[mark] : color,
        weight: mark ? 2.5 : 1,
        opacity: mark ? 0.9 : 0.6,
        fillOpacity: mark ? 0.2 : 0.05,
        fillColor: mark ? MARK_COLORS[mark] : color,
        interactive: true
      });
      poly.on('click', () => showCellInfo(cell, corners, key));
      group.addLayer(poly);
    });

    cellLayer = group.addTo(map);
    $('cell-count').textContent = `${cells.size} 格`;
    if (userMarker) { const ll = userMarker.getLatLng(); highlightUserCell(ll.lat, ll.lng); }
  };

  const showCellInfo = (cell, corners, key) => {
    if (selCellHL) map.removeLayer(selCellHL);
    selCellHL = L.polygon(corners.map(c => [c.lat, c.lng]), {
      color: '#ff0', weight: 3, opacity: 0.9, fillOpacity: 0.25, fillColor: '#ff0', interactive: false
    }).addTo(map);

    const center = S2.cellCenter(cell);
    const id = S2.cellId(cell);
    const mark = Collection.getCellMark(key);
    const cdSeed = Collection.getCooldownRemaining(key, 'cd_seed');
    const cdFruit = Collection.getCooldownRemaining(key, 'cd_fruit');
    const cdRows = [
      cdSeed > 0 ? `<div class="info-row"><span class="info-label">🌱 盆 CD</span><span class="info-value cd-timer" data-cd="cd_seed">${fmtMs(cdSeed)}</span></div>` : '',
      cdFruit > 0 ? `<div class="info-row"><span class="info-label">🍎 果 CD</span><span class="info-value cd-timer" data-cd="cd_fruit">${fmtMs(cdFruit)}</span></div>` : ''
    ].join('');
    const markBtns = Object.entries(MARK_LABELS).map(([type, label]) => {
      const active = type === mark || (type === 'cd_seed' && (mark === 'cd_seed' || mark === 'cd_both'))
        || (type === 'cd_fruit' && (mark === 'cd_fruit' || mark === 'cd_both'));
      return `<button class="mark-btn ${active ? 'active' : ''}" data-mark="${type}" data-key="${key}">${label}</button>`;
    }).join('');

    const curDecor = Collection.getCellDecor(key);
    const decorOpts = DECOR_RULES.map(r => `<option value="${r.icon} ${r.name}" ${curDecor === `${r.icon} ${r.name}` ? 'selected' : ''}>${r.icon} ${r.name}</option>`).join('');

    $('info-content').innerHTML = `
      <div class="info-row"><span class="info-label">格子 ID</span><span class="info-value clickable" title="點擊複製">${id}</span></div>
      <div class="info-row"><span class="info-label">等級</span><span class="info-value">${currentLevel}</span></div>
      <div class="info-row"><span class="info-label">中心座標</span><span class="info-value">${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}</span></div>
      ${cdRows}
      <select class="decor-select" id="cell-decor-select"><option value="">— 飾品類型 —</option>${decorOpts}</select>
      <div class="mark-row">${markBtns}</div>
    `;
    $('cell-decor-select').addEventListener('change', e => Collection.setCellDecor(key, e.target.value));
    $('info-content').querySelector('.clickable').onclick = () => navigator.clipboard.writeText(id);
    $('info-content').querySelectorAll('.mark-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Collection.setCellMark(btn.dataset.key, btn.dataset.mark);
        renderCells();
        showCellInfo(cell, corners, key);
      });
    });
    $('info-panel').classList.add('visible');
    // live countdown
    clearInterval(cdInterval);
    const hasCD = (cdSeed > 0) || (cdFruit > 0);
    if (hasCD) cdInterval = setInterval(() => {
      let any = false;
      for (const t of ['cd_seed', 'cd_fruit']) {
        const r = Collection.getCooldownRemaining(key, t);
        const el = $('info-content')?.querySelector(`.cd-timer[data-cd="${t}"]`);
        if (el && r > 0) { el.textContent = fmtMs(r); any = true; }
      }
      if (!any) { clearInterval(cdInterval); renderCells(); showCellInfo(cell, corners, key); }
    }, 60000);
  };

  $('info-close').addEventListener('click', () => {
    $('info-panel').classList.remove('visible');
    clearInterval(cdInterval);
    if (selCellHL) { map.removeLayer(selCellHL); selCellHL = null; }
  });

  // --- GPS ---
  let watchId = null, detectorCircle = null;
  const highlightUserCell = (lat, lng) => {
    if (userCellHL) map.removeLayer(userCellHL);
    const cell = S2.cellFromLatLng(lat, lng, currentLevel);
    userCellHL = L.polygon(S2.cellCorners(cell).map(c => [c.lat, c.lng]), {
      color: '#00e5ff', weight: 3, opacity: 0.9, fillOpacity: 0.2, fillColor: '#00e5ff', interactive: false
    }).addTo(map);
  };

  $('gps-btn').addEventListener('click', () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId); watchId = null;
      $('gps-btn').classList.remove('active');
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (userCellHL) { map.removeLayer(userCellHL); userCellHL = null; }
      if (detectorCircle) { map.removeLayer(detectorCircle); detectorCircle = null; }
      return;
    }
    if (!navigator.geolocation) return alert('此裝置不支援定位功能');
    $('gps-btn').classList.add('active');
    watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (!userMarker) {
          userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#00e5ff', fillOpacity: 1 }).addTo(map);
          map.setView([lat, lng], Math.max(map.getZoom(), 16));
        } else userMarker.setLatLng([lat, lng]);
        highlightUserCell(lat, lng);
        // detector 100m circle
        if (!detectorCircle) {
          detectorCircle = L.circle([lat, lng], { radius: 100, color: '#00e5ff', weight: 1, opacity: 0.4, fillOpacity: 0.06, dashArray: '6,4', interactive: false }).addTo(map);
        } else detectorCircle.setLatLng([lat, lng]);
      },
      err => { alert('定位失敗：' + err.message); $('gps-btn').classList.remove('active'); watchId = null; },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  });

  // --- POI 圖層 ---
  const poiRules = () => DECOR_RULES.filter(r => r.tags.length > 0);
  const viewBounds = () => { const b = map.getBounds(); return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }; };

  const renderPOILayer = (points) => {
    if (poiLayer) map.removeLayer(poiLayer);
    poiLayer = L.featureGroup();
    for (const p of points) {
      const marker = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: 'poi-icon', html: `<span>${p.decorIcon}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] })
      });
      marker.bindPopup(`<b>${p.decorIcon} ${p.name}</b><br><small>${p.decorName}</small>`);
      poiLayer.addLayer(marker);
    }
    poiLayer.addTo(map);
  };

  const refreshPOIs = () => {
    if (!poiEnabled) return;
    const { points, loading } = POI.getPOIs(viewBounds(), poiRules(), (updated) => {
      renderPOILayer(updated);
      $('poi-toggle').textContent = '📍';
      if (pureEnabled) analyzePureCells();
    });
    renderPOILayer(points);
    $('poi-toggle').textContent = loading ? '⏳' : '📍';
  };

  $('poi-toggle').addEventListener('click', () => {
    poiEnabled = !poiEnabled;
    $('poi-toggle').classList.toggle('active', poiEnabled);
    if (poiEnabled) { refreshPOIs(); }
    else { if (poiLayer) { map.removeLayer(poiLayer); poiLayer = null; } POI.clear(); if (pureEnabled) { pureEnabled = false; $('pure-toggle').classList.remove('active'); if (pureLayer) { map.removeLayer(pureLayer); pureLayer = null; } } }
  });

  // --- 純點搜尋 ---
  const analyzePureCells = () => {
    if (pureLayer) map.removeLayer(pureLayer);
    pureLayer = L.featureGroup();
    const points = POI.filterInBounds(viewBounds());
    // group POIs by L17 cell
    const cells = new Map();
    for (const p of points) {
      const cell = S2.cellFromLatLng(p.lat, p.lon, 17);
      const k = S2.cellKey(cell);
      if (!cells.has(k)) cells.set(k, { cell, decors: new Set() });
      cells.get(k).decors.add(p.decorId);
    }
    let count = 0;
    cells.forEach(({ cell, decors }) => {
      if (decors.size !== 1) return;
      count++;
      const decorId = [...decors][0];
      const rule = DECOR_RULES.find(r => r.id === decorId);
      const corners = S2.cellCorners(cell).map(c => [c.lat, c.lng]);
      const poly = L.polygon(corners, { color: '#facc15', weight: 2.5, opacity: 0.9, fillOpacity: 0.3, fillColor: '#facc15', interactive: false });
      pureLayer.addLayer(poly);
      const center = S2.cellCenter(cell);
      const label = L.marker([center.lat, center.lng], {
        icon: L.divIcon({ className: 'poi-icon', html: `<span style="font-size:16px">${rule?.icon || '📦'}</span>`, iconSize: [20, 20], iconAnchor: [10, 10] }),
        interactive: false
      });
      pureLayer.addLayer(label);
    });
    pureLayer.addTo(map);
    $('pure-toggle').textContent = count ? `💎${count}` : '💎';
  };

  $('pure-toggle').addEventListener('click', () => {
    pureEnabled = !pureEnabled;
    $('pure-toggle').classList.toggle('active', pureEnabled);
    if (pureEnabled) {
      if (!poiEnabled) { poiEnabled = true; $('poi-toggle').classList.add('active'); }
      refreshPOIs();
      analyzePureCells();
    } else {
      if (pureLayer) { map.removeLayer(pureLayer); pureLayer = null; }
      $('pure-toggle').textContent = '💎';
    }
  });

  // --- 飾品圖鑑 ---
  // Map noto: icon names to emoji (Iconify noto set → Unicode emoji)
  const ICON_MAP = {
    'noto:man-cook':'🍽️','noto:hot-beverage':'☕','noto:doughnut':'🍩','noto:baguette-bread':'🥐',
    'noto:hamburger':'🍔','noto:pizza':'🍕','noto:steaming-bowl':'🍜','noto:sushi':'🍣',
    'noto:curry-rice':'🍛','noto:taco':'🌮','noto:bento-box':'🍱','noto:pot-of-food':'🍲',
    'noto:four-leaf-clover':'🍀','noto:deciduous-tree':'🌲','noto:cherry-blossom':'🌸',
    'noto:blossom':'🌼','noto:fallen-leaf':'🍂','noto:mushroom':'🍄','noto:bouquet':'💐',
    'noto:spiral-shell':'🐚','noto:tropical-fish':'🐠','noto:snow-capped-mountain':'🏔️',
    'noto:locomotive':'🚂','noto:bus':'🚌','noto:airplane':'✈️','noto:bridge-at-night':'🌉',
    'noto:running-shoe':'👟','noto:skateboard':'🛹','noto:person-surfing':'🏄',
    'noto:postbox':'✉️','noto:scissors':'✂️','noto:toothbrush':'🪥','noto:ribbon':'🎀',
    'noto:framed-picture':'🖼️','noto:artist-palette':'🎨','noto:popcorn':'🍿','noto:musical-note':'🎵',
    'noto:fishing-pole':'🎣','noto:ferris-wheel':'🎡','noto:soccer-ball':'⚽',
    'noto:video-game':'🎮','noto:chess-pawn':'♟️','noto:mahjong-red-dragon':'🀄',
    'noto:books':'📚','noto:graduation-cap':'🎓','noto:camera-with-flash':'📸',
    'noto:glasses':'👓','noto:lipstick':'💄','noto:t-shirt':'👕','noto:gloves':'🧤',
    'noto:hammer':'🔨','noto:key':'🔑','noto:battery':'🔋',
    'noto:banana':'🍌','noto:tangerine':'🍊','noto:egg':'🥚','noto:cheese-wedge':'🧀',
    'noto:chocolate-bar':'🍫','noto:ice-cream':'🍦','noto:shaved-ice':'🍧',
    'noto:cupcake':'🧁','noto:birthday-cake':'🎂','noto:moon-cake':'🥮',
    'noto:beverage-box':'🧃','noto:teapot':'🫖','noto:baby-bottle':'🍼',
    'noto:coin':'🪙','noto:wrapped-gift':'🎁','noto:confetti-ball':'🎊',
    'noto:party-popper':'🎉','noto:jack-o-lantern':'🎃','noto:christmas-tree':'🎄',
    'noto:snowflake':'❄️','noto:sun':'☀️','noto:umbrella':'☂️',
    'noto:heart-with-arrow':'💘','noto:revolving-hearts':'💞','noto:rosette':'🏵️',
    'noto:flower-playing-cards':'🎴','noto:red-paper-lantern':'🏮',
    'noto:shinto-shrine':'⛩️','noto:rabbit-face':'🐰',
    'noto:rocket':'🚀','noto:skull':'💀','noto:spade-suit':'♠️',
  };
  const toEmoji = (icon) => {
    if (!icon) return '📦';
    if (icon.startsWith('noto:')) return ICON_MAP[icon] || '📦';
    return icon;
  };

  const renderDecorCatalog = () => {
    if (!decorData) { $('decor-list').innerHTML = '<p style="padding:16px;color:#aaa">載入飾品資料中...</p>'; return; }
    const coll = Collection.loadCollection();
    const filterType = $('decor-filter')?.value || 'all';
    const searchTerm = ($('decor-search')?.value || '').toLowerCase();

    let defs = decorData.definitions;
    if (filterType !== 'all') defs = defs.filter(d => d.category.type === filterType);
    if (searchTerm) defs = defs.filter(d =>
      d.category.name.toLowerCase().includes(searchTerm) ||
      d.category.nameEn.toLowerCase().includes(searchTerm)
    );

    $('decor-list').innerHTML = defs.map(def => {
      const cat = def.category;
      let catTotal = 0, catCollected = 0;
      const variantHtml = def.variants.map(v => {
        const pikminHtml = def.availablePikminTypes.map(pt => {
          const itemId = `${cat.id}_${v.id}_${pt}`;
          const collected = !!coll[itemId];
          catTotal++; if (collected) catCollected++;
          const imgUrl = v.imageUrls?.[pt] || v.imageUrl || '';
          return `<button class="pikmin-btn ${collected ? 'collected' : ''}" data-item="${itemId}" title="${pt}">
            ${imgUrl ? `<img src="${imgUrl}" alt="${pt}" loading="lazy">` : `<span class="pt-label">${pt[0].toUpperCase()}</span>`}
          </button>`;
        }).join('');
        return `<div class="variant-row"><span class="variant-name">${v.name || v.nameEn}</span><div class="pikmin-grid">${pikminHtml}</div></div>`;
      }).join('');
      const pct = catTotal ? Math.round(catCollected / catTotal * 100) : 0;
      return `<details class="decor-card"><summary>
        <span class="cat-icon">${toEmoji(cat.icon)}</span>
        <span class="cat-name">${cat.name || cat.nameEn}</span>
        <span class="cat-progress">${catCollected}/${catTotal} (${pct}%)</span>
      </summary><div class="card-body">${variantHtml}</div></details>`;
    }).join('');

    $('decor-list').querySelectorAll('.pikmin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const now = Collection.toggle(btn.dataset.item);
        btn.classList.toggle('collected', now);
        renderDecorCatalog();
      });
    });
  };

  $('decor-filter')?.addEventListener('change', renderDecorCatalog);
  $('decor-search')?.addEventListener('input', renderDecorCatalog);

  // --- 收藏統計 ---
  const renderCollectionStats = () => {
    if (!decorData) { $('collection-content').innerHTML = '<p style="padding:16px;color:#aaa">載入中...</p>'; return; }
    const stats = Collection.getStats(decorData.definitions);
    const marks = Collection.getAllMarks();
    const markCounts = {};
    Object.values(marks).forEach(m => { markCounts[m] = (markCounts[m] || 0) + 1; });

    $('collection-content').innerHTML = `
      <div class="stat-hero">
        <div class="stat-pct">${stats.pct}%</div>
        <div class="stat-detail">已收集 ${stats.collected} / ${stats.total} 個飾品</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${stats.pct}%"></div></div>
      </div>
      <div class="stat-section">
        <h3>📊 各分類進度</h3>
        ${Object.entries(stats.byCat).map(([catId, s]) => {
          const def = decorData.definitions.find(d => d.category.id === catId);
          const name = def ? (def.category.name || def.category.nameEn) : catId;
          const icon = toEmoji(def?.category.icon);
          const p = s.total ? Math.round(s.collected / s.total * 100) : 0;
          return `<div class="stat-row"><span>${icon} ${name}</span><span>${s.collected}/${s.total} (${p}%)</span></div>`;
        }).join('')}
      </div>
      <div class="stat-section">
        <h3>🗺️ 格子標記</h3>
        ${[...Object.entries(MARK_LABELS), ['cd_both', '🔴 盆+果CD']].map(([type, label]) =>
          `<div class="stat-row"><span>${label}</span><span>${markCounts[type] || 0} 格</span></div>`
        ).join('')}
      </div>
      <div class="stat-section">
        <h3>⚙️ 資料管理</h3>
        <button class="action-btn" id="export-copy-btn">📋 複製備份到剪貼簿</button>
        <button class="action-btn" id="export-btn" style="opacity:0.7;font-size:12px">📤 下載 JSON 檔案</button>
        <button class="action-btn" id="import-paste-btn">📋 從剪貼簿貼上還原</button>
        <button class="action-btn" id="import-btn" style="opacity:0.7;font-size:12px">📥 選擇 JSON 檔案</button>
        <input type="file" id="import-file" accept=".json" style="display:none">
        <p style="font-size:11px;color:#888;margin-top:8px;line-height:1.5">💡 iPhone 建議：複製備份 → 貼到備忘錄或 LINE 給自己保存。還原時複製該文字 → 點「從剪貼簿貼上還原」。</p>
      </div>
    `;

    const exportData = () => ({ collection: Collection.loadCollection(), marks: Collection.getAllMarks(), exported: new Date().toISOString() });

    $('export-copy-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(exportData()));
        $('export-copy-btn').textContent = '✅ 已複製！';
        setTimeout(() => { $('export-copy-btn').textContent = '📋 複製備份到剪貼簿'; }, 2000);
      } catch { alert('複製失敗，請改用下載方式'); }
    });
    $('export-btn')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `pikmin-s2-備份-${new Date().toISOString().slice(0,10)}.json`; a.click();
    });
    $('import-paste-btn')?.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        const data = JSON.parse(text);
        if (!data.collection && !data.marks) throw new Error('invalid');
        if (data.collection) localStorage.setItem('pikmin-s2-collection', JSON.stringify(data.collection));
        if (data.marks) localStorage.setItem('pikmin-s2-cell-marks', JSON.stringify(data.marks));
        alert('匯入成功！'); renderCollectionStats();
      } catch { alert('剪貼簿內容不是有效的備份資料'); }
    });
    $('import-btn')?.addEventListener('click', () => $('import-file').click());
    $('import-file')?.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.collection) localStorage.setItem('pikmin-s2-collection', JSON.stringify(data.collection));
          if (data.marks) localStorage.setItem('pikmin-s2-cell-marks', JSON.stringify(data.marks));
          alert('匯入成功！'); renderCollectionStats();
        } catch { alert('檔案格式錯誤'); }
      };
      reader.readAsText(file);
    });
  };

  // --- 載入飾品資料 ---
  fetch('decor.json?v=2').then(r => r.json()).then(data => {
    decorData = data;
    if (currentTab === 'decor') renderDecorCatalog();
    if (currentTab === 'collection') renderCollectionStats();
  });

  // --- 致謝 ---
  $('credits-btn')?.addEventListener('click', () => { $('credits-modal').classList.toggle('visible'); });
  $('credits-close')?.addEventListener('click', () => { $('credits-modal').classList.remove('visible'); });

  // --- 每日盆計數 ---
  const updateDailyUI = () => { const c = Collection.getDailyCount(); $('daily-count').textContent = `🌱 ${c}/15`; $('daily-count').style.color = c >= 15 ? '#ef4444' : '#4ade80'; };
  let dailyTimer = null;
  $('daily-count').addEventListener('click', () => { Collection.bumpDaily(); updateDailyUI(); });
  $('daily-count').addEventListener('contextmenu', e => { e.preventDefault(); Collection.resetDaily(); updateDailyUI(); });
  // long press for mobile
  $('daily-count').addEventListener('touchstart', () => { dailyTimer = setTimeout(() => { Collection.resetDaily(); updateDailyUI(); }, 600); }, { passive: true });
  $('daily-count').addEventListener('touchend', () => clearTimeout(dailyTimer));

  // --- 初始化 ---
  const boundsKey = () => { const b = map.getBounds(); return `${b.getSouth().toFixed(4)},${b.getWest().toFixed(4)},${b.getNorth().toFixed(4)},${b.getEast().toFixed(4)},${currentLevel}`; };
  map.on('moveend', () => {
    const bk = boundsKey();
    if (bk === lastBounds) return;
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => { lastBounds = bk; renderCells(); if (poiEnabled) refreshPOIs(); if (pureEnabled) analyzePureCells(); }, 150);
  });
  updateLevel();
  updateDailyUI();
  renderCells();
})();
