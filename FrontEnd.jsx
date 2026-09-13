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
  Image,
  Keyboard,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
const { width, height } = Dimensions.get('window');
const GEOJSON_URL =
  'https://drive.google.com/uc?export=download&id=1ZvmOYJsHcY3jBJbbLaGyiWFSA7V-OAIY';


import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

// Global variable
let suggestionsShown = true;

// Theme context for dark mode
const ThemeContext = React.createContext();

const MapBoxAutocomplete = ({
  onPlaceSelect,
  searchQuery,
  setSearchQuery,
  darkMode,
  textScale,
}) => {
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
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
    if (suggestionsShown) setShowSuggestions(true);
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
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.features && data.features[0]) {
        const place = data.features[0];
        setSearchQuery(place.properties.full_address || place.properties.name);
        setShowSuggestions(false);
        suggestionsShown = false;
        console.log('Suggestions disabled:', suggestionsShown);
        if (onPlaceSelect) onPlaceSelect(place);
      }
    } catch (error) {
      console.error('Error retrieving place details:', error);
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, darkMode && styles.darkSuggestionItem]}
      onPress={() => handleSuggestionSelect(item)}>
      <Text
        style={[
          styles.suggestionTitle,
          darkMode && styles.darkText,
          { fontSize: 16 * textScale },
        ]}>
        {item.name}
      </Text>
      <Text
        style={[
          styles.suggestionAddress,
          darkMode && styles.darkText,
          { fontSize: 14 * textScale },
        ]}>
        {item.place_formatted}
      </Text>
    </TouchableOpacity>
  );

  const inputWidth = useSharedValue(200);
  const topVal = useSharedValue(0);
  const leftVal = useSharedValue(0);
  const opacity = useSharedValue(0);
  const borderRadius = useSharedValue(0);

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      width: `${inputWidth.value}%`,
      top: topVal.value,
      left: leftVal.value,
    };
  });

  const animatedSuggestionStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      borderRadius: borderRadius.value,
    };
  });

  const [isTyping, setisTyping] = useState(false);
  // ENTER DESTINATION BOX ON TOP
  return (
    <View style={styles.autocompleteContainer}>
      <Animated.View style={(styles.searchInputContainer, animatedInputStyle)}>
        <TextInput
          style={[
            styles.searchInput,
            darkMode && styles.darkSearchInput,
            { fontSize: 16 * textScale },
          ]}
          placeholder="Where would you like to go?"
          placeholderTextColor={darkMode ? '#ccc' : '#666'}
          value={searchQuery}
          onChangeText={(text) => {
            suggestionsShown = true;
            setSearchQuery(text);
          }}
          onFocus={() => {
            if (searchQuery.length > 2 && suggestionsShown)
              setShowSuggestions(true);

            topVal.value = withTiming(-400, {
              duration: 1000,
              easing: Easing.inOut(Easing.cubic),
            });

            opacity.value = withTiming(1, {
              duration: 2000,
              easing: Easing.inOut(Easing.cubic),
            });

            inputWidth.value = withTiming(267, {
              duration: 2000,
              easing: Easing.inOut(Easing.cubic),
            });

            leftVal.value = withTiming(-80, {
              duration: 1500,
              easing: Easing.inOut(Easing.cubic),
            });

            setisTyping(true);
          }}
          onBlur={() => {
            topVal.value = withTiming(0, {
              duration: 500,
              easing: Easing.inOut(Easing.cubic),
            });

            opacity.value = withTiming(0, {
              duration: 200,
              easing: Easing.inOut(Easing.cubic),
            });

            inputWidth.value = withTiming(200, {
              duration: 500,
              easing: Easing.inOut(Easing.cubic),
            });

            leftVal.value = withTiming(0, {
              duration: 500,
              easing: Easing.inOut(Easing.cubic),
            });

            setisTyping(false);

            setTimeout(() => setShowSuggestions(false), 100);
          }}
        />
        {isLoading && (
          <Text
            style={[
              styles.loadingText,
              darkMode && styles.darkText,
              { fontSize: 12 * textScale },
            ]}>
            Searching... Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success )
          </Text>
        )}
      </Animated.View>

      {showSuggestions && suggestions.length > 0 && suggestionsShown && (
        <Animated.View
          style={[
            styles.suggestionsList,
            darkMode && styles.darkSuggestionsList,
            animatedSuggestionStyle,
          ]}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item, index) => item.mapbox_id || index.toString()}
            keyboardShouldPersistTaps="always"
          />
        </Animated.View>
      )}
    </View>
  );
};

