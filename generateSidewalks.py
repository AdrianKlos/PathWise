import json

with open("filtered_streets_data.geojson", "r") as f:
    data = json.load(f)


streets_with_status = []


for feature in data.get("features", []):
    fc_status = None
    if feature.get("properties"):
        fc_status = feature["properties"].get("FC_STATUS")

    coords = feature["geometry"]["coordinates"]

    if isinstance(coords[0], list):

        for coord_set in coords:

            if isinstance(coord_set[0], list):
                for coord in coord_set:
                    streets_with_status.append((coord, fc_status))
            else:
                streets_with_status.append((coord_set, fc_status))
    else:

        streets_with_status.append((coords, fc_status))

sidewalks1 = []
i = 0
for street, status in streets_with_status:
    x, y = street
    if status == "Minor Arterial":
        sidewalks1.append([x - 0.000121, y])  
        sidewalks1.append([x + 0.000121, y])  
    else:
        sidewalks1.append([x - 0.000039, y])  
        sidewalks1.append([x + 0.000039, y])
    i+=1;

sidewalk_features1 = [
    {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": point
        },
        "properties": {}
    }
    for point in sidewalks1
]



sidewalk_geojson1 = {
    "type": "FeatureCollection",
    "features": sidewalk_features1
}


# Save the new GEOJson file
with open("mapData.geoJSON", "w") as f:
    json.dump(sidewalk_geojson1, f, indent=2)
    
print("mapData.geoJSON has been created with sidewalk points.")


