# うまい店マップ

Instagramの保存コレクション「うまい店」から拾った店を地図にした、個人用のマップ。
ビルド不要の静的サイト（HTML＋CSS＋JavaScriptモジュール）で、GitHub Pages でそのまま動く。

## 店を足す

1. `data/places.json` の最後に1件足す（形は [data/SCHEMA.md](data/SCHEMA.md)）
2. サムネイルがあれば `data/thumbs/` に置く
3. `node tools/check.mjs` で点検 → コミット

## レイヤー（銭湯など）を足す

`data/layers.json` にパックを1項目足し、データを `data/layers/` に置くだけ（[data/SCHEMA.md](data/SCHEMA.md)）。

## 手元で動かす

```sh
python3 -m http.server 8000
# http://localhost:8000/           本番データ
# http://localhost:8000/?sample=1  サンプルデータ（動作確認用）
```

## 旧データの取り込み

```sh
node tools/import.mjs places 旧/places.json      # 店
node tools/import-list.mjs 旧/list.md            # 行きたい場所リストを反映（印付け＋未登録分の追加）
node tools/import.mjs layer bath 旧/sento.json   # お風呂パック
cp 旧/thumbs/*.jpg data/thumbs/
node tools/check.mjs
```

読めなかった行は削らずに `data/import-skipped-*.json` に残る。

## ファイルの役割

| ファイル | 役割 |
|---|---|
| `index.html` | 画面の骨組み |
| `css/app.css` | 見た目（色・余白は先頭の変数） |
| `js/config.js` | 設定値（ピンの色、シートの高さ、データの場所など） |
| `js/normalize.js` | データの読み替え（ブラウザとツールで共通） |
| `js/data.js` | 店データの読み込み |
| `js/map.js` | 地図・店ピン・現在地 |
| `js/layers.js` | 追加レイヤー（パック）。ONにしたときだけ読み込む |
| `js/labels.js` | 種類の表示名 |
| `js/filters.js` | 検索と絞り込み |
| `js/sheet.js` | 一覧ボトムシート（3段階） |
| `js/card.js` | 詳細カード |
| `js/main.js` | 起動と全体のつなぎ込み |
| `vendor/leaflet/` | Leaflet 1.9.4 と markercluster 1.5.3（外部CDNに頼らないよう同梱） |
| `tools/` | 点検・取り込みスクリプト（Node 18以上） |

地図タイルは OpenStreetMap。
