#!/usr/bin/env node
// データの点検。店を足したあとに実行すると、件数と気になる点を一覧にする。
// 使い方: node tools/check.mjs [dataフォルダ]   （終了コード 1 = 直したほうがいい問題あり）
import { readFile, access } from 'node:fs/promises';
import { normalizePlace, normalizeLayerItem, unwrapList } from '../js/normalize.js';

const dir = process.argv[2] || 'data';
let problems = 0;
const warn = (msg) => { problems++; console.log('  ⚠ ' + msg); };
const inJapan = (x) => x.lat > 20 && x.lat < 46 && x.lng > 122 && x.lng < 154;
const readJson = async (f) => JSON.parse(await readFile(f, 'utf8'));

function checkList(list, fn) {
  const ids = new Map();
  const items = [];
  list.forEach((r, i) => {
    const x = fn(r, i);
    if (!x) return warn(`${i + 1}件目：名前か緯度経度が読めません → ${JSON.stringify(r).slice(0, 80)}`);
    if (!inJapan(x)) warn(`${x.name}：緯度経度が日本の外です（緯度と経度が逆かも）`);
    if (ids.has(x.id)) warn(`${x.name}：ID「${x.id}」が ${ids.get(x.id)} と重複`);
    ids.set(x.id, x.name);
    items.push(x);
  });
  return items;
}

// 店
const placesRaw = unwrapList(await readJson(`${dir}/places.json`));
console.log(`\n■ 店（places.json）: ${placesRaw.length}件`);
const places = checkList(placesRaw, normalizePlace);
const food = places.filter((p) => p.category === 'food').length;
const wish = places.filter((p) => p.wishlist).length;
console.log(`  飲食店 ${food}／その他 ${places.length - food}（うち行きたい場所リスト ${wish}）`);
const approx = places.filter((p) => p.approx);
if (approx.length) console.log(`  位置がおおよその店 ${approx.length}件：${approx.map((p) => p.name).join('、')}`);

let noThumb = 0;
for (const p of places) {
  if (!p.thumb) { noThumb++; continue; }
  if (/^(https?:)?\/\//.test(p.thumb) || p.thumb.startsWith('data/')) continue;
  try { await access(`${dir}/thumbs/${p.thumb}`); } catch { warn(`${p.name}：サムネイル ${p.thumb} が thumbs/ にありません`); }
}
if (noThumb) console.log(`  サムネイルなし ${noThumb}件（表示はされます）`);

// 追加レイヤー（パック）
let packs = [];
try { packs = (await readJson(`${dir}/layers.json`)).packs || []; } catch { console.log('\n（layers.json なし）'); }
for (const pack of packs) {
  const files = pack.parts ? pack.parts.map((p) => p.file) : [pack.file];
  let all = [];
  for (const f of files) {
    try { all = all.concat(unwrapList(await readJson(f.startsWith(dir + "/") ? f : f.replace(/^data\//, `${dir}/`)))); }
    catch { warn(`パック「${pack.name}」のファイル ${f} が読めません`); }
  }
  console.log(`\n■ レイヤー「${pack.name}」（${files.join(', ')}）: ${all.length}件`);
  const items = checkList(all, (r, i) => normalizeLayerItem(r, i, pack.id));
  const byType = {};
  items.forEach((x) => { byType[x.type] = (byType[x.type] || 0) + 1; });
  for (const [t, n] of Object.entries(byType)) {
    const label = pack.types?.[t]?.label;
    if (!label) warn(`種類「${t}」が layers.json の types にありません（${n}件）`);
    console.log(`  ${label || t} ${n}`);
  }
}

console.log(problems ? `\n気になる点が ${problems}件 あります。` : '\n問題なし。');
process.exit(problems ? 1 : 0);
