// MCP Google Maps Service
// This service integrates with the @cablate/mcp-google-map server

const MCP_SERVER_URL = process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3001/mcp';

// Session management
let currentSessionId = null;

// MCP Google Maps Tools Configuration
export const MCP_TOOLS = {
  SEARCH_NEARBY: 'search_nearby',
  GET_PLACE_DETAILS: 'get_place_details',
  MAPS_GEOCODE: 'maps_geocode',
  MAPS_REVERSE_GEOCODE: 'maps_reverse_geocode',
  MAPS_DISTANCE_MATRIX: 'maps_distance_matrix',
  MAPS_DIRECTIONS: 'maps_directions',
  MAPS_ELEVATION: 'maps_elevation'
};

// Generate a simple session UUID
const generateSessionId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

// Initialize MCP session
const initializeMCPSession = async () => {
  if (currentSessionId) {
    return currentSessionId; // Session already exists
  }

  try {
    console.log('🔄 Initializing MCP session...');
    
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'travel-ai-app',
            version: '1.0.0'
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`MCP Server error: ${response.status}`);
    }

    // Capture session ID from response headers (learned from test)
    currentSessionId = response.headers.get('mcp-session-id') || 
                     response.headers.get('x-mcp-session-id') ||
                     response.headers.get('session-id');

    if (!currentSessionId) {
      throw new Error('No session ID returned from server');
    }

    const data = await response.text();
    console.log('✅ MCP session initialized with ID:', currentSessionId);
    console.log('Server response:', data);
    return currentSessionId;
  } catch (error) {
    console.error('❌ Failed to initialize MCP session:', error);
    throw error;
  }
};

// Base MCP request function - more flexible for different RPC methods
const makeMCPRequest = async (method, params) => {
  try {
    // Ensure we have a session
    if (!currentSessionId) {
      await initializeMCPSession();
    }

    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': currentSessionId,
        'x-mcp-session-id': currentSessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });

    if (!response.ok) {
      throw new Error(`MCP Server error: ${response.status}`);
    }

    const responseText = await response.text();
    
    // Parse streaming response (Server-Sent Events format)
    let data = null;
    try {
      // If it's streaming format, extract JSON from data lines
      if (responseText.includes('data: ')) {
        const lines = responseText.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6); // Remove 'data: ' prefix
            data = JSON.parse(jsonStr);
            break;
          }
        }
      } else {
        // Regular JSON response
        data = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      throw new Error(`Invalid response format: ${parseError.message}`);
    }
    
    // Add error handling for JSON-RPC level errors
    if (data && data.error) {
      // If session expired, try to reinitialize
      if (data.error.message.includes('session')) {
        console.log('🔄 Session expired, reinitializing...');
        currentSessionId = null;
        await initializeMCPSession();
        // Retry the request
        return makeMCPRequest(method, params);
      }
      throw new Error(`MCP Error: ${data.error.message}`);
    }
    
    return data ? data.result : null;
  } catch (error) {
    console.error(`Error with MCP request (${method}):`, error);
    throw error;
  }
};

// Tool call function using the refactored base function
const callMCPTool = async (toolName, args) => {
  return makeMCPRequest('tools/call', { name: toolName, arguments: args });
};

// Google Maps MCP Service Functions

// 1. Search for nearby places
export const searchNearbyPlaces = async (location, radius = 5000, keyword = '', placeType = '') => {
  // Convert location string to coordinates if needed
  let center;
  if (typeof location === 'string') {
    // Use the location string directly with isCoordinates: false
    center = { value: location, isCoordinates: false };
  } else if (location.lat && location.lng) {
    // Use coordinates with isCoordinates: true
    center = { value: `${location.lat},${location.lng}`, isCoordinates: true };
  } else {
    throw new Error('Invalid location format');
  }

  return await callMCPTool(MCP_TOOLS.SEARCH_NEARBY, {
    center,
    radius,
    keyword
  });
};

// 2. Get detailed place information
export const getPlaceDetails = async (placeId) => {
  return await callMCPTool(MCP_TOOLS.GET_PLACE_DETAILS, {
    placeId
  });
};

// 3. Geocoding - Convert address to coordinates
export const geocodeAddress = async (address) => {
  return await callMCPTool(MCP_TOOLS.MAPS_GEOCODE, {
    address
  });
};

// 4. Reverse geocoding - Convert coordinates to address
export const reverseGeocode = async (lat, lng) => {
  return await callMCPTool(MCP_TOOLS.MAPS_REVERSE_GEOCODE, {
    lat,
    lng
  });
};

// 5. Distance matrix - Calculate distances and travel times
export const getDistanceMatrix = async (origins, destinations, mode = 'driving') => {
  return await callMCPTool(MCP_TOOLS.MAPS_DISTANCE_MATRIX, {
    origins,
    destinations,
    mode
  });
};

// 6. Directions - Get turn-by-turn directions
export const getDirections = async (origin, destination, mode = 'driving') => {
  return await callMCPTool(MCP_TOOLS.MAPS_DIRECTIONS, {
    origin,
    destination,
    mode
  });
};

// 7. Elevation data
export const getElevation = async (locations) => {
  return await callMCPTool(MCP_TOOLS.MAPS_ELEVATION, {
    locations
  });
};

// Advanced travel planning function using multiple MCP tools
export const planTravelRoute = async (startLocation, endLocation, waypoints = []) => {
  try {
    // 1. Get directions first to define the route
    const directions = await getDirections(startLocation, endLocation, 'driving');
    if (!directions.routes || directions.routes.length === 0) {
      throw new Error("Could not find a route.");
    }

    // 2. Geocode start and end locations
    const startCoords = await geocodeAddress(startLocation);
    const endCoords = await geocodeAddress(endLocation);
    
    // 3. Find an intermediate point along the route for more relevant attraction search
    const route = directions.routes[0];
    let searchLocation;
    
    if (route.legs && route.legs[0] && route.legs[0].steps && route.legs[0].steps.length > 0) {
      // Use the midpoint of the route for searching attractions
      const midpointIndex = Math.floor(route.legs[0].steps.length / 2);
      const midpointStep = route.legs[0].steps[midpointIndex];
      searchLocation = midpointStep.end_location || midpointStep.start_location;
    } else {
      // Fallback to start location if route structure is different
      searchLocation = startCoords.results[0].geometry.location;
    }
    
    // 4. Search for attractions near the route's midpoint
    const attractions = await searchNearbyPlaces(
      searchLocation,
      10000, // 10km radius
      'tourist attraction'
    );
    
    // 5. Get distance matrix for all points
    const allPoints = [startLocation, ...waypoints, endLocation];
    const distanceMatrix = await getDistanceMatrix(allPoints, allPoints);
    
    return {
      startLocation: startCoords,
      endLocation: endCoords,
      directions,
      attractions, // Now more relevant to the whole journey
      distanceMatrix,
      waypoints
    };
  } catch (error) {
    console.error('Error planning travel route:', error);
    throw error;
  }
};

// Check if MCP server is running
export const checkMCPServerStatus = async () => {
  try {
    const result = await makeMCPRequest('tools/list', {});
    return { status: 'connected', tools: result?.tools || [] };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};

const mcpGoogleMapsService = {
  searchNearbyPlaces,
  getPlaceDetails,
  geocodeAddress,
  reverseGeocode,
  getDistanceMatrix,
  getDirections,
  getElevation,
  planTravelRoute,
  checkMCPServerStatus,
  MCP_TOOLS
};

export default mcpGoogleMapsService;
