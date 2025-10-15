{/*
Dependencies required:

expo install react-native-maps @expo/vector-icons
*/}

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Modal 
} from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';


module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: ['@babel/plugin-proposal-module-attributes'],
  };
};

const myData = require('./filtered.geojson');

const { width, height } = Dimensions.get('window');

const PathWiseApp = () => {
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
    // Example calculation (when you guys finally integrate distance calculated):
    // calculateTravelTime(method, distance, time spent waiting at crosswalks);
    
    return `TO DO: ${method} calculation at ${currentTime.toLocaleTimeString()}`;
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowTransportOptions(true);
      setShowRouteInfo(false);
    }
  };

  const handleTransportSelect = (method) => {
    setTransportMethod(method);
    setShowTransportOptions(false);
    setShowRouteInfo(true);
    const eta = calculateETA(method);
    console.log(eta); //test; will use later
  };

    const pathFinding = (method) => {
    
      
    const API_KEY = "AIzaSyDLnGHw5jc227pi3LBqjtr74k3ybwwcWCM"; // Canvas will provide this API key at runtime.
    const BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
    const R = 6371; // Earth radius in km

    let currentLocation = null; // [longitude, latitude] array
    let isAuthReady = false; // Flag for geocoding

    // --- DOM Elements ---
    const addressInput = document.getElementById('addressInput');
    const routeButton = document.getElementById('routeButton');
    const currentCoordsDisplay = document.getElementById('currentCoordsDisplay');
    const geocodingResultDiv = document.getElementById('geocodingResult');
    const geocodingResultPre = geocodingResultDiv.querySelector('pre');
    const routingResultDiv = document.getElementById('routingResult');
    const routingResultPre = routingResultDiv.querySelector('pre');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessageDisplay = document.getElementById('errorMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const buttonText = document.getElementById('buttonText');


    // --- Utility Functions ---

    /**
     * Shows an error message in the dedicated alert box.
     * @param {string} message - The error message to display.
     */
    function showError(message) {
      errorMessageDisplay.textContent = message;
      errorAlert.classList.remove('hidden');
      geocodingResultDiv.classList.add('hidden');
      routingResultDiv.classList.add('hidden');
    }

    /**
     * Clears all results and errors.
     */
    function clearResults() {
      errorAlert.classList.add('hidden');
      geocodingResultDiv.classList.add('hidden');
      routingResultDiv.classList.add('hidden');
      geocodingResultPre.textContent = '';
      routingResultPre.textContent = '';
    }

    /**
     * Enables/disables the button and shows/hides the loading spinner.
     * @param {boolean} isLoading - Whether the app is currently loading.
     */
    function setLoading(isLoading) {
      routeButton.disabled = isLoading;
      if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        buttonText.textContent = 'Processing...';
      } else {
        loadingIndicator.classList.add('hidden');
        buttonText.textContent = 'Find Route & Closest Node';
      }
    }

    /**
     * Haversine function (distance between two coords)
     * @param {number[]} coord1 - [lon1, lat1]
     * @param {number[]} coord2 - [lon2, lat2]
     * @returns {number} Distance in kilometers.
     */
    function haversine(coord1, coord2) {
      const [lon1, lat1] = coord1;
      const [lon2, lat2] = coord2;

      const toRad = (degree) => (degree * Math.PI) / 180;

      const dlon = toRad(lon2 - lon1);
      const dlat = toRad(lat2 - lat1);

      const a = Math.sin(dlat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dlon / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    }

    /**
     * Uses the HTML Geolocation API to get the user's current coordinates.
     */
    function getCurrentLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Coordinates in [lon, lat] format (standard GeoJSON/API order)
            currentLocation = [
              position.coords.longitude,
              position.coords.latitude
            ];
            const lat = position.coords.latitude.toFixed(6);
            const lon = position.coords.longitude.toFixed(6);
            currentCoordsDisplay.textContent = `${lat}, ${lon}`;
            isAuthReady = true;
            routeButton.disabled = false;
            console.log("Current Location:", currentLocation);
          },
          (error) => {
            console.error("Geolocation error:", error);
            // Fallback to a hardcoded test location if permission is denied
            currentLocation = [-88.0531299984337, 42.0629624921386];
            currentCoordsDisplay.textContent = `[-88.0531, 42.0629] (Using fallback test coordinates)`;
            isAuthReady = true;
            routeButton.disabled = false;
            showError(`Could not get your live location (${error.message}). Using fallback coordinates for testing.`);
          }
        );
      } else {
        currentCoordsDisplay.textContent = 'Geolocation is not supported by this browser. Using fallback test coordinates.';
        currentLocation = [-88.0531299984337, 42.0629624921386];
        isAuthReady = true;
        routeButton.disabled = false;
      }
    }

    // --- Main Logic Function ---

    async function geocodeAndRoute() {
      clearResults();
      setLoading(true);

      if (!currentLocation) {
        setLoading(false);
        return showError("Current location is not yet determined. Please wait or refresh.");
      }

      const address = addressInput.value.trim();
      if (!address) {
        setLoading(false);
        return showError("Please enter a destination address.");
      }

      const geocodingUrl = new URL(BASE_URL);
      geocodingUrl.searchParams.append('address', address);
      geocodingUrl.searchParams.append('key', API_KEY);

      let destinationCoords = null;
      let formattedAddress = '';

      // 1. Geocoding API Call
      try {
        const response = await fetch(geocodingUrl.toString());
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status === 'OK') {
          const result = data.results[0];
          const lat = result.geometry.location.lat;
          const lon = result.geometry.location.lng;
          formattedAddress = result.formatted_address;
          // API returns [lon, lat]
          destinationCoords = [lon, lat];

          const output = `
Address: ${formattedAddress}
Latitude: ${lat.toFixed(6)}
Longitude: ${lon.toFixed(6)}
                    `;
          geocodingResultPre.textContent = output.trim();
          geocodingResultDiv.classList.remove('hidden');

        } else {
          throw new Error(`Geocoding failed. Status: ${data.status}. ${data.error_message || ''}`);
        }
      } catch (e) {
        setLoading(false);
        return showError(`Geocoding Error: ${e.message}`);
      }

      // 2. Graph Construction and Closest Node Finding
      const graph = {};
      const coords = []; // Stores all unique [lon, lat] tuples/arrays
      let closestNodeIndex = null;
      let minDistanceToDestination = Infinity;

      // Helper to get index or add new coordinate
      function getCoordIndex(coord) {
        // Check if coordinate already exists in the list
        const existingIndex = coords.findIndex(c => c[0] === coord[0] && c[1] === coord[1]);
        if (existingIndex !== -1) {
          return existingIndex;
        }
        // Add new coordinate
        coords.push(coord);
        return coords.length - 1;
      }

      // Helper to add edges to the graph
      function addEdge(i, j) {
        const d = haversine(coords[i], coords[j]);

        // Initialize the node entries if they don't exist
        if (!graph[i]) graph[i] = {};
        if (!graph[j]) graph[j] = {};

        // Update edge weights (distance)
        graph[i][j] = d;
        graph[j][i] = d;
      }

      // Gets the Geojson data here:
      for (const feature of myData.features) {
        const geom = feature.geometry;

        if (geom.type === "Point") {
          // [lon, lat] format
          const coord = geom.coordinates;
          getCoordIndex(coord); // Add point to coords array
        } else if (geom.type === "LineString") {
          const indices = [];
          for (const coord of geom.coordinates) {
            indices.push(getCoordIndex(coord));
          }
          // Connect consecutive nodes in the LineString
          for (let i = 0; i < indices.length - 1; i++) {
            addEdge(indices[i], indices[i + 1]);
          }
        }
      }
      console.log("Graph Nodes:", coords);
      console.log("Graph Edges:", graph);


      // 3. Find the closest node in our network (coords) to the destination
      coords.forEach((nodeCoord, index) => {
        const distance = haversine(destinationCoords, nodeCoord);
        if (distance < minDistanceToDestination) {
          minDistanceToDestination = distance;
          closestNodeIndex = index;
        }
      });

      // 4. Display Routing Results
      let routingOutput = "";

      if (closestNodeIndex !== null) {
        const closestNodeCoord = coords[closestNodeIndex];
        const [lon, lat] = closestNodeCoord;

        routingOutput = `
Destination: ${formattedAddress}
Destination Coords: [${destinationCoords[1].toFixed(6)}, ${destinationCoords[0].toFixed(6)}]

--- Closest Network Node Found ---
Node Coords: [${lat.toFixed(6)}, ${lon.toFixed(6)}]
Distance to Destination: ${minDistanceToDestination.toFixed(3)} km

This node is the starting point for route calculation (Dijkstra's).
Current Location (Start): [${currentLocation[1].toFixed(6)}, ${currentLocation[0].toFixed(6)}]
                `;
      } else {
        routingOutput = "Error: No nodes were found in the GeoJSON network to route from.";
      }

      routingResultPre.textContent = routingOutput.trim();
      routingResultDiv.classList.remove('hidden');

      // 5. Finalize
      setLoading(false);
    }

    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
      // Initially disable the button until location is determined
      routeButton.disabled = true;
      getCurrentLocation();

      routeButton.addEventListener('click', geocodeAndRoute);

      // Allow Enter key to trigger the route function
      addressInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          geocodeAndRoute();
        }
      });
    });


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

      {/* Main screen */}
      <View style={styles.content}>
        {activeTab === 'Map' ? (
          <>
            <MapView
              style={styles.map}
              initialRegion={SchaumburgRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
            />
            
            {/* Transport Options */}
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
            
            {/* Route Information */}
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
            {/* Put settings here */}
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Credits</Text>
            {/* Put credits here */}
          </View>
        )}
      </View>

      {/* Search Bar */}
      {activeTab === 'Map' && (
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter destination..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Ionicons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
  )}

      {/* Side Menu Modal */}
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
    bottom: 40, // position of search bar
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
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  transportOptions: {
    position: 'absolute',
    top: 580, //position of transport module
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
    top: 90, //position of route module
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

export default PathWiseApp;
