#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { spawn } = require('child_process');

// Get the API key from environment variables
const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  console.error('❌ Error: REACT_APP_GOOGLE_MAPS_API_KEY not found in environment variables');
  console.log('Please make sure you have a .env file with:');
  console.log('REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here');
  process.exit(1);
}

console.log('🚀 Starting MCP Google Maps Server...');
console.log(`📍 Port: 3001`);
console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);

// Start the MCP server
const mcpServer = spawn('npx', [
  '@cablate/mcp-google-map',
  '--port', '3001',
  '--apikey', apiKey
], {
  stdio: 'inherit',
  shell: true
});

mcpServer.on('error', (error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});

mcpServer.on('close', (code) => {
  console.log(`MCP server exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping MCP server...');
  mcpServer.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping MCP server...');
  mcpServer.kill('SIGTERM');
});
