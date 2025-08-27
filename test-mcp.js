// Test script to debug MCP server connection with improved logging
const fetch = require('node-fetch');

// --- Logger with Colors ---
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
};

const log = (color, ...args) => console.log(color, ...args, colors.reset);
const logInfo = (...args) => log(colors.blue, 'ℹ️', ...args);
const logSuccess = (...args) => log(colors.green, '✅', ...args);
const logError = (...args) => log(colors.red, '❌', ...args);
const logRequest = (title, details) => {
    log(colors.yellow, `🚀 Sending ${title}...`);
    console.log(details);
};
const logResponse = (title, details) => {
    log(colors.cyan, `📥 Received ${title}...`);
    console.log(details);
};

// --- API Request Helper ---
async function makeMCPRequest(url, options, title) {
    logRequest(title, {
        method: options.method,
        headers: options.headers,
        body: options.body,
    });

    const startTime = Date.now();
    try {
        const response = await fetch(url, options);
        const duration = Date.now() - startTime;

        const responseBody = await response.text();
        logResponse(`${title} Response (${response.status}) in ${duration}ms`, {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody,
        });

        return { response, body: responseBody };
    } catch (error) {
        const duration = Date.now() - startTime;
        logError(`Request for "${title}" failed after ${duration}ms:`, error.message);
        throw error; // Re-throw the error to be caught by the main test runner
    }
}


// --- Main Test Function ---
async function testMCPServer() {
    logInfo('Starting MCP Server Connection Test...');
    const baseURL = 'http://localhost:3001/mcp';
    let sessionId = null;
    const testResults = {
        initialization: 'skipped',
        toolsList: 'skipped',
        toolCall: 'skipped',
    };

    try {
        // --- Test 1: Initialize session ---
        logInfo('\n---------- 1️⃣  Testing Session Initialization ----------');
        const initPayload = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                clientInfo: { name: 'travel-ai-app', version: '1.0.0' }
            }
        };

        const { response: initResponse, body: initData } = await makeMCPRequest(
            baseURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
                body: JSON.stringify(initPayload),
            },
            'Initialize Request'
        );

        // Capture session ID from headers (case-insensitive)
        sessionId = initResponse.headers.get('mcp-session-id') || initResponse.headers.get('x-mcp-session-id');

        if (!sessionId) {
            logError("Failed to get session ID from server response headers!");
            testResults.initialization = 'failed';
            return; // Stop if we can't get a session
        }
        logSuccess('Captured session ID:', sessionId);

        // Parse Server-Sent Events (SSE) format to confirm success
        const sseDataLine = initData.split('\n').find(line => line.startsWith('data: '));
        if (sseDataLine) {
            const jsonStr = sseDataLine.substring(6); // Remove 'data: '
            const initJson = JSON.parse(jsonStr);
            if (initJson.result) {
                logSuccess('Session initialized successfully!');
                testResults.initialization = 'passed';
            } else {
                 logError('Initialization failed: "result" not found in response.', initJson);
                 testResults.initialization = 'failed';
                 return;
            }
        } else {
             logError('Initialization failed: No "data: " line found in SSE response.');
             testResults.initialization = 'failed';
             return;
        }

        // --- Test 2: List tools with session ID ---
        if (testResults.initialization === 'passed') {
            logInfo('\n---------- 2️⃣  Testing tools/list ----------');
            const listPayload = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
            const { response: listResponse, body: listData } = await makeMCPRequest(
                baseURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sessionId, 'x-mcp-session-id': sessionId },
                    body: JSON.stringify(listPayload),
                },
                'tools/list Request'
            );

            if (listResponse.ok) {
                 logSuccess('tools/list executed successfully!');
                 testResults.toolsList = 'passed';
            } else {
                 logError('tools/list request failed with status:', listResponse.status);
                 testResults.toolsList = 'failed';
            }
        }
        
        // --- Test 3: Call a specific tool with session ID ---
        if (testResults.toolsList === 'passed') {
            logInfo('\n---------- 3️⃣  Testing tools/call (search_nearby) ----------');
            const searchPayload = {
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'search_nearby',
                    arguments: { 
                        center: { value: 'Bangkok, Thailand', isCoordinates: false },
                        radius: 5000, 
                        keyword: 'temple'
                    }
                }
            };
            const { response: searchResponse, body: searchData } = await makeMCPRequest(
                baseURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sessionId, 'x-mcp-session-id': sessionId },
                    body: JSON.stringify(searchPayload),
                },
                'tools/call Request'
            );
            if (searchResponse.ok) {
                 logSuccess('tools/call executed successfully!');
                 testResults.toolCall = 'passed';
            } else {
                 logError('tools/call request failed with status:', searchResponse.status);
                 testResults.toolCall = 'failed';
            }
        }

    } catch (error) {
        logError('A critical error occurred during the test:', error.message);
    } finally {
        // --- Final Summary ---
        console.log('\n' + '='.repeat(50));
        logInfo('TEST SUMMARY:');
        console.log('='.repeat(50));
        Object.entries(testResults).forEach(([test, result]) => {
            const status = result === 'passed' ? '✅ PASSED' : result === 'failed' ? '❌ FAILED' : '⏭️ SKIPPED';
            console.log(`${test.padEnd(20)}: ${status}`);
        });
        console.log('='.repeat(50));
    }
}

// Run the test
testMCPServer();