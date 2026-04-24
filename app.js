// Pikmin Bloom S2 Cell Map Tool — Full App
(() => {
  'use strict';

  // --- State ---
  let currentLevel = 17, currentTab = 'map';
  let cellLayer = null, userMarker = null, userCellHL = null, selCellHL = null;
  let poiLayer = null, poiEnabled = false, decorData = null;
  const LEVEL_COLORS = {
    12:'#e74c3c',13:'#e67e22',14:'#f1c40f',15:'#2ecc71',16:'#1abc9c',
    17:'#3498db',18:'#9b59b6',19:'#e91e63',20:'#795548'
  };
  const LEVEL_DESC = {
    12:'Regional',13:'City',14:'District',15:'Neighborhood',16:'Block (~300m)',
    17:'Pikmin (~150m)',18:'Fine (~75m)',19:'Very Fine (~38m)',20:'Ultra Fine (~19m)'
  };
  const MARK_COLORS = { farmed: '#4ade80', cooldown: '#fbbf24', bookmark: '#f472b6' };

  const $ = (id) => document.getElementById(id);

  // --- Map init ---
  const map = L.map('map', { center: [25.033, 121.565], zoom: 16, zoomControl: false, renderer: L.canvas() });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom: 21
  }).addTo(map);

  // --- Tab switching ---
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

  // --- Level control ---
  const slider = $('level-slider');
  const updateLevel = () => {
    $('level-display').textContent = `L${currentLevel}`;
    $('level-info').textContent = LEVEL_DESC[currentLevel] || '';
    slider.value = currentLevel;
  };
  slider.addEventListener('input', e => { currentLevel = +e.target.value; updateLevel(); renderCells(); });
  document.querySelectorAll('.level-btn').forEach(b =>
    b.addEventListener('click', () => { currentLevel = +b.dataset.level; updateLevel(); renderCells(); })
  );

  // --- Cell rendering ---
  const renderCells = () => {
    if (cellLayer) map.removeLayer(cellLayer);
    if (selCellHL) { map.removeLayer(selCellHL); selCellHL = null; }
    const b = map.getBounds();
    const bounds = { sw: { lat: b.getSouth(), lng: b.getWest() }, ne: { lat: b.getNorth(), lng: b.getEast() } };
    const cells = S2.getCellsInBounds(bounds, currentLevel);
    if (cells.size > 3000) { $('cell-count').textContent = `Too many cells. Zoom in.`; return; }

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
    $('cell-count').textContent = `${cells.size} cells`;
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
    const markBtns = Object.entries(Collection.MARK_TYPES).map(([type, emoji]) =>
      `<button class="mark-btn ${mark === type ? 'active' : ''}" data-mark="${type}" data-key="${key}">${emoji} ${type}</button>`
    ).join('');

    $('info-content').innerHTML = `
      <div class="info-row"><span class="info-label">Cell ID</span><span class="info-value clickable" title="Copy">${id}</span></div>
      <div class="info-row"><span class="info-label">Level</span><span class="info-value">${currentLevel}</span></div>
      <div class="info-row"><span class="info-label">Center</span><span class="info-value">${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}</span></div>
      <div class="mark-row">${markBtns}</div>
    `;
    $('info-content').querySelector('.clickable').onclick = () => navigator.clipboard.writeText(id);
    $('info-content').querySelectorAll('.mark-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Collection.setCellMark(btn.dataset.key, btn.dataset.mark);
        renderCells();
        showCellInfo(cell, corners, key);
      });
    });
    $('info-panel').classList.add('visible');
  };

  $('info-close').addEventListener('click', () => {
    $('info-panel').classList.remove('visible');
    if (selCellHL) { map.removeLayer(selCellHL); selCellHL = null; }
  });

  // --- GPS ---
  let watchId = null;
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
      return;
    }
    if (!navigator.geolocation) return alert('Geolocation not supported');
    $('gps-btn').classList.add('active');
    watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (!userMarker) {
          userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#00e5ff', fillOpacity: 1 }).addTo(map);
          map.setView([lat, lng], Math.max(map.getZoom(), 16));
        } else userMarker.setLatLng([lat, lng]);
        highlightUserCell(lat, lng);
      },
      err => { alert('GPS: ' + err.message); $('gps-btn').classList.remove('active'); watchId = null; },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  });

  // --- POI layer ---
  $('poi-toggle').addEventListener('click', () => {
    poiEnabled = !poiEnabled;
    $('poi-toggle').classList.toggle('active', poiEnabled);
    if (poiEnabled) fetchAndShowPOIs(); else if (poiLayer) { map.removeLayer(poiLayer); poiLayer = null; }
  });

  const fetchAndShowPOIs = async () => {
    const b = map.getBounds();
    const bounds = { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
    const rules = DECOR_RULES.filter(r => r.tags.length > 0);
    $('poi-toggle').textContent = '⏳';
    const points = await POI.fetchPOIs(bounds, rules);
    $('poi-toggle').textContent = '📍';
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

  // --- Decor Catalog ---
  const renderDecorCatalog = () => {
    if (!decorData) { $('decor-list').innerHTML = '<p style="padding:16px;color:#aaa">Loading decor data...</p>'; return; }
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
        return `<div class="variant-row"><span class="variant-name">${v.nameEn || v.name}</span><div class="pikmin-grid">${pikminHtml}</div></div>`;
      }).join('');
      const pct = catTotal ? Math.round(catCollected / catTotal * 100) : 0;
      return `<details class="decor-card"><summary>
        <span class="cat-icon">${cat.icon || '📦'}</span>
        <span class="cat-name">${cat.nameEn || cat.name}</span>
        <span class="cat-progress">${catCollected}/${catTotal} (${pct}%)</span>
      </summary><div class="card-body">${variantHtml}</div></details>`;
    }).join('');

    // Bind toggle events
    $('decor-list').querySelectorAll('.pikmin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const now = Collection.toggle(btn.dataset.item);
        btn.classList.toggle('collected', now);
        renderDecorCatalog(); // refresh counts
      });
    });
  };

  $('decor-filter')?.addEventListener('change', renderDecorCatalog);
  $('decor-search')?.addEventListener('input', renderDecorCatalog);

  // --- Collection Stats ---
  const renderCollectionStats = () => {
    if (!decorData) { $('collection-content').innerHTML = '<p style="padding:16px;color:#aaa">Loading...</p>'; return; }
    const stats = Collection.getStats(decorData.definitions);
    const marks = Collection.getAllMarks();
    const markCounts = {};
    Object.values(marks).forEach(m => { markCounts[m] = (markCounts[m] || 0) + 1; });

    $('collection-content').innerHTML = `
      <div class="stat-hero">
        <div class="stat-pct">${stats.pct}%</div>
        <div class="stat-detail">${stats.collected} / ${stats.total} decors collected</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${stats.pct}%"></div></div>
      </div>
      <div class="stat-section">
        <h3>📊 By Category</h3>
        ${Object.entries(stats.byCat).map(([catId, s]) => {
          const def = decorData.definitions.find(d => d.category.id === catId);
          const name = def ? (def.category.nameEn || def.category.name) : catId;
          const icon = def?.category.icon || '📦';
          const p = s.total ? Math.round(s.collected / s.total * 100) : 0;
          return `<div class="stat-row"><span>${icon} ${name}</span><span>${s.collected}/${s.total} (${p}%)</span></div>`;
        }).join('')}
      </div>
      <div class="stat-section">
        <h3>🗺️ Cell Marks</h3>
        ${Object.entries(Collection.MARK_TYPES).map(([type, emoji]) =>
          `<div class="stat-row"><span>${emoji} ${type}</span><span>${markCounts[type] || 0} cells</span></div>`
        ).join('')}
      </div>
      <div class="stat-section">
        <h3>⚙️ Data</h3>
        <button class="action-btn" id="export-btn">📤 Export Data</button>
        <button class="action-btn" id="import-btn">📥 Import Data</button>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </div>
    `;

    $('export-btn')?.addEventListener('click', () => {
      const data = { collection: Collection.loadCollection(), marks: Collection.getAllMarks(), exported: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `pikmin-s2-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
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
          alert('Imported!'); renderCollectionStats();
        } catch { alert('Invalid file'); }
      };
      reader.readAsText(file);
    });
  };

  // --- Load decor data ---
  fetch('decor.json').then(r => r.json()).then(data => {
    decorData = data;
    if (currentTab === 'decor') renderDecorCatalog();
    if (currentTab === 'collection') renderCollectionStats();
  });

  // --- Credits ---
  $('credits-btn')?.addEventListener('click', () => {
    $('credits-modal').classList.toggle('visible');
  });
  $('credits-close')?.addEventListener('click', () => {
    $('credits-modal').classList.remove('visible');
  });

  // --- Init ---
  map.on('moveend', () => { renderCells(); if (poiEnabled) fetchAndShowPOIs(); });
  updateLevel();
  renderCells();
})();
