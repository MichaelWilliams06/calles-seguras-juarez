from pathlib import Path
import xml.etree.ElementTree as ET
import json

osm_path = Path(r"C:\Users\mw540\Downloads\Programa_Web_Final\map (4).osm") #
out_path = Path("zonas_juarez.geojson")

tree = ET.parse(osm_path)
root = tree.getroot()

features = []

for node in root.findall("node"):
  lat = node.attrib.get("lat")
  lon = node.attrib.get("lon")
  if lat is None or lon is None:
    continue

  tags = {
      tag.attrib["k"]: tag.attrib["v"]
      for tag in node.findall("tag")
      if "k" in tag.attrib and "v" in tag.attrib
  }

  features.append({
      "type": "Feature",
      "geometry": {
          "type": "Point",
          "coordinates": [float(lon), float(lat)],
      },
      "properties": {
          "id": node.attrib.get("id"),
          "name": tags.get("name"),
          "highway": tags.get("highway"),
          "amenity": tags.get("amenity"),
          "tags": tags,
      },
  })

geojson = {
    "type": "FeatureCollection",
    "features": features,
}

out_path.write_text(
    json.dumps(geojson, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(f"Listo: se exportaron {len(features)} nodos a {out_path}")