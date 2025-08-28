import React, { useState } from 'react';
import './Settings.css';

const Settings = ({ 
  testAPIs, 
  handleUserPrompt, 
  handleMCPGoogleMapsRequest,
  testHotelAPI,
  testMultipleCities,
  testGeocoding
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Add debug log function
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const log = { message, type, timestamp };
    setDebugLogs(prev => [log, ...prev.slice(0, 49)]); // Keep last 50 logs
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  };

  // Check MCP server status
  const checkMCPServerStatus = async () => {
    setIsCheckingStatus(true);
    addDebugLog('Checking MCP server status...', 'info');
    
    try {
      const mcpServerUrl = process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3001/mcp';
      const response = await fetch(mcpServerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/list'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setServerStatus({ status: 'connected', tools: data.result?.tools || [] });
        addDebugLog(`MCP Server connected! Available tools: ${data.result?.tools?.length || 0}`, 'success');
      } else {
        setServerStatus({ status: 'error', message: `HTTP ${response.status}` });
        addDebugLog(`MCP Server error: HTTP ${response.status}`, 'error');
      }
    } catch (error) {
      setServerStatus({ status: 'error', message: error.message });
      addDebugLog(`MCP Server connection failed: ${error.message}`, 'error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Enhanced test functions with logging
  const enhancedTestAPIs = async () => {
    addDebugLog('Starting API tests...', 'info');
    try {
      await testAPIs();
      addDebugLog('API tests completed successfully', 'success');
    } catch (error) {
      addDebugLog(`API tests failed: ${error.message}`, 'error');
    }
  };

  const enhancedTestAI = async () => {
    addDebugLog('Testing AI Assistant...', 'info');
    try {
      const result = await handleUserPrompt("Find the top 3 temples in Bangkok with their ratings and photos");
      addDebugLog(`AI Assistant test completed: ${result.message}`, 'success');
    } catch (error) {
      addDebugLog(`AI Assistant test failed: ${error.message}`, 'error');
    }
  };

  const enhancedTestMCP = async () => {
    addDebugLog('Testing MCP Google Maps...', 'info');
    try {
      const result = await handleMCPGoogleMapsRequest({
        type: 'search_nearby',
        location: 'Bangkok, Thailand',
        radius: 5000,
        keyword: 'temple',
        placeType: 'tourist_attraction'
      });
      addDebugLog(`MCP Google Maps test completed successfully`, 'success');
    } catch (error) {
      addDebugLog(`MCP Google Maps test failed: ${error.message}`, 'error');
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
    addDebugLog('Debug logs cleared', 'info');
  };

  const exportLogs = () => {
    const logText = debugLogs.map(log => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addDebugLog('Debug logs exported', 'info');
  };

  return (
    <>
      {/* Settings Toggle Button */}
      <button 
        className="settings-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Settings & Debug"
      >
        ⚙️
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>🔧 Settings & Debug</h3>
            <button 
              className="settings-close-btn"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="settings-content">
            {/* Server Status */}
            <div className="settings-section">
              <h4>🌐 Server Status</h4>
              <div className="server-status">
                <button 
                  className={`status-check-btn ${isCheckingStatus ? 'loading' : ''}`}
                  onClick={checkMCPServerStatus}
                  disabled={isCheckingStatus}
                >
                  {isCheckingStatus ? '🔄 Checking...' : '🔍 Check Status'}
                </button>
                {serverStatus && (
                  <div className={`status-indicator ${serverStatus.status}`}>
                    {serverStatus.status === 'connected' ? '✅ Connected' : '❌ Error'}
                    {serverStatus.tools && <span> ({serverStatus.tools.length} tools)</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Test Buttons */}
            <div className="settings-section">
              <h4>🧪 Test Functions</h4>
              <div className="test-buttons">
                <button 
                  className="test-btn api-test"
                  onClick={enhancedTestAPIs}
                  title="Test all APIs (Weather, Hotels, etc.)"
                >
                  🧪 Test APIs
                </button>
                
                <button 
                  className="test-btn ai-test"
                  onClick={enhancedTestAI}
                  title="Test AI Assistant with Bangkok temples"
                >
                  🤖 Test AI Assistant
                </button>
                
                <button 
                  className="test-btn mcp-test"
                  onClick={enhancedTestMCP}
                  title="Test MCP Google Maps with nearby search"
                >
                  🗺️ Test MCP Google Maps
                </button>
              </div>
            </div>

            {/* Advanced Tests */}
            <div className="settings-section">
              <h4>🔬 Advanced Tests</h4>
              <div className="advanced-tests">
                <button 
                  className="test-btn secondary"
                  onClick={() => {
                    addDebugLog('Testing hotel API...', 'info');
                    testHotelAPI(13.7563, 100.5018, 3);
                  }}
                >
                  🏨 Test Hotels (Bangkok)
                </button>
                
                <button 
                  className="test-btn secondary"
                  onClick={() => {
                    addDebugLog('Testing multiple cities...', 'info');
                    testMultipleCities();
                  }}
                >
                  🌍 Test Multiple Cities
                </button>
                
                <button 
                  className="test-btn secondary"
                  onClick={() => {
                    addDebugLog('Testing geocoding...', 'info');
                    testGeocoding('Tokyo');
                  }}
                >
                  📍 Test Geocoding
                </button>
              </div>
            </div>

            {/* Debug Logs */}
            <div className="settings-section">
              <div className="debug-header">
                <h4>📋 Debug Logs</h4>
                <div className="debug-actions">
                  <button className="debug-btn" onClick={clearLogs}>
                    🗑️ Clear
                  </button>
                  <button className="debug-btn" onClick={exportLogs}>
                    📥 Export
                  </button>
                </div>
              </div>
              
              <div className="debug-logs">
                {debugLogs.length === 0 ? (
                  <div className="no-logs">No debug logs yet. Run some tests to see logs here.</div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className={`log-entry ${log.type}`}>
                      <span className="log-timestamp">{log.timestamp}</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Environment Info */}
            <div className="settings-section">
              <h4>🔑 Environment Info</h4>
              <div className="env-info">
                <div className="env-item">
                  <span className="env-label">Google Maps API:</span>
                  <span className={`env-value ${process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'configured' : 'missing'}`}>
                    {process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Missing'}
                  </span>
                </div>
                <div className="env-item">
                  <span className="env-label">MCP Server URL:</span>
                  <span className="env-value">
                    {process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3001/mcp'}
                  </span>
                </div>
                <div className="env-item">
                  <span className="env-label">OpenAI API:</span>
                  <span className={`env-value ${process.env.REACT_APP_OPENAI_API_KEY ? 'configured' : 'missing'}`}>
                    {process.env.REACT_APP_OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
