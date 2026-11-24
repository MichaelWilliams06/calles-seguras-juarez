import json
import math
from pathlib import Path

GEOJSON_PATH = Path("zonas_juarez.geojson")


def distancia_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
  r = 6371.0
  p1, p2 = math.radians(lat1), math.radians(lat2)
  dp = math.radians(lat2 - lat1)
  dl = math.radians(lon2 - lon1)
  a = (
      math.sin(dp / 2) ** 2
      + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
  )
  return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def consultar_zona(
    lat: float, lon: float, radio_km: float = 1.0, solo_con_etiquetas: bool = True
):
  data = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
  resultados = []

  for feat in data.get("features", []):
    coords = feat["geometry"]["coordinates"]  # [lon, lat]
    n_lon, n_lat = coords[0], coords[1]
    props = feat.get("properties", {})
    tags = props.get("tags") or {}

    if solo_con_etiquetas and not tags:
      continue

    dist = distancia_km(lat, lon, n_lat, n_lon)
    if dist <= radio_km:
      resultados.append({
          **feat,
          "properties": {
              **props,
              "distancia_km": round(dist, 3),
          },
      })

  return {
      "centro": {"lat": lat, "lon": lon},
      "radio_km": radio_km,
      "total_encontrados": len(resultados),
      "features": resultados,
  }