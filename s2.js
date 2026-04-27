// S2 Geometry for JavaScript
// Ported from jonatkins/s2-geometry-javascript
// Core: face/ij/level cell representation, vertex calculation, viewport enumeration

const S2 = (() => {
  const d2r = Math.PI / 180, r2d = 180 / Math.PI;

  const LatLngToXYZ = (lat, lng) => {
    const phi = lat * d2r, theta = lng * d2r, cosphi = Math.cos(phi);
    return [cosphi * Math.cos(theta), cosphi * Math.sin(theta), Math.sin(phi)];
  };

  const XYZToLatLng = (xyz) => ({
    lat: Math.atan2(xyz[2], Math.sqrt(xyz[0] * xyz[0] + xyz[1] * xyz[1])) * r2d,
    lng: Math.atan2(xyz[1], xyz[0]) * r2d
  });

  const largestAbsComponent = (xyz) => {
    const t = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])];
    return t[0] > t[1] ? (t[0] > t[2] ? 0 : 2) : (t[1] > t[2] ? 1 : 2);
  };

  const faceXYZToUV = (face, xyz) => {
    switch (face) {
      case 0: return [xyz[1] / xyz[0], xyz[2] / xyz[0]];
      case 1: return [-xyz[0] / xyz[1], xyz[2] / xyz[1]];
      case 2: return [-xyz[0] / xyz[2], -xyz[1] / xyz[2]];
      case 3: return [xyz[2] / xyz[0], xyz[1] / xyz[0]];
      case 4: return [xyz[2] / xyz[1], -xyz[0] / xyz[1]];
      case 5: return [-xyz[1] / xyz[2], -xyz[0] / xyz[2]];
    }
  };

  const XYZToFaceUV = (xyz) => {
    let face = largestAbsComponent(xyz);
    if (xyz[face] < 0) face += 3;
    return [face, faceXYZToUV(face, xyz)];
  };

  const FaceUVToXYZ = (face, uv) => {
    const [u, v] = uv;
    switch (face) {
      case 0: return [1, u, v];
      case 1: return [-u, 1, v];
      case 2: return [-u, -v, 1];
      case 3: return [-1, -v, -u];
      case 4: return [v, -1, -u];
      case 5: return [v, u, -1];
    }
  };

  const singleSTtoUV = (s) => s >= 0.5 ? (1 / 3) * (4 * s * s - 1) : (1 / 3) * (1 - 4 * (1 - s) * (1 - s));
  const STToUV = (st) => [singleSTtoUV(st[0]), singleSTtoUV(st[1])];

  const singleUVtoST = (u) => u >= 0 ? 0.5 * Math.sqrt(1 + 3 * u) : 1 - 0.5 * Math.sqrt(1 - 3 * u);
  const UVToST = (uv) => [singleUVtoST(uv[0]), singleUVtoST(uv[1])];

  const STToIJ = (st, order) => {
    const max = 1 << order;
    return [
      Math.max(0, Math.min(max - 1, Math.floor(st[0] * max))),
      Math.max(0, Math.min(max - 1, Math.floor(st[1] * max)))
    ];
  };

  const IJToST = (ij, order, off) => {
    const max = 1 << order;
    return [(ij[0] + off[0]) / max, (ij[1] + off[1]) / max];
  };

  // Hilbert curve
  const hilbertMap = {
    'a': [[0, 'd'], [1, 'a'], [3, 'b'], [2, 'a']],
    'b': [[2, 'b'], [1, 'b'], [3, 'a'], [0, 'c']],
    'c': [[2, 'c'], [3, 'd'], [1, 'c'], [0, 'b']],
    'd': [[0, 'a'], [3, 'c'], [1, 'd'], [2, 'd']]
  };

  const pointToHilbertQuadList = (x, y, order) => {
    let sq = 'a';
    const pos = [];
    for (let i = order - 1; i >= 0; i--) {
      const mask = 1 << i;
      const qx = x & mask ? 1 : 0, qy = y & mask ? 1 : 0;
      const t = hilbertMap[sq][qx * 2 + qy];
      pos.push(t[0]);
      sq = t[1];
    }
    return pos;
  };

  // Reverse Hilbert: quad list → ij
  const reverseHilbertMap = {};
  for (const [state, entries] of Object.entries(hilbertMap)) {
    reverseHilbertMap[state] = {};
    for (let idx = 0; idx < 4; idx++) {
      const [quad, next] = entries[idx];
      reverseHilbertMap[state][quad] = { ij: idx, next };
    }
  }

  const hilbertQuadListToPoint = (quads, order) => {
    let x = 0, y = 0, sq = 'a';
    for (let i = 0; i < order; i++) {
      const { ij, next } = reverseHilbertMap[sq][quads[i]];
      x = (x << 1) | (ij >> 1);
      y = (y << 1) | (ij & 1);
      sq = next;
    }
    return [x, y];
  };

  // Parse numeric cell ID → cell object
  const cellFromId = (idStr) => {
    const id = BigInt(idStr);
    let bits = id.toString(2).padStart(64, '0');
    // Find trailing 1 bit (level marker)
    const lastOne = bits.lastIndexOf('1');
    const posBits = lastOne; // number of position bits before the trailing 1
    const face = parseInt(bits.slice(0, 3), 2);
    const level = (posBits - 3) / 2;
    if (level < 0 || level > 30 || level !== Math.floor(level)) return null;
    const quads = [];
    for (let i = 3; i < 3 + level * 2; i += 2) {
      quads.push(parseInt(bits.slice(i, i + 2), 2));
    }
    const [x, y] = hilbertQuadListToPoint(quads, level);
    return { face, ij: [x, y], level };
  };

  // --- S2Cell: face + ij + level ---
  const cellFromLatLng = (lat, lng, level) => {
    const xyz = LatLngToXYZ(lat, lng);
    const [face, uv] = XYZToFaceUV(xyz);
    const st = UVToST(uv);
    const ij = STToIJ(st, level);
    return { face, ij, level };
  };

  const cellCenter = (cell) => {
    const st = IJToST(cell.ij, cell.level, [0.5, 0.5]);
    const uv = STToUV(st);
    const xyz = FaceUVToXYZ(cell.face, uv);
    return XYZToLatLng(xyz);
  };

  const cellCorners = (cell) => {
    const offsets = [[0, 0], [0, 1], [1, 1], [1, 0]];
    return offsets.map(off => {
      const st = IJToST(cell.ij, cell.level, off);
      const uv = STToUV(st);
      const xyz = FaceUVToXYZ(cell.face, uv);
      return XYZToLatLng(xyz);
    });
  };

  const cellKey = (cell) => {
    const quads = pointToHilbertQuadList(cell.ij[0], cell.ij[1], cell.level);
    return cell.face + '/' + quads.join('');
  };

  const cellId = (cell) => {
    const key = cellKey(cell);
    const parts = key.split('/');
    let bits = parseInt(parts[0]).toString(2).padStart(3, '0');
    for (const c of parts[1]) bits += parseInt(c).toString(2).padStart(2, '0');
    bits += '1';
    while (bits.length < 64) bits += '0';
    return BigInt('0b' + bits).toString();
  };

  const cellToString = (cell) => `F${cell.face}ij[${cell.ij[0]},${cell.ij[1]}]@${cell.level}`;

  // --- Viewport cell enumeration ---
  const getCellsInBounds = (bounds, level) => {
    const cells = new Map();
    const latSpan = bounds.ne.lat - bounds.sw.lat;
    const lngSpan = bounds.ne.lng - bounds.sw.lng;

    // Approximate cell angular size: each face covers ~90°, subdivided 2^level times
    // Use 0.5x cell size as sample step to ensure no cells are missed
    const cellDeg = 90 / Math.pow(2, level);
    const step = cellDeg * 0.5;
    const margin = cellDeg;

    const latStart = bounds.sw.lat - margin;
    const latEnd = bounds.ne.lat + margin;
    const lngStart = bounds.sw.lng - margin;
    const lngEnd = bounds.ne.lng + margin;

    // Safety: cap iterations
    const maxIter = 250;
    const latSteps = Math.min(maxIter, Math.ceil((latEnd - latStart) / step) + 1);
    const lngSteps = Math.min(maxIter, Math.ceil((lngEnd - lngStart) / step) + 1);
    const dLat = (latEnd - latStart) / Math.max(1, latSteps - 1);
    const dLng = (lngEnd - lngStart) / Math.max(1, lngSteps - 1);

    for (let li = 0; li < latSteps; li++) {
      for (let lj = 0; lj < lngSteps; lj++) {
        const lat = Math.max(-89.9, Math.min(89.9, latStart + li * dLat));
        const lng = lngStart + lj * dLng;
        const cell = cellFromLatLng(lat, lng, level);
        const k = `${cell.face}:${cell.ij[0]}:${cell.ij[1]}`;
        if (!cells.has(k)) cells.set(k, cell);
      }
    }
    return cells;
  };

  return { cellFromLatLng, cellFromId, cellCenter, cellCorners, cellKey, cellId, cellToString, getCellsInBounds };
})();
