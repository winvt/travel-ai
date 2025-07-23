// Simple test script for Kumo chatbot API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testChatbot() {
  console.log('🧪 Testing Kumo Chatbot API...\n');

  try {
    // Test 1: Initialize chat session
    console.log('1️⃣ Testing chat initialization...');
    const initResponse = await fetch(`${BASE_URL}/api/chat/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test_user'
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Init failed: ${initResponse.status}`);
    }

    const initData = await initResponse.json();
    console.log('✅ Chat initialized successfully');
    console.log('   Session ID:', initData.sessionId);
    console.log('   Welcome message:', initData.message.substring(0, 50) + '...\n');

    // Test 2: Send a message
    console.log('2️⃣ Testing message sending...');
    const messageResponse = await fetch(`${BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: initData.sessionId,
        message: 'Hi Kumo! I want to plan a trip to Paris for 2 people with a budget of 3.',
        context: {
          city: 'Paris',
          hotels: [{ name: 'Hotel Example', price: '150' }],
          attractions: [{ name: 'Eiffel Tower', rating: '4.5' }],
          weather: { temp: '20°C', condition: 'Sunny' }
        }
      })
    });

    if (!messageResponse.ok) {
      throw new Error(`Message failed: ${messageResponse.status}`);
    }

    const messageData = await messageResponse.json();
    console.log('✅ Message sent successfully');
    console.log('   Response:', messageData.message.substring(0, 100) + '...\n');

    // Test 3: Get chat history
    console.log('3️⃣ Testing chat history...');
    const historyResponse = await fetch(`${BASE_URL}/api/chat/history/${initData.sessionId}`);

    if (!historyResponse.ok) {
      throw new Error(`History failed: ${historyResponse.status}`);
    }

    const historyData = await historyResponse.json();
    console.log('✅ Chat history retrieved successfully');
    console.log('   Messages count:', historyData.messages.length);

    console.log('\n🎉 All tests passed! Kumo chatbot is working correctly! 🐾✨');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Server is running on port 3001');
    console.log('   - MongoDB is connected');
    console.log('   - OpenAI API key is configured');
  }
}

// Run the test
testChatbot(); 