import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
//import sidewalkData from './filtered.json';
//const sidewalkData = require('./test123.json');
const GEOJSON_URL =
  'https://drive.google.com/uc?export=download&id=1ZvmOYJsHcY3jBJbbLaGyiWFSA7V-OAIY';

// Global variable
let suggestionsShown = true;

const MapBoxAutocomplete = ({ onPlaceSelect, searchQuery, setSearchQuery }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const MAPBOX_ACCESS_TOKEN =
    'pk.eyJ1IjoiYWRyaWFuamtsb3MiLCJhIjoiY21oNmxvaDY0MGp6YjJucHdpYW4zNzY1ZyJ9.89-yt1jBAGLqEpzJ3iuEgw';

  useEffect(() => {
    if (searchQuery.length > 2 && suggestionsShown) {
      const delayDebounceFn = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const fetchSuggestions = async (searchText) => {
    if (!MAPBOX_ACCESS_TOKEN || !suggestionsShown) {
      console.warn('MapBox token missing or suggestions disabled');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
          searchText
        )}&access_token=${MAPBOX_ACCESS_TOKEN}&session_token=test-session&types=address,place,poi&country=us&proximity=-88.0834,42.0334&limit=5`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }

    if (suggestionsShown) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionSelect = async (suggestion) => {
    if (!MAPBOX_ACCESS_TOKEN) {
      console.warn('Please add your MapBox access token');
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?session_token=test-session&access_token=${MAPBOX_ACCESS_TOKEN}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.features && data.features[0]) {
        const place = data.features[0];
        setSearchQuery(place.properties.full_address || place.properties.name);
        setShowSuggestions(false);

        suggestionsShown = false;
        console.log('Suggestions disabled:', suggestionsShown);

        if (onPlaceSelect) {
          onPlaceSelect(place);
        }
      }
    } catch (error) {
      console.error('Error retrieving place details:', error);
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionSelect(item)}>
      <Text style={styles.suggestionTitle}>{item.name}</Text>
      <Text style={styles.suggestionAddress}>{item.place_formatted}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.autocompleteContainer}>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter destination..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            if (searchQuery.length > 2 && suggestionsShown) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        />
        {isLoading && <Text style={styles.loadingText}>Searching...</Text>}
      </View>

      {showSuggestions && suggestions.length > 0 && suggestionsShown && (
        <View style={styles.suggestionsList}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item, index) => item.mapbox_id || index.toString()}
            keyboardShouldPersistTaps="always"
          />
        </View>
      )}
    </View>
  );
};

const handleSearch = () => {
  if (searchQuery.trim()) {
    setShowTransportOptions(true);
    setShowRouteInfo(false);
  }
};
const PathWise = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [showTransportOptions, setShowTransportOptions] = useState(false);
  const [transportMethod, setTransportMethod] = useState(null);
  const [activeTab, setActiveTab] = useState('Map');
  const [pointA, setPointA] = useState(null);
  const [pointB, setPointB] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [sidewalkData, setSidewalkData] = useState(null);

  const SchaumburgRegion = {
    latitude: 42.0334,
    longitude: -88.0834,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

    // 10/27/25 - Completed the ETA system, currently the coordinates are hardcoded so we will need to figure out a way of getting the points (couldn't figure it out)
  const speeds = {
        walk: 1.4, bike: 4.16
  };
const calculateETA = (method) => {

  let distanceKm = haversineDistance(pointA, pointB)

  let travelTimeHours = distanceKm / speeds.bike; 
  
  const travelTimeMs = travelTimeHours * 60 * 60 * 1000;
  const currentTimestamp = new Date().getTime(); // This returns a large number (e.g., 1761695223000)
  
  let etaTimestamp = travelTimeMs + currentTimestamp; 
  let eta = new Date(etaTimestamp);
  
  const etaFormatted = eta.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
});

console.log(`Travel Time (in Hours): ${travelTimeHours.toFixed(2)}`);
console.log(`Eta Time: ${etaFormatted}`);
Alert.alert(`Arrival Time: ${etaFormatted}`)

return `${etaFormatted}`;
  };

function haversineDistance(pointA, pointB) {
  const R = 6371; // Earth's radius in kilometers

  // Destructure latitude and longitude from each point array
  const [lat1, lon1] = pointA;
  const [lat2, lon2] = pointB;

  // Convert degrees to radians
  const lat1Rad = lat1 * (Math.PI / 180);
  const lat2Rad = lat2 * (Math.PI / 180);
  const dlat = (lat2 - lat1) * (Math.PI / 180);
  const dlon = (lon2 - lon1) * (Math.PI / 180);

  // Haversine formula
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dlon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in kilometers
}



  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const response = await fetch(GEOJSON_URL);
        const data = await response.json();
        setSidewalkData(data);

        if (data.features && data.features.length > 0) {
          console.log('GeoJSON Loaded', `Features: ${data.features.length}`);
        } else {
          console.log('No features found in GeoJSON');
        }
      } catch (err) {
        console.log('Error loading GeoJSON', err.message);
      }
    };

    loadGeoJSON();
  }, []);

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('Permission status:', status);

        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Cannot access your location');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        console.log('Location obtained:', location);

        setPointA({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        Alert.alert(
          'Point A Set',
          `Lat: ${location.coords.latitude}\nLng: ${location.coords.longitude}`
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to get location');
        console.error('Error getting location:', error);
      }
    };

    getUserLocation();
  }, []);

  const handlePlaceSelect = async (place) => {
    try {
      // --- Extract coordinates from the selected place ---
      let latitude, longitude;
      calculateETA()

      if (
        place?.geometry?.coordinates &&
        Array.isArray(place.geometry.coordinates)
      ) {
        [longitude, latitude] = place.geometry.coordinates;
      } else if (place?.geometry?.location) {
        latitude =
          typeof place.geometry.location.lat === 'function'
            ? place.geometry.location.lat()
            : place.geometry.location.lat;
        longitude =
          typeof place.geometry.location.lng === 'function'
            ? place.geometry.location.lng()
            : place.geometry.location.lng;
      } else if (place?.latitude && place?.longitude) {
        latitude = place.latitude;
        longitude = place.longitude;
      } else {
        Alert.alert('Error', 'No valid coordinates found — using fallback.');
        latitude = 42.0334;
        longitude = -88.0834;
      }

      // --- Set destination point (Point B) ---
      const endCoords = { latitude, longitude };
      setPointB(endCoords);

      // --- Wait for point A (current or hardcoded start) ---
      const startCoords = pointA || {
        latitude: 42.025464,
        longitude: -88.083289,
      }; // Schaumburg Library fallback

      Alert.alert(
        'Coordinate Check',
        `Start: ${JSON.stringify(startCoords)}\nEnd: ${JSON.stringify(
          endCoords
        )}`
      );

      // --- Compute sidewalk path ---
      const routeCoordinates = computeSidewalkPath(startCoords, endCoords);

      // --- Check and display ---
      if (routeCoordinates && routeCoordinates.length > 0) {
        Alert.alert(
          'Path Debug',
          `Points in path: ${
            routeCoordinates.length
          }\nFirst 5: ${JSON.stringify(routeCoordinates.slice(0, 5))}`
        );
        setRouteCoordinates(routeCoordinates); // this draws the line on the map
      } else {
        Alert.alert('No Path', 'No valid route could be generated.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || JSON.stringify(err));
    }
  };

  const handleTransportSelect = (method) => {
    setTransportMethod(method);
    setShowTransportOptions(false);
    setShowRouteInfo(true);
    const eta = calculateETA(method);
    console.log(eta);
  };

 const computeSidewalkPath = (start, end) => {
  try {
    if (!sidewalkData?.features?.length) {
      Alert.alert('Error', 'Sidewalk data not loaded!');
      return [];
    }

    // --- Helper: Haversine distance ---
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // meters
      const toRad = (deg) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // --- Extract all nodes and edges ---
    const nodes = [];
    const edges = [];

    sidewalkData.features.forEach((feature) => {
      if (feature.geometry?.type === 'LineString') {
        const coords = feature.geometry.coordinates;
        for (let i = 0; i < coords.length; i++) {
          const [lng, lat] = coords[i];
          nodes.push({ lat, lng });
          if (i > 0) {
            const [prevLng, prevLat] = coords[i - 1];
            edges.push({
              from: { lat: prevLat, lng: prevLng },
              to: { lat, lng },
              dist: haversine(lat, lng, prevLat, prevLng),
            });
          }
        }
      }
    });

    if (!nodes.length) {
      Alert.alert('Error', 'No nodes in sidewalk network!');
      return [];
    }

    // --- Find nearest nodes ---
    const findNearestNode = (point) => {
      let nearest = null;
      let minDist = Infinity;
      for (let node of nodes) {
        const d = haversine(point.latitude, point.longitude, node.lat, node.lng);
        if (d < minDist) {
          minDist = d;
          nearest = node;
        }
      }
      return nearest;
    };

    const startNode = findNearestNode(start);
    const endNode = findNearestNode(end);

    // --- If start and end are same node, force virtual nodes ---
    if (
      startNode.lat === endNode.lat &&
      startNode.lng === endNode.lng
    ) {
      return [start, end]; // simple straight line
    }

    // --- Build adjacency list ---
    const key = (node) => `${node.lat.toFixed(6)},${node.lng.toFixed(6)}`;
    const graph = {};
    edges.forEach((e) => {
      const a = key(e.from);
      const b = key(e.to);
      if (!graph[a]) graph[a] = [];
      if (!graph[b]) graph[b] = [];
      graph[a].push({ node: e.to, dist: e.dist });
      graph[b].push({ node: e.from, dist: e.dist });
    });

    // --- Dijkstra shortest path ---
    const dijkstra = (start, end) => {
      const startKey = key(start);
      const endKey = key(end);
      const dist = {};
      const prev = {};
      const pq = new Map();

      for (let nodeKey in graph) dist[nodeKey] = Infinity;
      dist[startKey] = 0;
      pq.set(startKey, 0);

      while (pq.size > 0) {
        let [u, uDist] = [...pq.entries()].reduce((a, b) =>
          a[1] < b[1] ? a : b
        );
        pq.delete(u);

        if (u === endKey) break;

        for (let neighbor of graph[u] || []) {
          const v = key(neighbor.node);
          const alt = uDist + neighbor.dist;
          if (alt < dist[v]) {
            dist[v] = alt;
            prev[v] = u;
            pq.set(v, alt);
          }
        }
      }

      // --- Reconstruct path ---
      const path = [];
      let u = endKey;
      while (u) {
        const [lat, lng] = u.split(',').map(Number);
        path.unshift({ latitude: lat, longitude: lng });
        u = prev[u];
      }

      // If Dijkstra failed, return simple straight line
      if (path.length === 0) return [start, end];
      return path;
    };

    const route = dijkstra(startNode, endNode);

    // --- Ensure at least 2 points ---
    if (route.length === 1) {
      route.unshift(start);
      route.push(end);
    }

    console.log('Route generated:', route.length, 'points');
    return route;
  } catch (err) {
    Alert.alert('Error computing path', err.message || JSON.stringify(err));
    return [start, end]; // fallback straight line
  }
};


  const MenuItems = () => (
    <View style={styles.menuContent}>
      <TouchableOpacity
        style={[styles.menuItem, activeTab === 'Map' && styles.activeMenuItem]}
        onPress={() => {
          setActiveTab('Map');
          setIsMenuOpen(false);
        }}>
        <Text style={styles.menuText}>Map</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.menuItem,
          activeTab === 'Settings' && styles.activeMenuItem,
        ]}
        onPress={() => {
          setActiveTab('Settings');
          setIsMenuOpen(false);
        }}>
        <Text style={styles.menuText}>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.menuItem,
          activeTab === 'Credits' && styles.activeMenuItem,
        ]}
        onPress={() => {
          setActiveTab('Credits');
          setIsMenuOpen(false);
        }}>
        <Text style={styles.menuText}>Credits</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuOpen(true)}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.appTitle}>PathWise</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {activeTab === 'Map' ? (
          <>
            <MapView
              style={styles.map}
              initialRegion={SchaumburgRegion}
              showsUserLocation={true}>
              {pointA && <Marker coordinate={pointA} title="You" />}
              {pointB && <Marker coordinate={pointB} title="Destination" />}
              {routeCoordinates.length > 0 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#007AFF"
                  strokeWidth={4}
                />
              )}
            </MapView>

            <View style={styles.searchContainer}>
              <MapBoxAutocomplete
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onPlaceSelect={handlePlaceSelect}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}>
                <Ionicons name="search" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {showTransportOptions && (
              <View style={styles.transportOptions}>
                <TouchableOpacity
                  style={[styles.transportButton, styles.walkingButton]}
                  onPress={() => handleTransportSelect('Walking')}>
                  <Text style={styles.transportButtonText}>Walking</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.transportButton, styles.bikingButton]}
                  onPress={() => handleTransportSelect('Biking')}>
                  <Text style={styles.transportButtonText}>Biking</Text>
                </TouchableOpacity>
              </View>
            )}

            {showRouteInfo && (
              <View style={styles.routeInfo}>
                <View style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>Transport:</Text>
                  <Text style={styles.routeValue}>{transportMethod}</Text>
                </View>
                <View style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>ETA:</Text>
                  <Text style={styles.routeValue}>
                    {transportMethod ? calculateETA(transportMethod) : '-- min'}
                  </Text>
                </View>
                <View style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>Distance:</Text>
                  <Text style={styles.routeValue}>-- km</Text>
                </View>
                <View style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>Warnings:</Text>
                  <Text style={styles.routeValue}>--</Text>
                </View>
              </View>
            )}
          </>
        ) : activeTab === 'Settings' ? (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Settings</Text>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Credits</Text>
          </View>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isMenuOpen}
        onRequestClose={() => setIsMenuOpen(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPressOut={() => setIsMenuOpen(false)}>
          <View style={styles.menuContainer}>
            <MenuItems />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuButton: {
    padding: 5,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 15,
    right: 15,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  autocompleteContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInputContainer: {
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  loadingText: {
    position: 'absolute',
    right: 10,
    top: 12,
    fontSize: 12,
    color: '#666',
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  suggestionAddress: {
    fontSize: 14,
    color: '#666',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    marginLeft: 10,
  },
  transportOptions: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  transportButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  walkingButton: {
    backgroundColor: '#4DA6FF',
  },
  bikingButton: {
    backgroundColor: '#4DA6FF',
  },
  transportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  routeInfo: {
    position: 'absolute',
    top: 160,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  routeDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routeLabel: {
    fontWeight: '600',
    color: '#333',
  },
  routeValue: {
    color: '#666',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: width * 0.7,
    height: '100%',
    backgroundColor: '#fff',
  },
  menuContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeMenuItem: {
    backgroundColor: '#f0f8ff',
  },
  menuText: {
    fontSize: 18,
    color: '#333',
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default PathWise;
