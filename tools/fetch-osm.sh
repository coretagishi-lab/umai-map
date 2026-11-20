#!/bin/sh
# OpenStreetMap から全国の公衆トイレ／コンビニを取得する（無料の Overpass API）。
#   sh tools/fetch-osm.sh toilet    → tmp/osm-toilet.json
#   sh tools/fetch-osm.sh konbini   → tmp/osm-konbini.json
# 取得後: node tools/osm-to-pack.mjs <toilet|konbini> tmp/osm-<…>.json
set -e
mkdir -p tmp
case "$1" in
  toilet)  Q='[out:json][timeout:600];area["ISO3166-1"="JP"][admin_level=2]->.jp;(nwr["amenity"="toilets"](area.jp););out center tags;' ;;
  konbini) Q='[out:json][timeout:600];area["ISO3166-1"="JP"][admin_level=2]->.jp;(nwr["shop"="convenience"](area.jp););out center tags;' ;;
  *) echo "使い方: sh tools/fetch-osm.sh toilet|konbini"; exit 1 ;;
esac
curl -sS --fail -m 900 -X POST --data-urlencode "data=$Q" https://overpass-api.de/api/interpreter -o "tmp/osm-$1.json"
echo "tmp/osm-$1.json を保存しました"
