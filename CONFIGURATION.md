# Configuration Guide

## Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Google Maps API Configuration
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# MCP Server Configuration
REACT_APP_MCP_SERVER_URL=http://localhost:3001/mcp

# OpenAI API Configuration (for future AI integration)
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string_here
```

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the MCP Google Maps Server:**
   ```bash
   npm run mcp-server
   ```

3. **Start the React Development Server:**
   ```bash
   npm start
   ```

4. **Start Both Servers (Development):**
   ```bash
   npm run dev
   ```

## MCP Google Maps Features

The MCP Google Maps server provides the following tools:

- **search_nearby** - Search for nearby places with filters
- **get_place_details** - Get detailed place information
- **maps_geocode** - Convert addresses to coordinates
- **maps_reverse_geocode** - Convert coordinates to addresses
- **maps_distance_matrix** - Calculate distances and travel times
- **maps_directions** - Get turn-by-turn directions
- **maps_elevation** - Get elevation data

## Testing

Use the browser console to test the MCP Google Maps functionality:

```javascript
// Test nearby search
testMCPGoogleMaps({
  type: 'search_nearby',
  location: 'Bangkok, Thailand',
  radius: 5000,
  keyword: 'temple'
});

// Test geocoding
testMCPGoogleMaps({
  type: 'geocode',
  address: 'Tokyo, Japan'
});

// Test travel route planning
testMCPGoogleMaps({
  type: 'travel_route',
  startLocation: 'Bangkok, Thailand',
  endLocation: 'Chiang Mai, Thailand',
  waypoints: ['Ayutthaya, Thailand']
});
```
