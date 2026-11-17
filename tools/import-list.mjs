#!/usr/bin/env node
// 行きたい場所リスト（list.md：人間が読む正本）を data/places.json に反映する。
//   node tools/import-list.mjs 旧/list.md
//
// - list.md の各項目（「## 番号. 店名｜エリア」）を読む
// - 同じInstagram投稿の店が places.json にあれば wishlist（金色リング）を付ける。
//   食べログURLが places.json 側に無く list.md に書いてあれば、それも補う（既存の値は上書きしない）
// - なければ、住所・座標・カテゴリから1件作って最後に足す
// - places.json の既存の店は消さない・書き換えない（wishlist の印を足すだけ）
import { readFile, writeFile } from 'node:fs/promises';
import { igCode } from '../js/normalize.js';

const src = process.argv[2];
if (!src) { console.error('使い方: node tools/import-list.mjs <list.md>'); process.exit(1); }

const md = await readFile(src, 'utf8');
const places = JSON.parse(await readFile('data/places.json', 'utf8'));

const field = (block, label) => {
  const m = block.match(new RegExp(`\\*\\*${label}\\*\\*：([^\\n]*)`));
  return m ? m[1].trim() : '';
};

const entries = md.split(/\n(?=## \d+\.)/).filter((b) => /^## \d+\./.test(b));
let marked = 0, added = 0, tabelogFilled = 0;
for (const block of entries) {
  const head = block.match(/^## \d+\.\s*(.+?)(?:｜(.+))?$/m);
  const name = head[1].replace(/（[^）]*）/g, '').trim();
  const area = (head[2] || '').trim();
  const url = (block.match(/https:\/\/www\.instagram\.com\/[^\s）)]+/) || [''])[0];
  const code = igCode(url);
  const coord = block.match(/座標：\s*([\d.]+)\s*,\s*([\d.]+)/);
  const category = field(block, 'カテゴリ');
  const tabelog = (field(block, '食べログ').match(/https:\/\/tabelog\.com\/[^\s）)]+/) || [''])[0];
  const address = field(block, '住所').replace(/^〒\d{3}-\d{4}\s*/, '').replace(/（※.*$/, '');

  const hit = code && places.find((p) => p.instagramUrl && igCode(p.instagramUrl) === code);
  if (hit) {
    if (!hit.wishlist) { hit.wishlist = true; marked++; }
    if (tabelog && !hit.tabelogUrl) { hit.tabelogUrl = tabelog; tabelogFilled++; }
    continue;
  }
  if (!coord) { console.warn(`座標がないので足せませんでした：${name}`); continue; }
  const isFood = /グルメ|飲食|カフェ|スイーツ/.test(category);
  const sub = category.split('・').slice(1).join('・');
  let id = code || `list-${places.length + 1}`;
  let n = 2;
  while (places.some((p) => p.id === id)) id = `${code}-${n++}`;
  places.push({
    id, name,
    lat: Number(coord[1]), lng: Number(coord[2]),
    category: isFood ? 'food' : 'other',
    // サブタイプは旧データの粒度（飲食／スイーツ／施設…）に合わせる。食以外はカテゴリの先頭語（例：体験）
    kind: isFood ? (/スイーツ/.test(sub) ? 'スイーツ' : '飲食') : category.split('・')[0],
    area, address,
    source: '行きたい場所リスト',
    ...(url ? { instagramUrl: url } : {}),
    ...(tabelog ? { tabelogUrl: tabelog } : {}),
    ...(code ? { thumb: `${code}.jpg` } : {}),
    wishlist: true,
  });
  added++;
}

await writeFile('data/places.json', JSON.stringify(places, null, 1) + '\n');
console.log(`行きたい場所リスト ${entries.length}件：既存の店に印 ${marked}件／新しく追加 ${added}件／食べログURLを補った店 ${tabelogFilled}件 → places.json は ${places.length}件`);
