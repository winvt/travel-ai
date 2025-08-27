// Test different header names for session ID
const fetch = require('node-fetch');

async function testDifferentHeaders() {
  console.log('🧪 Testing different session header names...');
  
  try {
    // First, initialize session
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
    console.log('✅ Captured session ID:', sessionId);
    
    if (!sessionId) {
      console.log('❌ No session ID found');
      return;
    }
    
    // Test different header variations
    const headerVariations = [
      'mcp-session-id',
      'x-mcp-session-id', 
      'X-MCP-Session-ID',
      'MCP-Session-ID',
      'session-id',
      'Session-ID',
      'X-Session-ID',
      'authorization',
      'Authorization'
    ];
    
    for (const headerName of headerVariations) {
      console.log(`\n🧪 Testing header: ${headerName}`);
      
      const testResponse = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          [headerName]: sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list'
        })
      });
      
      console.log(`   Status: ${testResponse.status}`);
      if (testResponse.status === 200) {
        console.log(`   ✅ SUCCESS with header: ${headerName}`);
        const data = await testResponse.text();
        console.log(`   Response: ${data.substring(0, 100)}...`);
        break;
      } else {
        const errorData = await testResponse.text();
        console.log(`   ❌ Failed: ${errorData.substring(0, 50)}...`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDifferentHeaders();
