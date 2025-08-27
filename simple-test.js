// Simple test for MCP server - try direct tool calls
const fetch = require('node-fetch');

async function testDirectToolCall() {
  console.log('🧪 Testing direct tool call to MCP server...');
  
  try {
    // Try calling search_nearby directly
    const response = await fetch('http://localhost:3001/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'search_nearby',
          arguments: {
            location: 'Bangkok, Thailand',
            radius: 5000,
            keyword: 'temple'
          }
        }
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.text();
    console.log('Response body:', data);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDirectToolCall();
