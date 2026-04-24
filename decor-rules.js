// Decor Rules: OSM tag → Pikmin decor type mapping
// Data sourced from scott0127/pik_tool (MIT License)
// Based on Pikmin Bloom Wiki + Taiwan OSM localization

const DECOR_RULES = [
  // Food & Dining
  { id: 'restaurant', name: '餐廳', nameEn: 'Restaurant', icon: '🍽️', tags: ['amenity=restaurant'] },
  { id: 'cafe', name: '咖啡廳', nameEn: 'Café', icon: '☕', tags: ['amenity=cafe'] },
  { id: 'sweetshop', name: '甜點店', nameEn: 'Sweet Shop', icon: '🍰', tags: ['shop=pastry', 'shop=confectionery', 'shop=chocolate'] },
  { id: 'bakery', name: '麵包店', nameEn: 'Bakery', icon: '🥐', tags: ['shop=bakery'] },
  { id: 'burger', name: '漢堡店', nameEn: 'Burger Shop', icon: '🍔', tags: ['amenity=fast_food', 'cuisine=burger'] },
  { id: 'italian', name: '義式餐廳', nameEn: 'Italian', icon: '🍕', tags: ['cuisine=pizza', 'cuisine=italian', 'cuisine=mediterranean', 'cuisine=pasta'] },
  { id: 'ramen', name: '拉麵店', nameEn: 'Ramen', icon: '🥡', tags: ['cuisine=ramen', 'cuisine=noodle', 'cuisine=chinese', 'cuisine=udon', 'cuisine=soba'] },
  { id: 'sushi', name: '壽司店', nameEn: 'Sushi', icon: '🍣', tags: ['cuisine=sushi'] },
  { id: 'curry', name: '咖哩餐廳', nameEn: 'Curry', icon: '🍛', tags: ['cuisine=curry', 'cuisine=indian', 'cuisine=sri_lankan'] },
  { id: 'korean', name: '韓式餐廳', nameEn: 'Korean', icon: '🇰🇷', tags: ['cuisine=korean'] },
  { id: 'taco', name: '墨西哥餐廳', nameEn: 'Mexican', icon: '🌮', tags: ['cuisine=mexican'] },
  // Shopping
  { id: 'convenience', name: '便利商店', nameEn: 'Convenience Store', icon: '🏪', tags: ['shop=convenience'] },
  { id: 'supermarket', name: '超市', nameEn: 'Supermarket', icon: '🛒', tags: ['shop=supermarket', 'shop=greengrocer'] },
  { id: 'cosmetics', name: '化妝品商店', nameEn: 'Cosmetics', icon: '💄', tags: ['shop=department_store', 'shop=cosmetics', 'shop=beauty'] },
  { id: 'clothing', name: '服飾店', nameEn: 'Clothing', icon: '👔', tags: ['shop=clothes', 'shop=shoes', 'shop=fashion'] },
  { id: 'electronics', name: '電器行', nameEn: 'Electronics', icon: '🔌', tags: ['shop=appliance', 'shop=electronics', 'shop=computer', 'shop=mobile_phone'] },
  { id: 'hardware', name: '五金行', nameEn: 'Hardware', icon: '🔧', tags: ['shop=doityourself', 'shop=hardware', 'shop=tools'] },
  { id: 'library', name: '圖書館／書店', nameEn: 'Library/Bookstore', icon: '📚', tags: ['amenity=library', 'shop=books'] },
  // Services
  { id: 'pharmacy', name: '藥局', nameEn: 'Pharmacy', icon: '💊', tags: ['amenity=pharmacy', 'shop=chemist', 'healthcare=pharmacy'] },
  { id: 'hair_salon', name: '美髮院', nameEn: 'Hair Salon', icon: '💇', tags: ['shop=hairdresser'] },
  { id: 'laundry', name: '洗衣店', nameEn: 'Laundry', icon: '🧺', tags: ['shop=laundry', 'shop=dry_cleaning'] },
  { id: 'post_office', name: '郵局', nameEn: 'Post Office', icon: '✉️', tags: ['amenity=post_office', 'amenity=post_box'] },
  { id: 'hotel', name: '飯店', nameEn: 'Hotel', icon: '🏨', tags: ['tourism=hotel', 'tourism=motel', 'tourism=hostel', 'tourism=guest_house'] },
  { id: 'university', name: '大學', nameEn: 'University', icon: '🎓', tags: ['amenity=university', 'amenity=college', 'building=university'] },
  // Transportation
  { id: 'station', name: '車站', nameEn: 'Station', icon: '🚂', tags: ['railway=station', 'building=train_station', 'railway=subway_entrance', 'public_transport=station'] },
  { id: 'bus_stop', name: '公車站', nameEn: 'Bus Stop', icon: '🚌', tags: ['highway=bus_stop', 'amenity=bus_station', 'public_transport=platform'] },
  { id: 'airport', name: '機場', nameEn: 'Airport', icon: '✈️', tags: ['aeroway=aerodrome', 'aeroway=terminal', 'aeroway=gate'] },
  { id: 'bridge', name: '橋樑', nameEn: 'Bridge', icon: '🌉', tags: ['bridge=yes', 'man_made=bridge'] },
  // Outdoor & Leisure
  { id: 'park', name: '公園', nameEn: 'Park', icon: '🍀', tags: ['leisure=park', 'leisure=garden', 'leisure=playground', 'landuse=village_green'] },
  { id: 'forest', name: '森林', nameEn: 'Forest', icon: '🌲', tags: ['natural=wood', 'landuse=forest'] },
  { id: 'waterside', name: '水邊', nameEn: 'Waterside', icon: '🌊', tags: ['natural=water', 'natural=wetland', 'waterway=river', 'waterway=stream', 'waterway=canal'] },
  { id: 'beach', name: '海邊', nameEn: 'Beach', icon: '🏖️', tags: ['natural=beach'] },
  { id: 'mountain', name: '山丘', nameEn: 'Mountain', icon: '⛰️', tags: ['natural=peak', 'natural=cliff', 'natural=bare_rock'] },
  { id: 'zoo', name: '動物園', nameEn: 'Zoo', icon: '🦁', tags: ['tourism=zoo', 'tourism=aquarium'] },
  { id: 'theme_park', name: '主題樂園', nameEn: 'Theme Park', icon: '🎢', tags: ['tourism=theme_park', 'leisure=water_park'] },
  { id: 'art_gallery', name: '美術館', nameEn: 'Art Gallery', icon: '🎨', tags: ['tourism=museum', 'tourism=gallery', 'shop=art', 'amenity=arts_centre'] },
  { id: 'stadium', name: '體育館', nameEn: 'Stadium', icon: '🏟️', tags: ['leisure=stadium', 'leisure=sports_centre', 'building=stadium'] },
  { id: 'movie_theater', name: '電影院', nameEn: 'Cinema', icon: '🎬', tags: ['amenity=cinema'] },
  // Special
  { id: 'roadside', name: '路邊', nameEn: 'Roadside', icon: '🏷️', tags: [] },
];
