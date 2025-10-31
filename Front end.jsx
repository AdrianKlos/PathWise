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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { alert } from 'react-native';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const GEOJSON_URL =
  'https://drive.google.com/uc?export=download&id=1ZvmOYJsHcY3jBJbbLaGyiWFSA7V-OAIY';

// Global variable
let suggestionsShown = true;

// Theme context for dark mode
const ThemeContext = React.createContext();

const MapBoxAutocomplete = ({ onPlaceSelect, searchQuery, setSearchQuery, darkMode, textScale }) => {
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
      style={[styles.suggestionItem, darkMode && styles.darkSuggestionItem]}
      onPress={() => handleSuggestionSelect(item)}>
      <Text style={[styles.suggestionTitle, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>{item.name}</Text>
      <Text style={[styles.suggestionAddress, darkMode && styles.darkText, { fontSize: 14 * textScale }]}>{item.place_formatted}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.autocompleteContainer}>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={[styles.searchInput, darkMode && styles.darkSearchInput, { fontSize: 16 * textScale }]}
          placeholder="Enter destination..."
          placeholderTextColor={darkMode ? '#ccc' : '#666'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            if (searchQuery.length > 2 && suggestionsShown) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        />
        {isLoading && <Text style={[styles.loadingText, darkMode && styles.darkText, { fontSize: 12 * textScale }]}>Searching...</Text>}
      </View>

      {showSuggestions && suggestions.length > 0 && suggestionsShown && (
        <View style={[styles.suggestionsList, darkMode && styles.darkSuggestionsList]}>
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
  const [warningStatus, setWarningStatus] = useState('Checking...');
  const [darkMode, setDarkMode] = useState(false);
  const [textScale, setTextScale] = useState(1);

  const SchaumburgRegion = {
    latitude: 42.0334,
    longitude: -88.0834,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const speeds = {
    Walking: 1.4,
    Biking: 4.16,
  };

  function haversineDistance(pointA, pointB) {
    if (!pointA || !pointB) return 0;

    const R = 6371;
    const { latitude: lat1, longitude: lon1 } = pointA;
    const { latitude: lat2, longitude: lon2 } = pointB;

    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  const calculateETA = (method) => {
    if (!pointA || !pointB) {
      //alert.alert('Missing coordinates', 'Both start and end points are required.');
      return '--';
    }

    const distanceKm = haversineDistance(pointA, pointB);

    if (!distanceKm || !speeds[method]) {
      //alert.alert('Invalid input', 'Check transport method and distance.');
      return '--';
    }

    const speedKmH = speeds[method] * 3.6;
    const travelTimeHours = distanceKm / speedKmH;
    const travelTimeMs = travelTimeHours * 3600 * 1000;
    const etaTimestamp = Date.now() + travelTimeMs;
    const eta = new Date(etaTimestamp);

    const etaFormatted = eta.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${etaFormatted}`;
  };

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
          //alert.alert('Permission denied', 'Cannot access your location');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        console.log('Location obtained:', location);

        setPointA({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        console.log(
          'Point A Set',
          `Lat: ${location.coords.latitude}\nLng: ${location.coords.longitude}`
        );
      } catch (error) {
        console.log('Error', 'Failed to get location');
        console.error('Error getting location:', error);
      }
    };

    getUserLocation();
  }, []);

  const handlePlaceSelect = async (place) => {
    try {
      let latitude, longitude;

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
        //alert.alert('Error', 'No valid coordinates found — using fallback.');
        latitude = 42.0334;
        longitude = -88.0834;
      }

      const endCoords = { latitude, longitude };
      setPointB(endCoords);

      const startCoords = pointA || {
        latitude: 42.025464,
        longitude: -88.083289,
      };

      //alert.alert(
        'Coordinate Check',
        `Start: ${JSON.stringify(startCoords)}\nEnd: ${JSON.stringify(
          endCoords
        )}`
      //);
      setShowRouteInfo(true)

      const routeCoordinates = computeSidewalkPath(startCoords, endCoords);

      if (routeCoordinates && routeCoordinates.length > 0) {
        //alert.alert(
          'Path Debug',
          `Points in path: ${
            routeCoordinates.length
          }\nFirst 5: ${JSON.stringify(routeCoordinates.slice(0, 5))}`
        //);
        setRouteCoordinates(routeCoordinates);
      } else {
        //alert.alert('No Path', 'No valid route could be generated.');
      }
    } catch (err) {
      //alert.alert('Error', err.message || JSON.stringify(err));
    }
    calculateETA()
    setShowTransportOptions(true)
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
        //alert.alert('Error', 'Sidewalk data not loaded!');
        return [];
      }

      const haversine = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
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
        //alert.alert('Error', 'No nodes in sidewalk network!');
        return [];
      }

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

      if (
        startNode.lat === endNode.lat &&
        startNode.lng === endNode.lng
      ) {
        return [start, end];
      }

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

        const path = [];
        let u = endKey;
        while (u) {
          const [lat, lng] = u.split(',').map(Number);
          path.unshift({ latitude: lat, longitude: lng });
          u = prev[u];
        }

        if (path.length === 0) return [start, end];
        return path;
      };

      const route = dijkstra(startNode, endNode);

      if (route.length === 1) {
        route.unshift(start);
        route.push(end);
      }

      console.log('Route generated:', route.length, 'points');
      return route;
    } catch (err) {
      //alert.alert('Error computing path', err.message || JSON.stringify(err));
      return [start, end];
    }
  };

  useEffect(() => {
    const checkWarningStatus = async () => {
      try {
        const response = await fetch(GEOJSON_URL);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const firstFeatureStatus = data.features[0].properties.status;

          if (firstFeatureStatus) {
            setWarningStatus(`Area Status: ${firstFeatureStatus}`);
          } else {
            setWarningStatus('No current warnings.');
          }
        } else {
          setWarningStatus('No sidewalk data found.');
        }
      } catch (err) {
        console.log('Error checking warnings:', err.message);
        setWarningStatus('Warning check failed.');
      }
    };

    checkWarningStatus();
  }, []);

  const MenuItems = () => (
    <View style={[styles.menuContent, darkMode && styles.darkMenuContent]}>
      <TouchableOpacity
        style={[styles.menuItem, activeTab === 'Map' && styles.activeMenuItem, darkMode && styles.darkMenuItem]}
        onPress={() => {
          setActiveTab('Map');
          setIsMenuOpen(false);
        }}>
        <Text style={[styles.menuText, darkMode && styles.darkText, { fontSize: 18 * textScale }]}>Map</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.menuItem,
          activeTab === 'Settings' && styles.activeMenuItem,
          darkMode && styles.darkMenuItem,
        ]}
        onPress={() => {
          setActiveTab('Settings');
          setIsMenuOpen(false);
        }}>
        <Text style={[styles.menuText, darkMode && styles.darkText, { fontSize: 18 * textScale }]}>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.menuItem,
          activeTab === 'Credits' && styles.activeMenuItem,
          darkMode && styles.darkMenuItem,
        ]}
        onPress={() => {
          setActiveTab('Credits');
          setIsMenuOpen(false);
        }}>
        <Text style={[styles.menuText, darkMode && styles.darkText, { fontSize: 18 * textScale }]}>Credits</Text>
      </TouchableOpacity>
    </View>
  );

  const CreditsContent = () => (
    <View style={styles.creditsContainer}>
      <Text style={[styles.creditsTitle, darkMode && styles.darkText, { fontSize: 24 * textScale }]}>Credits</Text>
      
      <View style={styles.creditsSection}>
        <Text style={[styles.creditsSectionTitle, darkMode && styles.darkText, { fontSize: 20 * textScale }]}>Development Team</Text>
        <Text style={[styles.creditsText, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>Adrian Klos</Text>
        <Text style={[styles.creditsText, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>Hamndan Sheikh</Text>
        <Text style={[styles.creditsText, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>Peter George</Text>
      </View>
      
      <View style={styles.creditsSection}>
        <Text style={[styles.creditsSectionTitle, darkMode && styles.darkText, { fontSize: 20 * textScale }]}>Data Source</Text>
        <Text style={[styles.creditsText, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>
          Sidewalk data originally collected from:{'\n'}The Chicago Metropolitan Agency for Planning
        </Text>
      </View>
    </View>
  );

  const SettingsContent = () => (
    <View style={styles.settingsContainer}>
      <Text style={[styles.settingsTitle, darkMode && styles.darkText, { fontSize: 24 * textScale }]}>Settings</Text>
      
      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, darkMode && styles.darkText, { fontSize: 18 * textScale }]}>Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={darkMode ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>
      
      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, darkMode && styles.darkText, { fontSize: 18 * textScale }]}>Large Text</Text>
        <Switch
          value={textScale > 1}
          onValueChange={(value) => setTextScale(value ? 1.3 : 1)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={textScale > 1 ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const containerStyle = darkMode ? styles.darkContainer : styles.container;
  const headerStyle = darkMode ? styles.darkHeader : styles.header;

  return (
    <View style={containerStyle}>
      <View style={headerStyle}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuOpen(true)}>
          <Ionicons name="menu" size={28} color={darkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.appTitle, darkMode && styles.darkText, { fontSize: 20 * textScale }]}>PathWise</Text>
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

            <View style={[styles.searchContainer, darkMode && styles.darkSearchContainer]}>
              <MapBoxAutocomplete
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onPlaceSelect={handlePlaceSelect}
                darkMode={darkMode}
                textScale={textScale}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}>
                <Ionicons name="search" size={24 * textScale} color="#fff" />
              </TouchableOpacity>
            </View>

            {showTransportOptions && (
              <View style={[styles.transportOptions, darkMode && styles.darkTransportOptions]}>
                <TouchableOpacity
                  style={[styles.transportButton, styles.walkingButton]}
                  onPress={() => handleTransportSelect('Walking')}>
                  <Text style={[styles.transportButtonText, { fontSize: 16 * textScale }]}>Walking</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.transportButton, styles.bikingButton]}
                  onPress={() => handleTransportSelect('Biking')}>
                  <Text style={[styles.transportButtonText, { fontSize: 16 * textScale }]}>Biking</Text>
                </TouchableOpacity>
              </View>
            )}

            {showRouteInfo && (
              <View style={[styles.routeInfo, darkMode && styles.darkRouteInfo]}>
                <View style={styles.routeDetail}>
                  <Text style={[styles.routeLabel, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>Transport:</Text>
                  <Text style={[styles.routeValue, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>{transportMethod}</Text>
                </View>
                <View style={styles.routeDetail}>
                  <Text style={[styles.routeLabel, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>ETA:</Text>
                  <Text style={[styles.routeValue, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>
                    {transportMethod ? calculateETA(transportMethod) : '--'}
                  </Text>
                </View>
                <View style={styles.routeDetail}>
                  <Text style={[styles.routeLabel, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>Warnings:</Text>
                  <Text style={[styles.routeValue, darkMode && styles.darkText, { fontSize: 16 * textScale }]}>{warningStatus}</Text>
                </View>
              </View>
            )}
          </>
        ) : activeTab === 'Settings' ? (
          <SettingsContent />
        ) : (
          <CreditsContent />
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
          <View style={[styles.menuContainer, darkMode && styles.darkMenuContainer]}>
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
  darkContainer: {
    flex: 1,
    backgroundColor: '#121212',
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
  darkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuButton: {
    padding: 5,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  darkText: {
    color: '#fff',
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
  darkSearchContainer: {
    backgroundColor: '#2d2d2d',
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
  darkSearchInput: {
    borderColor: '#444',
    backgroundColor: '#333',
    color: '#fff',
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
  darkSuggestionsList: {
    backgroundColor: '#2d2d2d',
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  darkSuggestionItem: {
    borderBottomColor: '#444',
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
  darkTransportOptions: {
    backgroundColor: 'rgba(45, 45, 45, 0.95)',
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
  darkRouteInfo: {
    backgroundColor: 'rgba(45, 45, 45, 0.95)',
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
  darkMenuContainer: {
    backgroundColor: '#1e1e1e',
  },
  menuContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  darkMenuContent: {
    backgroundColor: '#1e1e1e',
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  darkMenuItem: {
    borderBottomColor: '#333',
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
  // Credits styles
  creditsContainer: {
    flex: 1,
    padding: 20,
  },
  creditsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  creditsSection: {
    marginBottom: 30,
  },
  creditsSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  creditsText: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
  // Settings styles
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '500',
  },
});

export default PathWise;
