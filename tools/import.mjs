#!/usr/bin/env node
// 旧データを、このリポジトリの正式な形に変換して data/ に書き出す。元ファイルは書き換えない。
//
//   node tools/import.mjs places 旧/places.json            → data/places.json
//   node tools/import.mjs layer bath 旧/sento.json          → data/layers/bath.json
//
// - 項目の読み替えは js/normalize.js と同じものを使う
// - 正式名にない項目（author、geocode_confidence など）は消さずにそのまま残す
// - 1件も削らない。緯度経度か名前が読めない行は data/import-skipped-*.json に残して報告する
// - 同じIDが重複したら、2件目以降に -2, -3… を付ける（同じ投稿で複数店を紹介しているケース）
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { normalizePlace, normalizeLayerItem, extrasOf, unwrapList, flattenFeature } from '../js/normalize.js';

const args = process.argv.slice(2);
const mode = args[0];
let src, out, fn;
if (mode === 'places' && args[1]) {
  src = args[1]; out = 'data/places.json';
  fn = (r, i) => normalizePlace(r, i);
} else if (mode === 'layer' && args[1] && args[2]) {
  const packId = args[1];
  src = args[2]; out = `data/layers/${packId}.json`;
  fn = (r, i) => normalizeLayerItem(r, i, packId);
} else {
  console.error('使い方:\n  node tools/import.mjs places <元のJSON>\n  node tools/import.mjs layer <パックID> <元のJSON>');
  process.exit(1);
}

// 画面側で毎回計算できる項目は書き出さない
const DERIVED = new Set(['author', 'approx']);

const raw = unwrapList(JSON.parse(await readFile(src, 'utf8'))).map(flattenFeature);
const ok = [], skipped = [], seen = new Map();
raw.forEach((r, i) => {
  const x = fn(r, i);
  if (!x) return skipped.push(r);
  const n = seen.get(x.id) || 0;
  seen.set(x.id, n + 1);
  if (n) x.id = `${x.id}-${n + 1}`;
  const canonical = Object.fromEntries(Object.entries(x).filter(([k, v]) => !DERIVED.has(k) && v !== '' && v !== false));
  ok.push({ ...canonical, ...extrasOf(r) });
});

await mkdir(out.replace(/\/[^/]+$/, ''), { recursive: true });
await writeFile(out, JSON.stringify(ok, null, 1) + '\n');
console.log(`${out} に ${ok.length}件 書き出しました（元データ ${raw.length}件）`);
if (skipped.length) {
  const f = `data/import-skipped-${mode === 'layer' ? args[1] : 'places'}.json`;
  await writeFile(f, JSON.stringify(skipped, null, 1) + '\n');
  console.warn(`名前か緯度経度が読めなかった ${skipped.length}件 を ${f} に残しました。`);
}
