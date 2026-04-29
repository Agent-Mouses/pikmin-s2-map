// Foursquare OS Places POI layer
// Data from Foursquare Open Source Places (Apache 2.0)
// Extracted via Source Cooperative GeoParquet

const FSQ = (() => {
  const DECOR_META = {
    restaurant: { icon: '🍽️', name: '餐廳' }, cafe: { icon: '☕', name: '咖啡廳' },
    sweetshop: { icon: '🍰', name: '甜點店' }, bakery: { icon: '🥐', name: '麵包店' },
    burger: { icon: '🍔', name: '漢堡店' }, italian: { icon: '🍕', name: '義式餐廳' },
    ramen: { icon: '🥡', name: '拉麵店' }, sushi: { icon: '🍣', name: '壽司店' },
    curry: { icon: '🍛', name: '咖哩餐廳' }, taco: { icon: '🌮', name: '墨西哥餐廳' },
    korean: { icon: '🇰🇷', name: '韓式餐廳' }, convenience: { icon: '🏪', name: '便利商店' },
    supermarket: { icon: '🛒', name: '超市' }, cosmetics: { icon: '💄', name: '化妝品商店' },
    clothing: { icon: '👔', name: '服飾店' }, electronics: { icon: '🔌', name: '電器行' },
    hardware: { icon: '🔧', name: '五金行' }, library: { icon: '📚', name: '圖書館' },
    pharmacy: { icon: '🪥', name: '藥局' }, hair_salon: { icon: '💇', name: '美髮院' },
    laundry: { icon: '🧺', name: '洗衣店' }, post_office: { icon: '✉️', name: '郵局' },
    hotel: { icon: '🏨', name: '飯店' }, university: { icon: '🎓', name: '大學' },
    station: { icon: '🚂', name: '車站' }, bus_stop: { icon: '🚌', name: '公車站' },
    airport: { icon: '✈️', name: '機場' }, bridge: { icon: '🌉', name: '橋樑' },
    park: { icon: '🍀', name: '公園' }, forest: { icon: '🌲', name: '森林' },
    waterside: { icon: '🌊', name: '水邊' }, beach: { icon: '🏖️', name: '海邊' },
    mountain: { icon: '⛰️', name: '山丘' }, zoo: { icon: '🦁', name: '動物園' },
    theme_park: { icon: '🎢', name: '主題樂園' }, art_gallery: { icon: '🎨', name: '美術館' },
    stadium: { icon: '🏟️', name: '體育館' }, movie_theater: { icon: '🎬', name: '電影院' },
    shrine: { icon: '⛩️', name: '神社寺廟' }
  };

  let loaded = {}; // { TW: [...], JP: [...], US: [...] }
  let loading = {};

  const detectRegion = (lat, lng) => {
    if (lat >= 21.5 && lat <= 25.5 && lng >= 119.5 && lng <= 122.5) return 'tw';
    if (lat >= 24 && lat <= 46 && lng >= 127 && lng <= 146) return 'jp';
    if (lat >= 36 && lat <= 45 && lng >= -80 && lng <= -66) return 'us';
    if (lat >= 38 && lat <= 40 && lng >= -78.5 && lng <= -76) return 'us';
    return null;
  };

  const load = (region) => {
    if (loaded[region] || loading[region]) return;
    loading[region] = true;
    fetch(`fsq-${region}.json`)
      .then(r => r.json())
      .then(data => {
        const types = data.t;
        loaded[region] = data.d.map(p => ({
          lat: p[0], lon: p[1],
          decorId: types[p[2]],
          decorName: DECOR_META[types[p[2]]]?.name || types[p[2]],
          decorIcon: DECOR_META[types[p[2]]]?.icon || '📦'
        }));
        loading[region] = false;
      })
      .catch(() => { loading[region] = false; });
  };

  const filterInBounds = (bounds) => {
    const results = [];
    for (const pts of Object.values(loaded)) {
      if (!pts) continue;
      for (const p of pts) {
        if (p.lat >= bounds.south && p.lat <= bounds.north &&
            p.lon >= bounds.west && p.lon <= bounds.east) {
          results.push(p);
        }
      }
    }
    return results;
  };

  return { detectRegion, load, filterInBounds, DECOR_META };
})();
