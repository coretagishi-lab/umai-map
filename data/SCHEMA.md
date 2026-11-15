# データの形（店の追加はここだけ読めばOK）

店を増やすときは **`data/places.json` の配列の最後に1件足すだけ**。コードは触らない。
足したら `node tools/check.mjs` で点検する（件数・重複・緯度経度の逆転・サムネイルの有無）。

## 店（data/places.json）

```json
{
  "id": "C1a2B3c4D5e",
  "name": "店名",
  "lat": 35.6581,
  "lng": 139.7017,
  "category": "food",
  "kind": "ラーメン",
  "area": "渋谷",
  "address": "東京都渋谷区…",
  "memo": "つけ麺が本命",
  "source": "Instagram",
  "instagramUrl": "https://www.instagram.com/p/C1a2B3c4D5e/",
  "tabelogUrl": "https://tabelog.com/tokyo/…",
  "thumb": "C1a2B3c4D5e.jpg",
  "wishlist": false
}
```

| 項目 | 必須 | 説明 |
|---|---|---|
| name | ○ | 店名 |
| lat / lng | ○ | 緯度・経度（数値） |
| id | | 省略可。Instagram投稿のショートコードを推奨。URLの `#id` で直接その店を開ける |
| category | | `food`（飲食店・赤ピン）か `other`（それ以外・青ピン）。省略時は food |
| kind | | ジャンル。絞り込みの「種類」に出る。空なら「飲食店／その他」 |
| area | | 絞り込みの「エリア」に出る |
| address / memo | | 詳細カードに表示 |
| source | | 絞り込みの「出典」に出る。省略時は Instagram |
| instagramUrl | | 「Instagramの元投稿」ボタン |
| tabelogUrl | | あるときだけ「食べログを開く（電話・予約）」ボタン |
| thumb | | `data/thumbs/` 内のファイル名（幅240pxのJPEG推奨）か、画像のURL |
| wishlist | | `true` で金色リング（行きたい場所リスト枠） |

旧データの別名（`title`、`latitude`、`longitude`、`genre`、`note` など）も読めるが、新しく足す分は上の名前で書く。

## 銭湯（data/sento.json）

```json
{ "id": "s001", "name": "○○湯", "lat": 35.71, "lng": 139.79, "type": "sento", "address": "…", "url": "" }
```

`type` は `sento`（銭湯・水色）か `super`（スーパー銭湯・青緑）。
銭湯データは「銭湯を表示」をONにしたときに初めて読み込まれる（初期表示を軽くするため）。

## 件数

画面の件数表示はすべてデータから自動で数える。手で書く場所はない。
