// 起動と各部品のつなぎ込み
import { LABELS } from './config.js';
import { loadPlaces, thumbUrl, layersIndexUrl } from './data.js';
import { createMap, createPlaceLayer, createLocator } from './map.js';
import { loadPackIndex, createPackLayer } from './layers.js';
import { createFilters, escapeHtml as h } from './filters.js';
import { createSheet } from './sheet.js';
import { createCard } from './card.js';
import { kindLabel } from './labels.js';

const $ = (id) => document.getElementById(id);

const map = createMap($('map'));
const locator = createLocator(map);
const sheet = createSheet($('sheet'), $('sheet-handle'), {
  // 一覧は開いたときに作る（閉じている間にサムネイルを読まないため）
  onChange: (state) => { if (state !== 'peek' && listDirty) renderList(); },
});
let listDirty = true;
const card = createCard($('card'), $('card-body'), { onClose: () => closeCard() });

let places = [];
let visible = [];

const placeLayer = createPlaceLayer(map, (p) => openPlace(p, { fromMap: true }));

// ── 起動 ──────────────────────────────────────────
(async function start() {
  try {
    places = await loadPlaces();
  } catch (e) {
    $('count').textContent = 'データを読み込めませんでした';
    toast(e.message);
    console.error(e);
    return;
  }
  const filters = createFilters(places, render);
  render(filters.apply());

  // URLの #id で直接その店を開く。なければ全件が収まる範囲を表示
  const fromHash = decodeURIComponent(location.hash.slice(1));
  const hit = fromHash && places.find((p) => p.id === fromHash);
  if (hit) {
    map.setView([hit.lat, hit.lng], 16, { animate: false });
    openPlace(hit);
  } else {
    if (places.length) map.fitBounds(mainArea(places), { padding: [40, 40], maxZoom: 14, animate: false });
    // 開いたらすぐ現在地へ。取れなければ（許可しない・圏外など）そのまま店の多い地域を表示
    locator.locate({ zoom: 15 }).then(() => renderList()).catch((e) => console.info(e.message));
  }
})();

// ── 一覧と地図の描き直し ───────────────────────────────
function render(list) {
  visible = list;
  placeLayer.setPlaces(list);
  updateCount();
  renderList();
}

function updateCount() {
  const food = visible.filter((p) => p.category === 'food').length;
  const total = places.length;
  const head = visible.length === total ? `${total}件` : `${visible.length}件／全${total}件`;
  $('count').textContent = `${head}（${LABELS.category.food}${food}・${LABELS.category.other}${visible.length - food}）`;
}

function renderList() {
  if (sheet.state === 'peek') { listDirty = true; return; }
  listDirty = false;
  const me = locator.last();
  let rows = visible;
  if (me) {
    rows = visible.map((p) => ({ p, d: distanceM(me, p) })).sort((a, b) => a.d - b.d);
  } else {
    rows = visible.map((p) => ({ p, d: null }));
  }
  const ul = $('list');
  if (!rows.length) {
    ul.innerHTML = places.length
      ? '<li class="list__empty">条件に合う店がありません</li>'
      : '<li class="list__empty">店データがまだ入っていません（data/places.json）</li>';
    return;
  }
  ul.innerHTML = rows.map(({ p, d }) => {
    const img = thumbUrl(p.thumb);
    return `<li class="row" data-id="${h(p.id)}">
      <span class="row__thumb">${img ? `<img src="${h(img)}" alt="" loading="lazy" decoding="async" width="56" height="56" onerror="this.remove()">` : ''}</span>
      <span class="row__text">
        <span class="row__name">${p.wishlist ? '<span class="dot dot--wish" title="行きたい場所リスト"></span>' : ''}${h(p.name)}</span>
        <span class="row__sub"><span class="dot dot--${p.category}"></span>${h(kindLabel(p))}${p.area ? `・${h(p.area)}` : ''}${d !== null ? `・${fmtDist(d)}` : ''}</span>
      </span>
    </li>`;
  }).join('');
}

$('list').addEventListener('click', (e) => {
  const li = e.target.closest('.row');
  if (!li) return;
  const p = places.find((x) => x.id === li.dataset.id);
  if (p) { sheet.set('peek'); openPlace(p); }
});

