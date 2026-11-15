// データの読み込み。店は起動時に、銭湯は必要になったときに1回だけ読む。
import { DATA } from './config.js';
import { normalizePlace, normalizeSento, unwrapList, flattenFeature } from './normalize.js';

const useSample = new URLSearchParams(location.search).has('sample');
const paths = useSample ? { ...DATA, ...DATA.sample } : DATA;

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' }); // 更新したらすぐ反映させたいので毎回確認
  if (!res.ok) throw new Error(`${url} を読み込めませんでした（${res.status}）`);
  return res.json();
}

function normalizeAll(list, fn) {
  const out = [];
  const seen = new Set();
  list.map(flattenFeature).forEach((raw, i) => {
    const item = fn(raw, i);
    if (!item) return;
    // IDが重複していたら番号を足して区別する（データを消さない）
    let id = item.id, n = 2;
    while (seen.has(id)) id = `${item.id}-${n++}`;
    item.id = id;
    seen.add(id);
    out.push(item);
  });
  return out;
}

export async function loadPlaces() {
  const json = await fetchJson(paths.places);
  return normalizeAll(unwrapList(json), normalizePlace);
}

let sentoPromise = null;
export function loadSento() {
  sentoPromise ??= fetchJson(paths.sento).then((json) => normalizeAll(unwrapList(json), normalizeSento));
  return sentoPromise;
}

/** サムネイルのURL（http から始まればそのまま、ファイル名なら thumbs/ から） */
export function thumbUrl(thumb) {
  if (!thumb) return '';
  if (/^(https?:)?\/\//.test(thumb) || thumb.startsWith('data/')) return thumb;
  return DATA.thumbsDir + thumb;
}
