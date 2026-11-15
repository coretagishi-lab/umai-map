// レイヤーパック：data/layers.json に書いたパックを、ON/OFFできる追加レイヤーとして表示する。
// パックを足すときはコードを触らず、layers.json に1項目＋データファイルを足すだけ。
//
// 軽さのための約束
//  - パックのデータは、そのパックを初めてONにしたときに読む（起動時は読まない）
//  - 全国規模のパックは parts（地域ごとの小分けファイル＋範囲）で持ち、
//    今見えている範囲にかかる分だけを読む。読み終えた分は覚えておき二度読まない
//  - 表示はクラスタ（まとまり）前提
import { normalizeLayerItem, unwrapList, flattenFeature } from './normalize.js';

const DEFAULT_COLOR = '#7c66dc';

export async function loadPackIndex(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} を読み込めませんでした（${res.status}）`);
  const json = await res.json();
  return (json.packs || []).filter((p) => p && p.id && (p.file || p.parts));
}

export function createPackLayer(map, pack, { onSelect, onCount }) {
  const types = pack.types || {};
  // まとまり（クラスタ）の色は、パックの最初の種類の色
  const clusterColor = Object.values(types)[0]?.color || DEFAULT_COLOR;
  const cluster = L.markerClusterGroup({
    maxClusterRadius: pack.cluster?.radius ?? 60,
    disableClusteringAtZoom: pack.cluster?.disableAtZoom ?? 16,
    showCoverageOnHover: false,
    chunkedLoading: true,
    iconCreateFunction: (c) => L.divIcon({
      html: `<span style="--cl:${clusterColor}">${c.getChildCount()}</span>`,
      className: 'cl cl--pack',
      iconSize: [38, 38],
    }),
  });

  const icons = {};
  const iconFor = (type) => {
    if (!icons[type]) {
      const color = types[type]?.color || DEFAULT_COLOR;
      icons[type] = L.divIcon({ className: 'pin-wrap', html: `<span class="pin pin--layer" style="--c:${color}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
    }
    return icons[type];
  };

  const loaded = new Set();   // 読み込み済みのファイル
  const loading = new Map();  // 読み込み中のファイル -> Promise
  const items = [];
  let on = false;

  const parts = pack.parts || [{ file: pack.file }];

  async function loadPart(part) {
    if (loaded.has(part.file)) return;
    if (loading.has(part.file)) return loading.get(part.file);
    const job = (async () => {
      const res = await fetch(part.file, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${pack.name}のデータを読み込めませんでした（${res.status}）`);
      const list = unwrapList(await res.json()).map(flattenFeature);
      const added = [];
      list.forEach((raw, i) => {
        const x = normalizeLayerItem(raw, i, `${pack.id}`);
        if (!x) return;
        x.pack = pack;
        items.push(x);
        const m = L.marker([x.lat, x.lng], { icon: iconFor(x.type), keyboard: false, title: x.name });
        m.on('click', () => onSelect(x));
        added.push(m);
      });
      cluster.addLayers(added);
      loaded.add(part.file);
      onCount?.(summary());
    })();
    loading.set(part.file, job);
    try { await job; } finally { loading.delete(part.file); }
  }

  // 範囲を持たないパートは常に、範囲を持つパートは画面にかかるときだけ読む
  function partsInView() {
    const b = map.getBounds().pad(0.3);
    return parts.filter((p) => !p.bbox || b.intersects(L.latLngBounds([p.bbox[0], p.bbox[1]], [p.bbox[2], p.bbox[3]])));
  }
  const loadVisible = () => Promise.all(partsInView().map(loadPart));
  const onMove = () => { if (on) loadVisible().catch((e) => onCount?.(null, e)); };

  function summary() {
    const byType = {};
    items.forEach((x) => { byType[x.type] = (byType[x.type] || 0) + 1; });
    return { total: items.length, byType, partial: loaded.size < parts.length };
  }

  return {
    pack,
    async show() {
      on = true;
      map.addLayer(cluster);
      if (pack.parts) map.on('moveend', onMove);
      await loadVisible();
    },
    hide() {
      on = false;
      map.removeLayer(cluster);
      map.off('moveend', onMove);
    },
    typeLabel: (type) => types[type]?.label || '',
    summary,
  };
}
