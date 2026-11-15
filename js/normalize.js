// データの読み替え（ブラウザと tools/ のスクリプトの両方から使う純粋関数）。
// 正式な形は data/SCHEMA.md を参照。旧データの別名キーもここで吸収する。

const pick = (o, keys) => {
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  }
  return undefined;
};

const toNum = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : undefined;
};

const toBool = (v) => v === true || v === 1 || v === 'true' || v === '1' || v === 'yes';

/** 文字列からIDを作る（IDが無いデータ向け。同じ入力なら同じIDになる） */
export function stableId(prefix, str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${prefix}-${(h >>> 0).toString(36)}`;
}

const FOOD_WORDS = ['food', 'restaurant', '飲食', '飲食店', 'グルメ', 'cafe', 'カフェ'];

function normCategory(raw, kind) {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'food' || v === 'other') return v;
  if (FOOD_WORDS.some((w) => v.includes(w.toLowerCase()))) return 'food';
  if (v === 'その他') return 'other';
  if (raw === undefined && kind) return 'food';
  return v ? 'other' : 'food';
}

/** 店1件を正式な形にそろえる。緯度経度が読めないものは null を返す */
export function normalizePlace(o, index = 0) {
  const lat = toNum(pick(o, ['lat', 'latitude', 'y']));
  const lng = toNum(pick(o, ['lng', 'lon', 'long', 'longitude', 'x']));
  const name = pick(o, ['name', 'title', '店名']);
  if (lat === undefined || lng === undefined || !name) return null;

  const kind = pick(o, ['kind', 'genre', 'ジャンル', 'subcategory']);
  const source = pick(o, ['source', '出典']);
  const wishlist = toBool(pick(o, ['wishlist', 'wish', 'list', 'isWishlist', 'want'])) ||
    (typeof source === 'string' && source.includes('行きたい'));

  return {
    id: String(pick(o, ['id', 'shortcode', 'code']) ?? stableId('p', `${name}|${lat}|${lng}|${index}`)),
    name: String(name),
    lat, lng,
    category: normCategory(pick(o, ['category', 'type', '分類']), kind),
    kind: kind ? String(kind) : '',
    area: String(pick(o, ['area', 'エリア', 'region']) ?? ''),
    address: String(pick(o, ['address', '住所', 'addr']) ?? ''),
    memo: String(pick(o, ['memo', 'note', 'notes', 'メモ', 'caption']) ?? ''),
    source: String(source ?? (wishlist ? '行きたい場所リスト' : 'Instagram')),
    instagramUrl: String(pick(o, ['instagramUrl', 'instagram', 'igUrl', 'url', 'post', 'permalink']) ?? ''),
    tabelogUrl: String(pick(o, ['tabelogUrl', 'tabelog', '食べログ']) ?? ''),
    thumb: String(pick(o, ['thumb', 'thumbnail', 'image', 'img']) ?? ''),
    wishlist,
  };
}

/** 銭湯1件を正式な形にそろえる */
export function normalizeSento(o, index = 0) {
  const lat = toNum(pick(o, ['lat', 'latitude', 'y']));
  const lng = toNum(pick(o, ['lng', 'lon', 'long', 'longitude', 'x']));
  const name = pick(o, ['name', 'title', '名称']);
  if (lat === undefined || lng === undefined || !name) return null;
  const rawType = String(pick(o, ['type', 'category', 'kind', '種別']) ?? '').toLowerCase();
  const isSuper = rawType === 'super' || rawType.includes('スーパー') || rawType.includes('super') ||
    toBool(o.super);
  return {
    id: String(pick(o, ['id']) ?? stableId('s', `${name}|${lat}|${lng}|${index}`)),
    name: String(name),
    lat, lng,
    type: isSuper ? 'super' : 'sento',
    address: String(pick(o, ['address', '住所', 'addr']) ?? ''),
    url: String(pick(o, ['url', 'website', 'link']) ?? ''),
  };
}

/** JSONの中身（配列 or {places:[...]} など）から配列を取り出す */
export function unwrapList(json, keys = ['places', 'items', 'data', 'sento', 'features']) {
  if (Array.isArray(json)) return json;
  for (const k of keys) if (Array.isArray(json?.[k])) return json[k];
  return [];
}

/** GeoJSON の Feature を普通のオブジェクトに平たくする */
export function flattenFeature(f) {
  if (f?.type === 'Feature' && f.geometry?.type === 'Point') {
    const [lng, lat] = f.geometry.coordinates;
    return { ...f.properties, lat, lng };
  }
  return f;
}
