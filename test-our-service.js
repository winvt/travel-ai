// Test our actual MCP service
const mcpService = require('./src/services/mcpGoogleMapsService.js');

async function testOurMCPService() {
  console.log('🧪 Testing our MCP Google Maps Service...');
  
  try {
    // Test 1: Search nearby places
    console.log('\n1️⃣ Testing searchNearbyPlaces...');
    const places = await mcpService.searchNearbyPlaces(
      'Bangkok, Thailand', 
      5000, 
      'temple', 
      'tourist_attraction'
    );
    console.log('✅ Search successful:', places);
    
    // Test 2: Check server status
    console.log('\n2️⃣ Testing checkMCPServerStatus...');
    const status = await mcpService.checkMCPServerStatus();
    console.log('✅ Server status:', status);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOurMCPService();