// ── 詳細カード ─────────────────────────────────────
function openPlace(p) {
  placeLayer.select(p.id);
  card.showPlace(p);
  pushCardState(p.id);
  // カードが表示されて高さが決まってから、ピンがカードに隠れない位置へ
  requestAnimationFrame(() => placeLayer.reveal(p, card.height()));
}

let cardInHistory = false;
function pushCardState(id = '') {
  const url = id ? `#${encodeURIComponent(id)}` : location.pathname + location.search;
  if (cardInHistory) history.replaceState({ card: true }, '', url);
  else { history.pushState({ card: true }, '', url); cardInHistory = true; }
}
function closeCard() {
  if (cardInHistory) history.back(); // 戻るボタンと同じ動きにそろえる
  else hideCard();
}
function hideCard() {
  card.close();
  placeLayer.select(null);
}
window.addEventListener('popstate', () => { cardInHistory = false; hideCard(); history.replaceState(null, '', location.pathname + location.search); });
map.on('click', () => { if (card.isOpen()) closeCard(); });

// ── 追加レイヤー（パック）。一覧だけ起動時に読み、中身はONにしたとき読む ──
(async function setupPacks() {
  let packs;
  try { packs = await loadPackIndex(layersIndexUrl); } catch (e) { console.warn(e); return; }
  if (!packs.length) return;
  $('packs-group').hidden = false;
  const box = $('packs');
  for (const pack of packs) {
    const row = document.createElement('div');
    row.className = 'pack-row';
    row.innerHTML = `
      <label class="switch"><input type="checkbox"><span class="switch__ui" aria-hidden="true"></span>${pack.icon ? `<span aria-hidden="true">${h(pack.icon)}</span>` : ''}${h(pack.name)}</label>
      <span class="muted pack-count"></span>`;
    const input = row.querySelector('input');
    const countEl = row.querySelector('.pack-count');
    const layer = createPackLayer(map, pack, {
      onSelect: (x) => { placeLayer.select(null); card.showLayerItem(x); pushCardState(); },
      onCount: (sum, err) => {
        if (err) return toast(err.message);
        const order = [...Object.keys(pack.types || {}), ...Object.keys(sum.byType)];
        const parts = [...new Set(order)].filter((t) => sum.byType[t]).map((t) => `${layer.typeLabel(t) || t}${sum.byType[t]}`);
        countEl.textContent = `${sum.total}件${parts.length > 1 ? `（${parts.join('・')}）` : ''}${sum.partial ? '（表示範囲ぶん）' : ''}`;
      },
    });
    input.addEventListener('change', async () => {
      if (!input.checked) { layer.hide(); return; }
      if (!layer.summary().total) countEl.textContent = '読み込み中…';
      try {
        await layer.show();
      } catch (err) {
        layer.hide(); input.checked = false; countEl.textContent = '';
        toast(err.message);
      }
    });
    box.appendChild(row);
  }
})();

// ── 現在地・ズーム ──────────────────────────────────
$('btn-locate').addEventListener('click', async () => {
  const btn = $('btn-locate');
  btn.classList.add('ctrl--busy');
  try {
    await locator.locate();
    renderList(); // 近い順に並べ替え
  } catch (e) {
    toast(e.message);
  } finally {
    btn.classList.remove('ctrl--busy');
  }
});
$('btn-zoom-in').addEventListener('click', () => map.zoomIn());
$('btn-zoom-out').addEventListener('click', () => map.zoomOut());

// ── 小物 ─────────────────────────────────────────
/** 最初に見せる範囲：店が一番集まっている地域（遠方の数件で日本全体まで引かないように） */
function mainArea(list) {
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const c = { lat: med(list.map((p) => p.lat)), lng: med(list.map((p) => p.lng)) };
  const near = list.filter((p) => distanceM(c, p) < 30000);
  const use = near.length >= list.length * 0.5 ? near : list;
  return L.latLngBounds(use.map((p) => [p.lat, p.lng]));
}

function distanceM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function fmtDist(m) { return m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)}km`; }

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}
