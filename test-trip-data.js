// Test script for trip data integration with Kumo chatbot
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testTripDataIntegration() {
  console.log('🧪 Testing Kumo Trip Data Integration...\n');

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

    // Test 2: Send message with trip data context
    console.log('\n2️⃣ Testing message with trip data context...');
    const messageResponse = await fetch(`${BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: initData.sessionId,
        message: 'Hi Kumo! Can you help me with my trip planning?',
        context: {
          city: 'Paris',
          hotels: [{ name: 'Hotel Example', price: '150' }],
          attractions: [{ name: 'Eiffel Tower', rating: '4.5' }],
          weather: { temp: '20°C', condition: 'Sunny' },
          tripData: {
            city: 'Paris',
            planningData: {
              startDate: '2024-12-15',
              endDate: '2024-12-20',
              partySize: 2,
              travelerType: 'couple',
              budget: 4,
              interests: ['culture', 'food', 'romance']
            },
            weather: { current: { temp: '18°C', condition: 'Partly Cloudy' } },
            attractions: [
              { name: 'Eiffel Tower', rating: '4.5' },
              { name: 'Louvre Museum', rating: '4.8' },
              { name: 'Notre-Dame', rating: '4.6' }
            ],
            plan: { summary: 'Romantic 5-day Paris getaway' }
          }
        }
      })
    });

    if (!messageResponse.ok) {
      throw new Error(`Message failed: ${messageResponse.status}`);
    }

    const messageData = await messageResponse.json();
    console.log('✅ Message sent successfully with trip data');
    console.log('   Response preview:', messageData.message.substring(0, 150) + '...');
    
    // Check if Kumo acknowledges the trip data
    if (messageData.message.includes('Paris') || messageData.message.includes('couple') || messageData.message.includes('romance')) {
      console.log('✅ Kumo is using the trip data correctly!');
    } else {
      console.log('⚠️ Kumo response may not be using trip data optimally');
    }

    console.log('\n🎉 Trip data integration test completed! 🐾✨');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Server is running on port 3001');
    console.log('   - MongoDB connection is working');
    console.log('   - OpenAI API key is configured');
  }
}

// Run the test
testTripDataIntegration(); 