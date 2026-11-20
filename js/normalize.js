// データの読み替え（ブラウザと tools/ のスクリプトの両方から使う純粋関数）。
import { normalizeHours } from './hours-data.js';
// 正式な形は data/SCHEMA.md を参照。旧データの別名キーもここで吸収する。

// 項目ごとに受け付ける名前（左が正式名）
const ALIASES = {
  id: ['id', 'shortcode', 'code'],
  name: ['name', 'title', '店名', '名称'],
  lat: ['lat', 'latitude'],
  lng: ['lng', 'lon', 'long', 'longitude'],
  category: ['category', '分類'],
  kind: ['kind', 'subtype', 'genre', 'ジャンル'],
  area: ['area', 'エリア', 'region'],
  address: ['address', '住所', 'addr'],
  memo: ['memo', 'note', 'notes', 'メモ'],
  source: ['source', '出典'],
  instagramUrl: ['instagramUrl', 'instagram_url', 'instagram', 'igUrl', 'permalink'],
  tabelogUrl: ['tabelogUrl', 'tabelog_url', 'tabelog', '食べログ'],
  thumb: ['thumb', 'thumbnail', 'image', 'img'],
  wishlist: ['wishlist', 'wish', 'isWishlist'],
  type: ['type', '種別'],
  url: ['url', 'source_url', 'website', 'link'],
};
const ALL_ALIAS_KEYS = new Set(Object.values(ALIASES).flat());

const pick = (o, field) => {
  for (const k of ALIASES[field]) {
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

/** Instagram投稿URLからショートコードを取り出す */
export function igCode(url) {
  const m = String(url || '').match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}

/** 正式名にも別名にも当たらない項目（author など）。消さずに持ち回るために使う */
export function extrasOf(o) {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !ALL_ALIAS_KEYS.has(k)));
}

// 出典の表記ゆれ（旧データの内部名を画面向けの言葉に）
const SOURCE_NAMES = { 'places-to-go': '行きたい場所リスト', instagram: 'Instagram' };

function normCategory(raw) {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'food' || v === 'other') return v;
  if (/飲食|グルメ|restaurant|food|cafe|カフェ/.test(v)) return 'food';
  return v ? 'other' : 'food';
}

/** 店1件を正式な形にそろえる。緯度経度か名前が読めないものは null を返す */
export function normalizePlace(o, index = 0) {
  const lat = toNum(pick(o, 'lat'));
  const lng = toNum(pick(o, 'lng'));
  const name = pick(o, 'name');
  if (lat === undefined || lng === undefined || !name) return null;

  const instagramUrl = String(pick(o, 'instagramUrl') ?? '');
  const rawSource = pick(o, 'source');
  const source = SOURCE_NAMES[String(rawSource ?? '').toLowerCase()] ?? (rawSource ? String(rawSource) : 'Instagram');
  const wishlist = toBool(pick(o, 'wishlist')) || source === '行きたい場所リスト';
  const code = igCode(instagramUrl);

  return {
    id: String(pick(o, 'id') ?? (code || stableId('p', `${name}|${lat}|${lng}|${index}`))),
    name: String(name),
    lat, lng,
    category: normCategory(pick(o, 'category')),
    kind: String(pick(o, 'kind') ?? ''),
    area: String(pick(o, 'area') ?? ''),
    address: String(pick(o, 'address') ?? ''),
    memo: String(pick(o, 'memo') ?? ''),
    source,
    instagramUrl,
    tabelogUrl: String(pick(o, 'tabelogUrl') ?? ''),
    // サムネイルは指定がなければ「ショートコード.jpg」
    thumb: String(pick(o, 'thumb') ?? (code ? `${code}.jpg` : '')),
    wishlist,
    author: String(o.author ?? ''),
    approx: o.geocode_confidence === 'low' || toBool(o.approx), // 位置がおおよそ
    hours: normalizeHours(o.hours ?? o['営業時間']),
  };
}

/** レイヤー（銭湯など）の1件。type はレイヤー定義の types のどれか */
export function normalizeLayerItem(o, index = 0, prefix = 'l') {
  const lat = toNum(pick(o, 'lat'));
  const lng = toNum(pick(o, 'lng'));
  const name = pick(o, 'name');
  if (lat === undefined || lng === undefined || !name) return null;
  return {
    id: String(pick(o, 'id') ?? stableId(prefix, `${name}|${lat}|${lng}|${index}`)),
    name: String(name),
    lat, lng,
    type: String(pick(o, 'type') ?? ''),
    area: String(pick(o, 'area') ?? ''),
    address: String(pick(o, 'address') ?? ''),
    url: String(pick(o, 'url') ?? ''),
  };
}

/** JSONの中身（配列 or {items:[...]} など）から配列を取り出す */
export function unwrapList(json, keys = ['items', 'places', 'data', 'features']) {
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
