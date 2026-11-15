// 設定値はすべてここに集める。見た目や挙動を変えるときはまずこのファイルを見る。

export const DATA = {
  places: 'data/places.json',
  layers: 'data/layers.json',    // 追加レイヤー（パック）の一覧。銭湯などはここから
  thumbsDir: 'data/thumbs/',
  // 開発用：URLに ?sample=1 を付けるとサンプルデータで動く
  sample: { places: 'data/sample/places.json', layers: 'data/sample/layers.json' },
};

// 初期表示（データがあれば全件が収まる範囲に自動で合わせる）
export const MAP = {
  center: [35.681, 139.767],
  zoom: 12,
  maxZoom: 19,
  tiles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap',
  clusterRadius: 45,
  disableClusteringAtZoom: 17,
};

// ピンの色
export const COLORS = {
  food: '#e5484d',     // 飲食店＝赤系
  other: '#3e63dd',    // それ以外＝青
  wishRing: '#d4a72c', // 行きたい場所リスト＝金色リング
  // 追加レイヤー（銭湯など）の色は data/layers.json に書く
};

export const LABELS = {
  category: { food: '飲食店', other: 'その他' },
};

// ボトムシートの3段階（画面の高さに対する見えている割合）
export const SHEET = {
  peekPx: 76,
  midRatio: 0.45,
  fullRatio: 0.88,
};

export const SEARCH_DEBOUNCE_MS = 150;
