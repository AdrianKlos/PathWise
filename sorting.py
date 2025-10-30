import json
import os

INPUT_GEOJSON_FILE = 'mapData.geoJSON' 
OUTPUT_GEOJSON_FILE = 'filtered_streets_data.geojson'
PROPERTY_KEY_TO_CHECK = 'STATUS'
VALUE_TO_DELETE = 0 

geojson_data = None 

if os.path.exists(INPUT_GEOJSON_FILE):
    try:
        with open(INPUT_GEOJSON_FILE, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        print(f"Successfully loaded '{INPUT_GEOJSON_FILE}'.")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{INPUT_GEOJSON_FILE}'. Please ensure it's a valid GeoJSON file.")
    except Exception as e:
        print(f"An unexpected error occurred while reading '{INPUT_GEOJSON_FILE}': {e}")
else:
    print(f"Error: The input file '{INPUT_GEOJSON_FILE}' was not found in the current directory.")

# Filtering
if geojson_data and "features" in geojson_data and isinstance(geojson_data["features"], list):
    
    initial_feature_count = len(geojson_data["features"])
    features_to_keep = [] 

# Variables
    TARGET_NAME = "Schaumburg" 

    for feature in geojson_data["features"]:
        properties = feature.get('properties', {})
        property_value = properties.get(PROPERTY_KEY_TO_CHECK)

        county = properties.get("county")
        name = properties.get("name")

        if (
            property_value != VALUE_TO_DELETE and
            name == TARGET_NAME
        ):
            features_to_keep.append(feature)

    geojson_data["features"] = features_to_keep

    final_feature_count = len(geojson_data["features"])
    print(f"--- Filtering Summary ---")
    print(f"Initial number of features: {initial_feature_count}")
    print(f"Number of features deleted: {initial_feature_count - final_feature_count}")
    print(f"Remaining features: {final_feature_count}")

    try:
        with open(OUTPUT_GEOJSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(geojson_data, f, indent=2)
        print(f"Filtered GeoJSON data successfully saved to '{OUTPUT_GEOJSON_FILE}'.")
    except Exception as e:
        print(f"Error saving filtered GeoJSON data to '{OUTPUT_GEOJSON_FILE}': {e}")

else:
    print("GeoJSON data not found, invalid structure, or no 'features' list to process. Filtering skipped.")


