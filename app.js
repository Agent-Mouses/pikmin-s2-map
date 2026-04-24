// Pikmin Bloom S2 Cell Map Tool
(() => {
  'use strict';

  const DEFAULT_LEVEL = 17;
  const MAX_CELLS = 3000;
  const LEVEL_COLORS = {
    12: '#e74c3c', 13: '#e67e22', 14: '#f1c40f', 15: '#2ecc71',
    16: '#1abc9c', 17: '#3498db', 18: '#9b59b6', 19: '#e91e63', 20: '#795548'
  };
  const LEVEL_DESC = {
    12: 'Regional', 13: 'City', 14: 'District', 15: 'Neighborhood',
    16: 'Block (~300m)', 17: 'Pikmin (~150m)', 18: 'Fine (~75m)',
    19: 'Very Fine (~38m)', 20: 'Ultra Fine (~19m)'
  };

  let currentLevel = DEFAULT_LEVEL;
  let cellLayer = null, userMarker = null, userCellHL = null, selCellHL = null;

  // Map
  const map = L.map('map', {
    center: [25.033, 121.565], zoom: 16,
    zoomControl: false, renderer: L.canvas()
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom: 21
  }).addTo(map);

  // UI refs
  const $ = (id) => document.getElementById(id);
  const slider = $('level-slider'), levelDisp = $('level-display'), levelInfo = $('level-info');
  const cellCount = $('cell-count'), infoPanel = $('info-panel'), infoContent = $('info-content');

  const updateLevel = () => {
    levelDisp.textContent = `Level ${currentLevel}`;
    levelInfo.textContent = LEVEL_DESC[currentLevel] || '';
    slider.value = currentLevel;
  };

  slider.addEventListener('input', (e) => { currentLevel = +e.target.value; updateLevel(); renderCells(); });
  document.querySelectorAll('.level-btn').forEach(b =>
    b.addEventListener('click', () => { currentLevel = +b.dataset.level; updateLevel(); renderCells(); })
  );

  // Render cells
  const renderCells = () => {
    if (cellLayer) map.removeLayer(cellLayer);
    if (selCellHL) { map.removeLayer(selCellHL); selCellHL = null; }

    const b = map.getBounds();
    const bounds = {
      sw: { lat: b.getSouth(), lng: b.getWest() },
      ne: { lat: b.getNorth(), lng: b.getEast() }
    };
    const cells = S2.getCellsInBounds(bounds, currentLevel);

    if (cells.size > MAX_CELLS) {
      cellCount.textContent = `Too many cells (${cells.size}). Zoom in.`;
      return;
    }

    const color = LEVEL_COLORS[currentLevel] || '#3498db';
    const group = L.featureGroup();

    cells.forEach((cell) => {
      const corners = S2.cellCorners(cell);
      const latlngs = corners.map(c => [c.lat, c.lng]);
      const poly = L.polygon(latlngs, {
        color, weight: 1, opacity: 0.6, fillOpacity: 0.05, interactive: true
      });
      poly.on('click', () => showCellInfo(cell, corners));
      group.addLayer(poly);
    });

    cellLayer = group.addTo(map);
    cellCount.textContent = `${cells.size} cells`;

    if (userMarker) {
      const ll = userMarker.getLatLng();
      highlightUserCell(ll.lat, ll.lng);
    }
  };

  const showCellInfo = (cell, corners) => {
    if (selCellHL) map.removeLayer(selCellHL);
    selCellHL = L.polygon(corners.map(c => [c.lat, c.lng]), {
      color: '#ff0', weight: 3, opacity: 0.9, fillOpacity: 0.25, fillColor: '#ff0', interactive: false
    }).addTo(map);

    const center = S2.cellCenter(cell);
    const key = S2.cellKey(cell);
    const id = S2.cellId(cell);
    infoContent.innerHTML = `
      <div class="info-row"><span class="info-label">Cell Key</span><span class="info-value">${key}</span></div>
      <div class="info-row"><span class="info-label">Cell ID</span><span class="info-value clickable" title="Click to copy">${id}</span></div>
      <div class="info-row"><span class="info-label">Level</span><span class="info-value">${currentLevel}</span></div>
      <div class="info-row"><span class="info-label">Center</span><span class="info-value">${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}</span></div>
    `;
    infoContent.querySelector('.clickable').onclick = () => navigator.clipboard.writeText(id);
    infoPanel.classList.add('visible');
  };

  $('info-close').addEventListener('click', () => {
    infoPanel.classList.remove('visible');
    if (selCellHL) { map.removeLayer(selCellHL); selCellHL = null; }
  });

  // GPS
  let watchId = null;
  const highlightUserCell = (lat, lng) => {
    if (userCellHL) map.removeLayer(userCellHL);
    const cell = S2.cellFromLatLng(lat, lng, currentLevel);
    const corners = S2.cellCorners(cell);
    userCellHL = L.polygon(corners.map(c => [c.lat, c.lng]), {
      color: '#00e5ff', weight: 3, opacity: 0.9, fillOpacity: 0.2, fillColor: '#00e5ff', interactive: false
    }).addTo(map);
  };

  $('gps-btn').addEventListener('click', () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      $('gps-btn').classList.remove('active');
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (userCellHL) { map.removeLayer(userCellHL); userCellHL = null; }
      return;
    }
    if (!navigator.geolocation) return alert('Geolocation not supported');
    $('gps-btn').classList.add('active');
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (!userMarker) {
          userMarker = L.circleMarker([lat, lng], {
            radius: 8, color: '#fff', weight: 2, fillColor: '#00e5ff', fillOpacity: 1
          }).addTo(map);
          map.setView([lat, lng], Math.max(map.getZoom(), 16));
        } else {
          userMarker.setLatLng([lat, lng]);
        }
        highlightUserCell(lat, lng);
      },
      (err) => { alert('GPS error: ' + err.message); $('gps-btn').classList.remove('active'); watchId = null; },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  });

  map.on('moveend', renderCells);
  updateLevel();
  renderCells();
})();