// const handleSearch = () => {
//   if (searchQuery.trim()) {
//     setShowTransportOptions(true);
//     setShowRouteInfo(false);
//   }
// };

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
  const [showSearchContainer, setShowSearchContainer] = useState(true);

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
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const calculateETA = (method) => {
    if (!pointA || !pointB) return '--';

    const distanceKm = haversineDistance(pointA, pointB);
    if (!distanceKm || !speeds[method]) return '--';
    // routeCoordsFinal = routeCoordinates[routeCoordinates.length - 1].latitude - routeCoordinates.latitude;

    const travelTimeHours = distanceKm / speeds[method];
    const travelTimeMs = travelTimeHours * 3600000;

    const etaTimestamp = Date.now() + travelTimeMs;
    console.log(`ETA Time stamp: ${etaTimestamp}`);
    const eta = new Date(etaTimestamp);

    return eta.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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
        if (status !== 'granted') return;
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
        latitude = 42.0334;
        longitude = -88.0834;
      }
      const endCoords = { latitude, longitude };
      setPointB(endCoords);

      const startCoords = pointA || {
        latitude: 42.025464,
        longitude: -88.083289,
      };
      // setShowRouteInfo(true);
      const routeCoordinates = computeSidewalkPath(startCoords, endCoords);
      if (routeCoordinates && routeCoordinates.length > 0) {
        setRouteCoordinates(routeCoordinates);
      }
    } catch (err) {
      console.log('Error in handlePlaceSelect:', err);
    }
    calculateETA();
    Keyboard.dismiss;
    setShowTransportOptions(true);
  };

  const handleTransportSelect = (method) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTransportMethod(method);
    setShowTransportOptions(false);
    setShowRouteInfo(true);
    setShowSearchContainer(false);
    const eta = calculateETA(method);
  };

  const computeSidewalkPath = (start, end) => {
    try {
      if (!sidewalkData?.features?.length) return [];
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
      if (!nodes.length) return [];
      const findNearestNode = (point) => {
        let nearest = null;
        let minDist = Infinity;
        for (let node of nodes) {
          const d = haversine(
            point.latitude,
            point.longitude,
            node.lat,
            node.lng
          );
          if (d < minDist) {
            minDist = d;
            nearest = node;
          }
        }
        return nearest;
      };
      const startNode = findNearestNode(start);
      const endNode = findNearestNode(end);
      if (startNode.lat === endNode.lat && startNode.lng === endNode.lng)
        return [start, end];
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
        style={[
          styles.menuItem,
          activeTab === 'Map' && styles.activeMenuItem,
          darkMode && styles.darkMenuItem,
        ]}
        onPress={() => {
          setActiveTab('Map');
          setIsMenuOpen(false);
        }}>
        <Text
          style={[
            styles.menuText,
            darkMode && styles.darkText,
            { fontSize: 18 * textScale },
          ]}>
          Map
        </Text>
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
        <Text
          style={[
            styles.menuText,
            darkMode && styles.darkText,
            { fontSize: 18 * textScale },
          ]}>
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );

  const CreditsContent = () => (
    <View style={styles.creditsContainer}>
      <Text
        style={[
          styles.creditsTitle,
          darkMode && styles.darkText,
          { fontSize: 24 * textScale },
        ]}>
        Credits
      </Text>
      <View style={styles.creditsSection}>
        <Text
          style={[
            styles.creditsSectionTitle,
            darkMode && styles.darkText,
            { fontSize: 20 * textScale },
          ]}>
          Development Team
        </Text>
        <Text
          style={[
            styles.creditsText,
            darkMode && styles.darkText,
            { fontSize: 16 * textScale },
          ]}>
          Adrian Klos
        </Text>
        <Text
          style={[
            styles.creditsText,
            darkMode && styles.darkText,
            { fontSize: 16 * textScale },
          ]}>
          Hamdan Sheikh
        </Text>
        <Text
          style={[
            styles.creditsText,
            darkMode && styles.darkText,
            { fontSize: 16 * textScale },
          ]}>
          Peter George
        </Text>
      </View>
      <View style={styles.creditsSection}>
        <Text
          style={[
            styles.creditsSectionTitle,
            darkMode && styles.darkText,
            { fontSize: 20 * textScale },
          ]}>
          Data Source
        </Text>
        <Text
          style={[
            styles.creditsText,
            darkMode && styles.darkText,
            { fontSize: 16 * textScale },
          ]}>
          Sidewalk data originally collected from:{'\n'}The Chicago Metropolitan
          Agency for Planning
        </Text>
      </View>
    </View>
  );

  const SettingsContent = () => (
    <View style={styles.settingsContainer}>
      <Text
        style={[
          styles.settingsTitle,
          darkMode && styles.darkText,
          { fontSize: 24 * textScale },
        ]}>
        Settings
      </Text>
      <View style={styles.settingItem}>
        <Text
          style={[
            styles.settingLabel,
            darkMode && styles.darkText,
            { fontSize: 18 * textScale },
          ]}>
          Dark Mode
        </Text>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          trackColor={{ false: '#049F76', true: '#f4f3f4' }}
          thumbColor={darkMode ? '#049F76' : '#f4f3f4'}
        />
      </View>
      <View style={styles.settingItem}>
        <Text
          style={[
            styles.settingLabel,
            darkMode && styles.darkText,
            { fontSize: 18 * textScale },
          ]}>
          Large Text
        </Text>
        <Switch
          value={textScale > 1}
          onValueChange={(value) => setTextScale(value ? 1.3 : 1)}
          trackColor={{ false: '#049F76', true: '#f4f3f4' }}
          thumbColor={textScale > 1 ? '#049F76' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  function BikeIcon({ size = 38, color = '#000000' }) {
    return (
      <Svg width={size} height={size} viewBox="0 -3 38 38" fill={color}>
        <Path d="M29.998 28.197c-4.212 0-7.627-3.414-7.627-7.627 0-3.090 1.842-5.745 4.484-6.943l-1.014-2.283 0.165 0.399-6.944 9.321v1.869h1.017v1.018h-3.052v-1.018h1.018v-1.018l-2.877-0.27c-0.524 3.701-3.696 6.551-7.542 6.551-4.212 0.001-7.626-3.413-7.626-7.626 0-4.212 3.414-7.626 7.627-7.626 1.101 0 2.145 0.238 3.090 0.657l1.906-4.788-0.865-2.416c-0.38 0-0.734 0-1.017 0-0.954 0-0.699-1.017-0.699-1.017s0.063-0.89 0.763-0.89 0.699 0.636 1.843 0.636c1.095 0 2.669 0.317 2.669 0.317s0.699 0.953-0.635 0.953c-0.604 0-1.269 0-1.907 0l0.723 2.597h11.052l-0.868-1.973h-0.675v-1.016h4.067v1.017h-2.298l2.977 6.26c0.71-0.219 1.465-0.337 2.246-0.337 4.212 0 7.627 3.414 7.627 7.626-0.001 4.213-3.416 7.627-7.628 7.627zM7.627 13.96c-3.651 0-6.61 2.959-6.61 6.61s2.959 6.609 6.61 6.609c3.319 0 6.060-2.449 6.53-5.639l-5.294-0.545c-0.084 0.477-0.481 0.846-0.982 0.846-0.562 0-1.017-0.455-1.017-1.018 0-0.561 0.455-1.018 1.017-1.018 0.12 0 0.232 0.031 0.339 0.070l2.121-5.33c-0.829-0.372-1.746-0.585-2.714-0.585zM9.152 20.125l5.079 0.537c0.001-0.031 0.005-0.061 0.005-0.092 0-2.35-1.229-4.408-3.077-5.581l-2.007 5.136zM13.077 10.082l-1.543 3.948c2.225 1.332 3.719 3.759 3.719 6.541 0 0.066-0.008 0.133-0.010 0.199l1.726 0.182-3.892-10.87zM24.978 9.396v0.614h-11.12l4.050 10.839 7.687-10.065-0.617-1.388zM29.998 13.96c-0.637 0-1.251 0.095-1.834 0.264l2.374 5.424c0.482 0.078 0.858 0.48 0.858 0.984 0 0.562-0.455 1.018-1.017 1.018s-1.018-0.455-1.018-1.018c0-0.273 0.111-0.521 0.289-0.705l-2.384-5.372c-2.287 1.040-3.879 3.338-3.879 6.014 0 3.65 2.959 6.609 6.609 6.609s6.609-2.959 6.609-6.609-2.957-6.609-6.607-6.609z" />
      </Svg>
    );
  }

  function WalkIcon({ size = 38, color = '#000000' }) {
    return (
      <Svg width={size} height={size} viewBox="-96 0 512 512" fill={color}>
        <Path d="M208 96c26.5 0 48-21.5 48-48S234.5 0 208 0s-48 21.5-48 48 21.5 48 48 48zm94.5 149.1l-23.3-11.8-9.7-29.4c-14.7-44.6-55.7-75.8-102.2-75.9-36-.1-55.9 10.1-93.3 25.2-21.6 8.7-39.3 25.2-49.7 46.2L17.6 213c-7.8 15.8-1.5 35 14.2 42.9 15.6 7.9 34.6 1.5 42.5-14.3L81 228c3.5-7 9.3-12.5 16.5-15.4l26.8-10.8-15.2 60.7c-5.2 20.8.4 42.9 14.9 58.8l59.9 65.4c7.2 7.9 12.3 17.4 14.9 27.7l18.3 73.3c4.3 17.1 21.7 27.6 38.8 23.3 17.1-4.3 27.6-21.7 23.3-38.8l-22.2-89c-2.6-10.3-7.7-19.9-14.9-27.7l-45.5-49.7 17.2-68.7 5.5 16.5c5.3 16.1 16.7 29.4 31.7 37l23.3 11.8c15.6 7.9 34.6 1.5 42.5-14.3 7.7-15.7 1.4-35.1-14.3-43zM73.6 385.8c-3.2 8.1-8 15.4-14.2 21.5l-50 50.1c-12.5 12.5-12.5 32.8 0 45.3s32.7 12.5 45.2 0l59.4-59.4c6.1-6.1 10.9-13.4 14.2-21.5l13.5-33.8c-55.3-60.3-38.7-41.8-47.4-53.7l-20.7 51.5z" />
      </Svg>
    );
  }

  const containerStyle = darkMode ? styles.darkContainer : styles.container;
  const headerStyle = darkMode ? styles.darkHeader : styles.header;

  const transportoptionsContainerTopVal = useSharedValue(600);

  const animatetransportOptionsContainer = useAnimatedStyle(() => {
    return {
      top: transportoptionsContainerTopVal.value,
    };
  });

  function endRoute() {
    setShowRouteInfo(false);
    setShowSearchContainer(true);
    setSearchQuery(' ');
    setPointB(null)
    setRouteCoordinates([])
  }

  return (
    <View style={containerStyle}>
      <View style={styles.content}>
        {activeTab === 'Map' ? (
          <>
            <Pressable onPress={Keyboard.dismiss}>
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
            </Pressable>
            {showSearchContainer && (
              <View
                style={[
                  styles.searchContainer,
                  darkMode && styles.darkSearchContainer,
                ]}>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setIsMenuOpen(true)}>
                  <Text
                    style={(styles.appTitle, [{ fontSize: 14 * textScale }])}>
                    <Image
                      style={{ width: 62, height: 62 }}
                      source={require('./PathwiseLogoUnofficial.png')}
                    />
                  </Text>
                </TouchableOpacity>

                <MapBoxAutocomplete
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onPlaceSelect={handlePlaceSelect}
                  darkMode={darkMode}
                  textScale={textScale}
                />

                <Text
                  style={[
                    styles.creditsText,
                    darkMode && styles.darkText,
                    { fontSize: 9 * textScale },
                  ]}>
                  Developed by: Hamdan Sheikh, Adrian Klos, Peter George
                  {'\n'} Sidewalk data originally collected from: {'\n'} The Chicago
                  Metropolitan Agency for Planning
                </Text>
              </View>
            )}

            {showTransportOptions && (
              <Animated.View
                style={[
                  styles.transportOptions,
                  darkMode && styles.darkTransportOptions,
                ]}>
                <TouchableOpacity
                  style={[styles.transportButton, styles.walkingButton]}
                  onPress={() => handleTransportSelect('Walking')}>
                  <Text
                    style={[
                      styles.transportButtonText,
                      { fontSize: 16 * textScale },
                    ]}>
                    <WalkIcon size={30} color="white" />
                    {'\n'}
                    ETA: {calculateETA('Walking')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.transportButton, styles.bikingButton]}
                  onPress={() => handleTransportSelect('Biking')}>
                  <Text
                    style={[
                      styles.transportButtonText,
                      { fontSize: 16 * textScale },
                    ]}>
                    <BikeIcon size={30} color="white" />
                    {'\n'}
                    ETA: {calculateETA('Biking')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {showRouteInfo && (
              <Animated.View
                style={[styles.routeInfo, darkMode && styles.darkRouteInfo]}>
                <View style={styles.routeDetail}>
                  <Text
                    style={[
                      styles.routeLabel,
                      darkMode && styles.darkText,
                      { fontSize: 16 * textScale },
                    ]}>
                    Transport:
                  </Text>
                  <Text
                    style={[
                      styles.routeValue,
                      darkMode && styles.darkText,
                      { fontSize: 16 * textScale },
                    ]}>
                    {transportMethod}
                  </Text>
                </View>
                <View style={styles.routeDetail}>
                  <Text
                    style={[
                      styles.routeLabel,
                      darkMode && styles.darkText,
                      { fontSize: 16 * textScale },
                    ]}>
                    ETA:
                  </Text>
                  <Text
                    style={[
                      styles.routeValue,
                      darkMode && styles.darkText,
                      { fontSize: 16 * textScale },
                    ]}>
                    {transportMethod ? calculateETA(transportMethod) : '--'}
                  </Text>
                </View>
                <View style={styles.routeDetail}>
                  <Text
                    style={[
                      styles.routeLabel,
                      darkMode && styles.darkText,
                      { fontSize: 16 * textScale },
                    ]}>
                    Warnings:
                  </Text>
                  <Text
                    style={[
                      styles.routeValue,
                      darkMode && styles.darkText,
                      { fontSize: 16 * textScale },
                    ]}>
                    {warningStatus}
                  </Text>

                  <Pressable style={[styles.endRouteBtn]} onPress={endRoute}>
                    <Text style={{color: 'white'}}>End route</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </>
        ) : activeTab === 'Settings' ? (
          <SettingsContent />
        ) : activeTab === 'Credits' ? (
          <CreditsContent />
        ) : (
          <ProgressContent />
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
          <View
            style={[
              styles.menuContainer,
              darkMode && styles.darkMenuContainer,
            ]}>
            <Text
              style={[
                styles.settingsTitle,
                darkMode && styles.darkText,
                { fontSize: 24 * textScale },
              ]}>
              Settings
            </Text>
            <View style={styles.settingItem}>
              <Text
                style={[
                  styles.settingLabel,
                  darkMode && styles.darkText,
                  { fontSize: 18 * textScale },
                ]}>
                Dark Mode
              </Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={darkMode ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
            <View style={styles.settingItem}>
              <Text
                style={[
                  styles.settingLabel,
                  darkMode && styles.darkText,
                  { fontSize: 18 * textScale },
                ]}>
                Large Text
              </Text>
              <Switch
                value={textScale > 1}
                onValueChange={(value) => setTextScale(value ? 1.3 : 1)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={textScale > 1 ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    left: 0,
    top: 10,
    paddingTop: 42,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 0,
    borderBottomColor: '#e0e0e0',
    opacity: 0,
  },
  darkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 42,
    paddingBottom: 8,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuButton: {
    position: 'absolute',
    top: 82,
    left: '45%',
    right: '40%',
  },
  appTitle: {
    position: 'absolute',
    left: 50,
    top: 300,
    zIndex: 10,
    fontSize: 2,
    color: '#333',
  },
  darkText: {
    color: 'white',
  },
  endRouteBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#bc0f38',
    padding: 8,
    position: 'absolute',
    top: 50,
    left: 115,
    marginHorizontal: 10,
    opacity: 1,
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
    top: 690,
    width: '100%',
    left: 0,
    right: 0,
    paddingVertical: 105,
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopLeftRadius: 58,
    borderTopRightRadius: 58,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 8,
    elevation: 1,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    opacity: 1,
    shadowRadius: 5,
  
  },
  darkSearchContainer: {
    backgroundColor: '#100c08',
    color: 'white',
  },
  autocompleteContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInputContainer: {
    position: 'relative',
  },
  searchInput: {
    top: -90,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 15,
    width: '37%',
    left: '7%',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  darkSearchInput: {
    borderColor: 'grey',
    backgroundColor: '#100c08',
    color: 'white',
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
    left: 0,
    right: 0,
    top: -700,
    width: '100%',
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginTop: 5,
    elevation: 1,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    opacity: 1,
    shadowRadius: 5,
    maxHeight: 200,
    zIndex: 0,
  },
  darkSuggestionsList: {
    backgroundColor: '#100c08',
  },
  suggestionItem: {
    padding: 20,
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
  transportOptions: {
    position: 'absolute',
    top: 460,
    left: 45,
    right: 45,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(253, 253, 253, 0.6)',
    borderRadius: 56,
    padding: 56,
    elevation: 3,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    opacity: 1,
    shadowRadius: 5,
  },
  darkTransportOptions: {
    backgroundColor: 'rgba(45, 45, 45, 0.95)',
  },
  transportButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 20,
    marginHorizontal: 10,
    shadowColor: 'blue',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    opacity: 1,
    shadowRadius: 5,
  },
  walkingButton: {
    backgroundColor: '#336a9e',
  },
  bikingButton: {
    backgroundColor: '#336a9e',
  },
  transportButtonText: {
    padding: 14,
    color: '#fff',
    fontWeight: '200',
  },
  routeInfo: {
    position: 'absolute',
    top: 700,
    left: 0,
    right: 0,
    width: '100%',
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopLeftRadius: 58,
    borderTopRightRadius: 58,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    paddingVertical: 24,
    borderBottomWidth: 0,
    padding: 35,
    elevation: 1,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    zIndex: 0,
  },
  darkRouteInfo: {
    backgroundColor: '#100c08',
  },
  routeDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    opacity: 1,
  },
  routeLabel: {
    fontWeight: '400',
    color: '#333',
  },
  routeValue: {
    color: '#666',
    fontWeight: 300,
  },
  menuOverlay: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 500,
    left: 50,
    borderRadius: 8,
    width: width * 0.7,
    height: '40%',
    backgroundColor: '#fff',
  },
  darkMenuContainer: {
    backgroundColor: '#100c08',
  },
  menuContent: {
    paddingTop: 15,
    paddingHorizontal: 10,
    paddingVertical: 15
  },
  darkMenuContent: {
    backgroundColor: '#1e1e1e',
  },
  menuItem: {
    paddingVertical: 8,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  darkMenuItem: {
    borderBottomColor: '#333',
  },
  activeMenuItem: {
    backgroundColor: '#1b1b1b',
    color: '#fff',
  },
  menuText: {
    fontSize: 18,
    color: '#333',
  },
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
    opacity: 0.5,
    textAlign: 'center',
    fontWeight: 'light',
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 24,
    position: 'absolute',
    top: 150,
    left: 50,
    right: 50,
  },
  settingsContainer: {
    flex: 1,
    padding: 12,
    borderRadius: 24,
  },
  settingsTitle: {
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '400',
    marginBottom: 30,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 45,
    paddingHorizontal: 45,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingLabel: {
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '200',
  },
});

export default PathWise;
