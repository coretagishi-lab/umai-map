#!/usr/bin/env node
// OpenStreetMap（Overpass）から取った全国データを、レイヤーパックに変換する。
//
//   sh tools/fetch-osm.sh toilet     → tmp/osm-toilet.json   （取得）
//   node tools/osm-to-pack.mjs toilet tmp/osm-toilet.json     （変換して data/layers.json に登録）
//   （konbini も同じ）
//
// 全国で数万件あるので、緯度経度1度ごとのマス（タイル）に分けて保存し、
// layers.json の parts に「ファイル＋範囲」で登録する。画面は見えているマスの分だけ読み込む。
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';

const PACKS = {
  toilet: {
    id: 'toilet',
    name: '公衆トイレ',
    icon: '🚻',
    credit: '© OpenStreetMap contributors（ODbL）',
    types: {
      toilet: { label: '公衆トイレ', color: '#8e4ec6' },
      accessible: { label: '公衆トイレ（車いす対応）', color: '#6e56cf' },
    },
    cluster: { radius: 50, disableAtZoom: 17 },
    pick: (t) => (t.wheelchair === 'yes' ? 'accessible' : 'toilet'),
    itemName: (t) => t['name:ja'] || t.name || '公衆トイレ',
  },
  konbini: {
    id: 'konbini',
    name: 'コンビニ',
    icon: '🏪',
    credit: '© OpenStreetMap contributors（ODbL）',
    types: {
      seven: { label: 'セブン-イレブン', color: '#ee7f00' },
      lawson: { label: 'ローソン', color: '#0068b7' },
      famima: { label: 'ファミリーマート', color: '#00a040' },
      other: { label: 'その他のコンビニ', color: '#8b8d98' },
    },
    cluster: { radius: 50, disableAtZoom: 17 },
    pick: (t) => {
      const s = `${t.brand || ''} ${t['brand:ja'] || ''} ${t.name || ''} ${t['brand:en'] || ''}`.toLowerCase();
      if (/セブン|7-eleven|seven/.test(s)) return 'seven';
      if (/ローソン|lawson/.test(s)) return 'lawson';
      if (/ファミリーマート|ファミマ|familymart/.test(s)) return 'famima';
      return 'other';
    },
    itemName: (t) => t['name:ja'] || t.name || t['brand:ja'] || t.brand || 'コンビニ',
  },
};

const [packId, src] = process.argv.slice(2);
const def = PACKS[packId];
if (!def || !src) {
  console.error(`使い方: node tools/osm-to-pack.mjs <${Object.keys(PACKS).join('|')}> <Overpassの結果JSON>`);
  process.exit(1);
}

const json = JSON.parse(await readFile(src, 'utf8'));
const tiles = new Map(); // "35_139" -> items
let n = 0;
for (const el of json.elements || []) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) continue;
  const t = el.tags || {};
  if (packId === 'toilet' && (t.access === 'private' || t.access === 'no' || t.access === 'customers')) continue;
  const item = {
    id: `${el.type[0]}${el.id}`,
    name: def.itemName(t),
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    type: def.pick(t),
  };
  const addr = [t['addr:province'], t['addr:city'], t['addr:quarter'], t['addr:neighbourhood'], t['addr:block_number'] || t['addr:housenumber']].filter(Boolean).join('');
  if (addr) item.address = addr;
  if (t.opening_hours) item.hours = t.opening_hours;
  const key = `${Math.floor(lat)}_${Math.floor(lng)}`;
  if (!tiles.has(key)) tiles.set(key, []);
  tiles.get(key).push(item);
  n++;
}

const dir = `data/layers/${packId}`;
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });
const parts = [];
for (const [key, items] of [...tiles].sort()) {
  const [la, ln] = key.split('_').map(Number);
  const file = `${dir}/${key}.json`;
  await writeFile(file, JSON.stringify(items) + '\n');
  parts.push({ file, bbox: [la, ln, la + 1, ln + 1] });
}

// layers.json に登録（同じidがあれば置き換え）
const idx = JSON.parse(await readFile('data/layers.json', 'utf8'));
const { pick, itemName, ...rest } = def;
const entry = { ...rest, parts };
idx.packs = (idx.packs || []).filter((p) => p.id !== packId).concat(entry);
await writeFile('data/layers.json', JSON.stringify(idx, null, 2) + '\n');

console.log(`${entry.name}：${n}件を ${parts.length}マスに分けて ${dir}/ に保存し、data/layers.json に登録しました`);
