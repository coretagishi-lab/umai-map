// 起動と各部品のつなぎ込み
import { LABELS } from './config.js';
import { loadPlaces, loadSento, thumbUrl } from './data.js';
import { createMap, createPlaceLayer, createSentoLayer, createLocator } from './map.js';
import { createFilters, escapeHtml as h } from './filters.js';
import { createSheet } from './sheet.js';
import { createCard } from './card.js';
import { kindLabel } from './labels.js';

const $ = (id) => document.getElementById(id);

const map = createMap($('map'));
const locator = createLocator(map);
const sheet = createSheet($('sheet'), $('sheet-handle'));
const card = createCard($('card'), $('card-body'), { onClose: () => closeCard() });

let places = [];
let visible = [];

const placeLayer = createPlaceLayer(map, (p) => openPlace(p, { fromMap: true }));
const sentoLayer = createSentoLayer(map, (s) => { placeLayer.select(null); card.showSento(s); pushCardState(); });

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
  } else if (places.length) {
    map.fitBounds(placeLayer.bounds(), { padding: [40, 40], maxZoom: 14, animate: false });
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

// ── 銭湯レイヤー（初期OFF。初めてONにしたときに読み込む） ─────────
$('sento-toggle').addEventListener('change', async (e) => {
  if (!e.target.checked) { sentoLayer.hide(); return; }
  if (!sentoLayer.isBuilt()) {
    $('sento-count').textContent = '読み込み中…';
    try {
      const list = await loadSento();
      sentoLayer.build(list);
      const sup = list.filter((s) => s.type === 'super').length;
      $('sento-count').textContent = `${list.length}件（${LABELS.sentoType.sento}${list.length - sup}・${LABELS.sentoType.super}${sup}）`;
    } catch (err) {
      $('sento-count').textContent = '';
      e.target.checked = false;
      toast(err.message);
      return;
    }
  }
  if (e.target.checked) sentoLayer.show();
});

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
