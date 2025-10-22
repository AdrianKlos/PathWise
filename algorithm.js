// --- Global Variables and Constants ---
const API_KEY = "AIzaSyDLnGHw5jc227pi3LBqjtr74k3ybwwcWCM"; // Canvas will provide this API key at runtime.
const BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const R = 6371; // Earth radius in km

let currentLocation = null; // [longitude, latitude] array
let isAuthReady = false; // Flag for geocoding
let enterAddress = prompt("Where would you like to go?");
let currentCoordsDisplay;
let myData; // Global variable for GeoJSON data

// --- Graph and Pathfinding Variables (Made Global for the Graph Building Logic) ---
const coords = []; // Stores all unique [lon, lat] tuples/arrays (Graph Nodes)
const graph = {}; // Adjacency list/map for graph edges: { index: { neighborIndex: distance, ... } }

// --- Utility Functions ---

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
 * Helper to get index or add new coordinate (Node)
 * @param {number[]} coord - [lon, lat]
 * @returns {number} The index of the coordinate in the global 'coords' array.
 */
function getCoordIndex(coord) {
    // Check if coordinate already exists in the list (using string comparison for simplicity/speed)
    const coordString = `${coord[0]},${coord[1]}`;
    
    for (let i = 0; i < coords.length; i++) {
        if (`${coords[i][0]},${coords[i][1]}` === coordString) {
            return i;
        }
    }
    
    // Add new coordinate
    coords.push(coord);
    return coords.length - 1;
}

/**
 * Helper to add edges to the graph
 * @param {number} i - Index of the first node
 * @param {number} j - Index of the second node
 */
function addEdge(i, j) {
    // Check if indices are valid and exist in the coords array
    if (i < 0 || j < 0 || i >= coords.length || j >= coords.length) {
        console.error(`Invalid node index in addEdge: ${i}, ${j}`);
        return;
    }
    
    // Calculate distance (weight)
    const d = haversine(coords[i], coords[j]);

    // Initialize the node entries if they don't exist
    if (!graph[i]) graph[i] = {};
    if (!graph[j]) graph[j] = {};

    // Update edge weights (distance)
    graph[i][j] = d;
    graph[j][i] = d;
}

/**
 * Uses the HTML Geolocation API to get the user's current coordinates.
 */
function getCurrentLocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation = [
                        position.coords.longitude,
                        position.coords.latitude
                    ];
                    isAuthReady = true;
                    console.log("Current Location:", currentLocation);
                    resolve();
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    // Fallback to a hardcoded test location
                    currentLocation = [-88.0531299984337, 42.0629624921386];
                    isAuthReady = true;
                    console.log("Current Location (Fallback):", currentLocation);
                    showError(`Could not get live location. Using fallback coordinates.`);
                    resolve();
                }
            );
        } else {
            currentLocation = [-88.0531299984337, 42.0629624921386];
            isAuthReady = true;
            console.log("Geolocation not supported. Using fallback.");
            resolve();
        }
    });
}

function showError(message) {
    // Placeholder for a function that displays errors to the user
    console.error(`USER ERROR: ${message}`);
}

// --- Main Initialization and Graph Building ---

async function init() {
    try {
        // 1. Fetch and Parse GeoJSON Data
        const response = await fetch('./filtered.geojson');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Assign data to the global 'myData' variable
        myData = await response.json(); 
        
        // Ensure myData is a FeatureCollection and has the 'features' array
        if (myData.type !== "FeatureCollection" || !Array.isArray(myData.features)) {
            console.error("GeoJSON data is not a valid FeatureCollection.");
            return;
        }
        console.log(`Starting graph creation for ${myData.features.length} features...`);
        
        // 2. Build the Graph (Nodes and Edges)
        for (const feature of myData.features) {
            const geom = feature.geometry;

            if (geom.type === "Point") {
                const coord = geom.coordinates;
                getCoordIndex(coord); // Add point node
            } else if (geom.type === "LineString") {
                const indices = [];
                for (const coord of geom.coordinates) {
                    indices.push(getCoordIndex(coord));
                }
                // Connect consecutive nodes in the LineString (add edges)
                for (let i = 0; i < indices.length - 1; i++) {
                    addEdge(indices[i], indices[i + 1]);
                }
            }
        }
        
        console.log("Graph creation complete!");
        console.log(`Total Graph Nodes: ${coords.length}`);
        console.log(`Graph Edges (connections): ${Object.keys(graph).length}`);

        // 3. Get User Location (Async call)
        await getCurrentLocation();

        // 4. Start Geocoding and Routing (Now that the graph is built and location is known)
        await geocodeAndRoute();

    } catch (error) {
        console.error('An error occurred during initialization:', error);
    }
}


// --- Geocoding and Routing Logic (Restored) ---

async function geocodeAndRoute() {
    if (!currentLocation) {
        return console.log("Current location is not yet determined. Aborting route calculation.");
    }
    const address = enterAddress;
    if (!address) {
        return console.log("Please enter a destination address.");
    }

    const geocodingUrl = new URL(BASE_URL);
    geocodingUrl.searchParams.append('address', address);
    geocodingUrl.searchParams.append('key', API_KEY);

    let destinationCoords = null;
    let formattedAddress = '';
    let closestNodeIndex = null;
    let minDistanceToDestination = Infinity;

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
            destinationCoords = [lon, lat]; // [lon, lat] format
            console.log(`Destination Coords: [${lat.toFixed(6)}, ${lon.toFixed(6)}]`);
        } else {
            throw new Error(`Geocoding failed. Status: ${data.status}. ${data.error_message || ''}`);
        }
    } catch (e) {
        return showError(`Geocoding Error: ${e.message}`);
    }

    // 2. Find the closest node in our network (coords) to the destination
    coords.forEach((nodeCoord, index) => {
        const distance = haversine(destinationCoords, nodeCoord);
        if (distance < minDistanceToDestination) {
            minDistanceToDestination = distance; 
            closestNodeIndex = index;
        }
    });

    // 3. Display Routing Results
    if (closestNodeIndex !== null) {
        const closestNodeCoord = coords[closestNodeIndex];
        const [lon, lat] = closestNodeCoord;

        const routingOutput = `
--- Routing Summary ---
Destination Address: ${formattedAddress}
Destination Coords: [${destinationCoords[1].toFixed(6)}, ${destinationCoords[0].toFixed(6)}]

Closest Network Node Found:
Node Coords: [${lat.toFixed(6)}, ${lon.toFixed(6)}]
Distance to Destination: ${minDistanceToDestination.toFixed(3)} km

Start Location: [${currentLocation[1].toFixed(6)}, ${currentLocation[0].toFixed(6)}]
YESYESYEYES
`;
        console.log(routingOutput);
        console.log("It's working")
    } else {
        console.log("Error: No nodes were found in the GeoJSON network to route from.");
    }
}

