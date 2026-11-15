#!/usr/bin/env node
// データの点検。店を足したあとに実行すると、件数と気になる点を一覧にする。
// 使い方: node tools/check.mjs   （終了コード 1 = 直したほうがいい問題あり）
import { readFile, access } from 'node:fs/promises';
import { normalizePlace, normalizeSento, unwrapList } from '../js/normalize.js';

const dir = process.argv[2] || 'data';
let problems = 0;
const warn = (msg) => { problems++; console.log('  ⚠ ' + msg); };
const inJapan = (x) => x.lat > 20 && x.lat < 46 && x.lng > 122 && x.lng < 154;

async function check(file, fn, label) {
  const list = unwrapList(JSON.parse(await readFile(`${dir}/${file}`, 'utf8')));
  console.log(`\n■ ${label}（${file}）: ${list.length}件`);
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

const places = await check('places.json', normalizePlace, '店');
const food = places.filter((p) => p.category === 'food').length;
const wish = places.filter((p) => p.wishlist).length;
console.log(`  飲食店 ${food}／その他 ${places.length - food}（うち行きたい場所リスト ${wish}）`);

let noThumb = 0;
for (const p of places) {
  if (!p.thumb) { noThumb++; continue; }
  if (/^https?:/.test(p.thumb)) continue;
  try { await access(`${dir}/thumbs/${p.thumb}`); } catch { warn(`${p.name}：サムネイル ${p.thumb} が data/thumbs/ にありません`); }
}
if (noThumb) console.log(`  サムネイルなし ${noThumb}件（表示はされます）`);

const sento = await check('sento.json', normalizeSento, '銭湯');
const sup = sento.filter((s) => s.type === 'super').length;
console.log(`  銭湯 ${sento.length - sup}／スーパー銭湯 ${sup}`);

console.log(problems ? `\n気になる点が ${problems}件 あります。` : '\n問題なし。');
process.exit(problems ? 1 : 0);
