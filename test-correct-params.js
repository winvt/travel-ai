// Test with correct parameter format
const fetch = require('node-fetch');

async function testWithCorrectParams() {
  console.log('🧪 Testing with correct parameter format...');
  
  try {
    // Initialize session
    const initResponse = await fetch('http://localhost:3001/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'travel-ai-app', version: '1.0.0' }
        }
      })
    });
    
    const sessionId = initResponse.headers.get('mcp-session-id');
    console.log('✅ Session ID:', sessionId);
    
    // Test search_nearby with center object (latitude/longitude)
    console.log('\n🔍 Testing search_nearby with center coordinates...');
    const searchResponse = await fetch('http://localhost:3001/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'search_nearby',
          arguments: {
            center: {
              lat: 13.7563,
              lng: 100.5018
            },
            radius: 5000,
            keyword: 'temple'
          }
        }
      })
    });
    
    console.log('Search response status:', searchResponse.status);
    const searchData = await searchResponse.text();
    
    if (searchResponse.status === 200) {
      console.log('✅ Search successful!');
      // Parse SSE format
      const lines = searchData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          const result = JSON.parse(jsonStr);
          if (result.result) {
            console.log('📍 Found places:', result.result.length || 'No results');
            if (result.result.length > 0) {
              console.log('First place:', result.result[0]);
            }
          }
          break;
        }
      }
    } else {
      console.log('❌ Search failed:', searchData.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithCorrectParams();
