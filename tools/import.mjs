#!/usr/bin/env node
// 旧データ（ふわ側の places.json / sento.json）を、このリポジトリの正式な形に変換して data/ に書き出す。
// 使い方:
//   node tools/import.mjs places 旧/places.json
//   node tools/import.mjs sento  旧/sento.json
// 元ファイルは書き換えない。項目の読み替えは js/normalize.js と同じものを使う。
// 1件も削らない方針なので、緯度経度が読めない行は data/import-skipped-*.json に残して報告する。
import { readFile, writeFile } from 'node:fs/promises';
import { normalizePlace, normalizeSento, unwrapList, flattenFeature } from '../js/normalize.js';

const [kind, src] = process.argv.slice(2);
if (!['places', 'sento'].includes(kind) || !src) {
  console.error('使い方: node tools/import.mjs places|sento <元のJSON>');
  process.exit(1);
}

const raw = unwrapList(JSON.parse(await readFile(src, 'utf8'))).map(flattenFeature);
const fn = kind === 'places' ? normalizePlace : normalizeSento;
const ok = [], skipped = [];
raw.forEach((r, i) => { const x = fn(r, i); x ? ok.push(x) : skipped.push(r); });

// 空の項目は書き出さない（ファイルを読みやすく保つ）
const compact = ok.map((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== '' && v !== false)));

await writeFile(`data/${kind}.json`, JSON.stringify(compact, null, 1) + '\n');
console.log(`data/${kind}.json に ${ok.length}件 書き出しました（元データ ${raw.length}件）`);
if (skipped.length) {
  await writeFile(`data/import-skipped-${kind}.json`, JSON.stringify(skipped, null, 1) + '\n');
  console.warn(`緯度経度または名前が読めなかった ${skipped.length}件 を data/import-skipped-${kind}.json に残しました。手で直して places.json に足してください。`);
}
