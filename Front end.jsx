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
