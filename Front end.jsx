import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Modal,
  FlatList
} from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const myData = require('./filtered.geojson');

const { width, height } = Dimensions.get('window');

// Global variable
let suggestionsShown = true;

const MapBoxAutocomplete = ({ onPlaceSelect, searchQuery, setSearchQuery }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWRyaWFuamtsb3MiLCJhIjoiY21oNmxvaDY0MGp6YjJucHdpYW4zNzY1ZyJ9.89-yt1jBAGLqEpzJ3iuEgw';

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
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(searchText)}&access_token=${MAPBOX_ACCESS_TOKEN}&session_token=test-session&types=address,place,poi&country=us&proximity=-88.0834,42.0334&limit=5`
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
      onPress={() => handleSuggestionSelect(item)}
    >
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
        {isLoading && (
          <Text style={styles.loadingText}>Searching...</Text>
        )}
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

const PathWise = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [showTransportOptions, setShowTransportOptions] = useState(false);
  const [transportMethod, setTransportMethod] = useState(null);
  const [activeTab, setActiveTab] = useState('Map');

  const SchaumburgRegion = {
    latitude: 42.0334,
    longitude: -88.0834,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const calculateETA = (method) => {
    const currentTime = new Date();
    return `TO DO: ${method} calculation at ${currentTime.toLocaleTimeString()}`;
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowTransportOptions(true);
      setShowRouteInfo(false);
    }
  };

  const handlePlaceSelect = (place) => {
    console.log('Selected place:', place);
    handleSearch();
  };

  const handleTransportSelect = (method) => {
    setTransportMethod(method);
    setShowTransportOptions(false);
    setShowRouteInfo(true);
    const eta = calculateETA(method);
    console.log(eta);
  };

  const pathFinding = (method) => {
    const API_KEY = "AIzaSyDLnGHw5jc227pi3LBqjtr74k3ybwwcWCM";
    const BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
    const R = 6371;

    let currentLocation = null;
    let isAuthReady = false;

            let latitude, longitude;
        let routeCoordinates = []; // will be populated from GeoJSON + Dijkstra

        const pointB = { lat: 41.9955, lng: -88.0838 }; // Schaumburg Library

        window.onload = function () {
            getCurrentLocation();
            loadAndProcessGeoJSON();
        };

        function getCurrentLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition(success, error);
            } else {
                console.log("Geolocation not supported.");
            }
        }

        function success(position) {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            if (routeCoordinates.length) {
                initMap(latitude, longitude);
            }
        }

        function error(err) {
            console.log("Location error:", err);
        }

        async function loadAndProcessGeoJSON() {
            const response = await fetch('filtered.geojson');
            const data = await response.json();

            const graph = {};

            // Build graph from all LineString features
            data.features.forEach(feature => {
                if (feature.geometry.type === 'LineString') {
                    const coords = feature.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                    for (let i = 0; i < coords.length; i++) {
                        const key = `${coords[i].lat},${coords[i].lng}`;
                        if (!graph[key]) graph[key] = [];
                        if (i > 0) {
                            const prevKey = `${coords[i - 1].lat},${coords[i - 1].lng}`;
                            const dist = haversineDistance(coords[i - 1], coords[i]);
                            graph[key].push({ node: prevKey, weight: dist });
                            graph[prevKey].push({ node: key, weight: dist });
                        }
                    }
                }
            });

            // Find nearest nodes to current location (Point A) and pointB
            const pointAKey = findNearestNode(graph, { lat: latitude || 0, lng: longitude || 0 });
            const pointBKey = findNearestNode(graph, pointB);

            // Compute shortest path
            const path = dijkstra(graph, pointAKey, pointBKey);
            routeCoordinates = path.map(p => {
                const [lat, lng] = p.split(',');
                return { lat: parseFloat(lat), lng: parseFloat(lng) };
            });

            if (latitude && longitude) {
                initMap(latitude, longitude);
            }
        }

        function findNearestNode(graph, point) {
            let nearest = null;
            let minDist = Infinity;
            Object.keys(graph).forEach(key => {
                const [lat, lng] = key.split(',').map(Number);
                const d = haversineDistance({ lat, lng }, point);
                if (d < minDist) {
                    minDist = d;
                    nearest = key;
                }
            });
            return nearest;
        }

        function haversineDistance(a, b) {
            const R = 6371e3;
            const φ1 = a.lat * Math.PI / 180;
            const φ2 = b.lat * Math.PI / 180;
            const Δφ = (b.lat - a.lat) * Math.PI / 180;
            const Δλ = (b.lng - a.lng) * Math.PI / 180;
            const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
            return 2 * R * Math.asin(Math.sqrt(x));
        }

        function dijkstra(graph, start, end) {
            const distances = {};
            const prev = {};
            const pq = new Set(Object.keys(graph));
            Object.keys(graph).forEach(node => distances[node] = Infinity);
            distances[start] = 0;

            while (pq.size) {
                const current = [...pq].reduce((a, b) => distances[a] < distances[b] ? a : b);
                pq.delete(current);
                if (current === end) break;

                graph[current].forEach(neighbor => {
                    const alt = distances[current] + neighbor.weight;
                    if (alt < distances[neighbor.node]) {
                        distances[neighbor.node] = alt;
                        prev[neighbor.node] = current;
                    }
                });
            }

            const path = [];
            let curr = end;
            while (curr) {
                path.unshift(curr);
                curr = prev[curr];
            }
            return path;
        }

        function initMap(lat, lon) {
            if (lat === undefined || lon === undefined) return;

            const myLatlng = { lat, lng: lon };
            const map = new google.maps.Map(document.getElementById("map"), {
                zoom: 14,
                center: myLatlng
            });

            new google.maps.Marker({
                position: myLatlng,
                map,
                title: "Your Location"
            });

            if (routeCoordinates.length > 1) {
                const routePath = new google.maps.Polyline({
                    path: routeCoordinates,
                    geodesic: true,
                    strokeColor: "#FF0000",
                    strokeOpacity: 1.0,
                    strokeWeight: 4
                });
                routePath.setMap(map);

                const bounds = new google.maps.LatLngBounds();
                routeCoordinates.forEach(point => bounds.extend(point));
                map.fitBounds(bounds);
            }
        }
  };

  const MenuItems = () => (
    <View style={styles.menuContent}>
      <TouchableOpacity 
        style={[styles.menuItem, activeTab === 'Map' && styles.activeMenuItem]}
        onPress={() => { setActiveTab('Map'); setIsMenuOpen(false); }}
      >
        <Text style={styles.menuText}>Map</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.menuItem, activeTab === 'Settings' && styles.activeMenuItem]}
        onPress={() => { setActiveTab('Settings'); setIsMenuOpen(false); }}
      >
        <Text style={styles.menuText}>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.menuItem, activeTab === 'Credits' && styles.activeMenuItem]}
        onPress={() => { setActiveTab('Credits'); setIsMenuOpen(false); }}
      >
        <Text style={styles.menuText}>Credits</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsMenuOpen(true)}
        >
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
              showsUserLocation={true}
              showsMyLocationButton={true}
            />
            
            <View style={styles.searchContainer}>
              <MapBoxAutocomplete
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onPlaceSelect={handlePlaceSelect}
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Ionicons name="search" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {showTransportOptions && (
              <View style={styles.transportOptions}>
                <TouchableOpacity 
                  style={[styles.transportButton, styles.walkingButton]}
                  onPress={() => handleTransportSelect('Walking')}
                >
                  <Text style={styles.transportButtonText}>Walking</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.transportButton, styles.bikingButton]}
                  onPress={() => handleTransportSelect('Biking')}
                >
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
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPressOut={() => setIsMenuOpen(false)}
        >
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
