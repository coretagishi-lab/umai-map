// 地図・店ピン・現在地（追加レイヤーは layers.js）。Leaflet はグローバルの L を使う。
import { MAP, COLORS } from './config.js';

export function createMap(el) {
  const map = L.map(el, {
    zoomControl: false,          // 右下に自前の大きいボタンを置く
    attributionControl: true,
    tap: false,
    maxZoom: MAP.maxZoom,
    preferCanvas: false,
  }).setView(MAP.center, MAP.zoom);

  L.tileLayer(MAP.tiles, {
    maxZoom: MAP.maxZoom,
    maxNativeZoom: 19,
    attribution: MAP.attribution,
    detectRetina: false,
    updateWhenIdle: true,
    keepBuffer: 2,
  }).addTo(map);

  map.attributionControl.setPosition('topright').setPrefix(false);
  return map;
}

// ── 店ピン ────────────────────────────────────────────
function placeIcon(p, selected = false) {
  const color = p.category === 'food' ? COLORS.food : COLORS.other;
  // 店はしずく形（先端が店の位置）。現在地の丸い点と見分けがつくように
  const cls = ['drop', p.wishlist ? 'drop--wish' : '', selected ? 'drop--sel' : ''].join(' ');
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="${cls}" style="--c:${color};--ring:${COLORS.wishRing}"></span>`,
    iconSize: [30, 34],
    iconAnchor: [15, 32],
  });
}

export function createPlaceLayer(map, onSelect) {
  const cluster = L.markerClusterGroup({
    maxClusterRadius: MAP.clusterRadius,
    disableClusteringAtZoom: MAP.disableClusteringAtZoom,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    // 店は数百件程度なので一括で載せる（分割読み込みだと直後の「ピンを表示」が間に合わない）
    iconCreateFunction: (c) => clusterIcon(c, 'cl--place'),
  }).addTo(map);

  const markers = new Map(); // id -> marker
  let selectedId = null;

  function setPlaces(list) {
    cluster.clearLayers();
    markers.clear();
    const arr = list.map((p) => {
      const m = L.marker([p.lat, p.lng], { icon: placeIcon(p, p.id === selectedId), keyboard: false, title: p.name });
      m.on('click', () => onSelect(p));
      markers.set(p.id, m);
      m._place = p;
      return m;
    });
    cluster.addLayers(arr);
  }

  function select(id) {
    const prev = markers.get(selectedId);
    if (prev) prev.setIcon(placeIcon(prev._place, false));
    selectedId = id;
    const m = markers.get(id);
    if (m) m.setIcon(placeIcon(m._place, true)).setZIndexOffset(1000);
    if (prev && prev !== m) prev.setZIndexOffset(0);
  }

  /** ピンが見える状態にして中心付近へ（下のカードで隠れないよう少し上に） */
  function reveal(p, bottomPx = 0) {
    const m = markers.get(p.id);
    const go = () => panAbove(map, [p.lat, p.lng], bottomPx);
    if (m) cluster.zoomToShowLayer(m, go);
    else go();
  }

  function bounds() { return cluster.getBounds(); }

  return { setPlaces, select, reveal, bounds };
}

/** 画面下 bottomPx ぶんを避けて、見えている範囲の中央に latlng を置く */
export function panAbove(map, latlng, bottomPx) {
  const size = map.getSize();
  const target = map.latLngToContainerPoint(latlng);
  const want = L.point(size.x / 2, (size.y - bottomPx) / 2);
  map.panBy(target.subtract(want), { animate: true, duration: 0.3 });
}

function clusterIcon(c, cls) {
  const n = c.getChildCount();
  const size = n < 10 ? 34 : n < 50 ? 40 : 46;
  // 行きたい場所リストを含むクラスタは金色の縁
  const hasWish = cls === 'cl--place' && c.getAllChildMarkers().some((m) => m._place?.wishlist);
  return L.divIcon({
    html: `<span>${n}</span>`,
    className: `cl ${cls}${hasWish ? ' cl--wish' : ''}`,
    iconSize: [size, size],
  });
}

// ── 現在地（毎回新しく取得する） ─────────────────────────
export function createLocator(map) {
  let dot = null, ring = null, last = null;

  function locate({ zoom = 15 } = {}) {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('この端末では現在地を取得できません'));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const ll = [pos.coords.latitude, pos.coords.longitude];
          const acc = pos.coords.accuracy;
          if (!dot) {
            ring = L.circle(ll, { radius: acc, className: 'me-ring', interactive: false }).addTo(map);
            dot = L.marker(ll, { icon: L.divIcon({ className: 'pin-wrap', html: '<span class="me"><span class="me__pulse"></span></span>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false, zIndexOffset: 2000 }).addTo(map);
          } else {
            dot.setLatLng(ll); ring.setLatLng(ll).setRadius(acc);
          }
          last = { lat: ll[0], lng: ll[1], accuracy: acc };
          map.flyTo(ll, Math.max(map.getZoom(), zoom), { duration: 0.6 });
          resolve(last);
        },
        (err) => reject(new Error(err.code === 1 ? '位置情報の使用が許可されていません' : '現在地を取得できませんでした')),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }, // maximumAge:0 で毎回新規取得
      );
    });
  }

  return { locate, last: () => last };
}
