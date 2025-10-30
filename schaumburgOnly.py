import json
from shapely.geometry import shape, box, Point


min_lat, max_lat = 41.98247, 42.08164
min_lon, max_lon = -88.15758, -88.02550
bbox = box(min_lon, min_lat, max_lon, max_lat)

def filter_geojson(input_file, output_file):
    with open(input_file, "r") as f:
        data = json.load(f)

    filtered_features = []

    for feature in data["features"]:
        geom = shape(feature["geometry"])

        if geom.geom_type != "LineString":
            continue 

        coords = list(geom.coords)


        if all(bbox.contains(Point(coord)) for coord in coords):
            filtered_features.append(feature)


    output_data = {
        "type": "FeatureCollection",
        "features": filtered_features
    }

    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"Saved {len(filtered_features)} LineStrings to {output_file}")
filter_geojson("mapData.geojson", "filtered.geojson")
