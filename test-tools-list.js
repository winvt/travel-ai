// Get the list of available tools and their parameters
const fetch = require('node-fetch');

async function getToolsList() {
  console.log('🧪 Getting available tools and their parameters...');
  
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
    
    // Get tools list
    const toolsResponse = await fetch('http://localhost:3001/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      })
    });
    
    const toolsData = await toolsResponse.text();
    console.log('📋 Available tools:', toolsData);
    
    // Parse the SSE format
    const lines = toolsData.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6);
        const toolsJson = JSON.parse(jsonStr);
        if (toolsJson.result && toolsJson.result.tools) {
          console.log('\n🔧 Available Tools:');
          toolsJson.result.tools.forEach(tool => {
            console.log(`\n📍 ${tool.name}:`);
            console.log(`   Description: ${tool.description}`);
            if (tool.inputSchema && tool.inputSchema.properties) {
              console.log('   Parameters:');
              Object.entries(tool.inputSchema.properties).forEach(([param, schema]) => {
                console.log(`     - ${param}: ${schema.type} ${schema.description || ''}`);
              });
            }
          });
        }
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

getToolsList();
