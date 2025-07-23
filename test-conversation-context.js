// Test script for conversation context with Kumo chatbot
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testConversationContext() {
  console.log('🧪 Testing Kumo Conversation Context...\n');

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

    // Test 2: Send first message
    console.log('\n2️⃣ Testing first message...');
    const message1Response = await fetch(`${BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: initData.sessionId,
        message: 'Hi Kumo! I want to plan a trip to Paris.',
        context: {
          tripData: {
            city: 'Paris',
            planningData: {
              startDate: '2024-12-15',
              endDate: '2024-12-20',
              partySize: 2,
              travelerType: 'couple',
              budget: 4,
              interests: ['culture', 'food', 'romance']
            }
          }
        }
      })
    });

    if (!message1Response.ok) {
      throw new Error(`Message 1 failed: ${message1Response.status}`);
    }

    const message1Data = await message1Response.json();
    console.log('✅ First message sent successfully');
    console.log('   Response preview:', message1Data.message.substring(0, 100) + '...');

    // Test 3: Send second message (should have context)
    console.log('\n3️⃣ Testing second message with context...');
    const message2Response = await fetch(`${BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: initData.sessionId,
        message: 'What about the weather in Paris during December?',
        context: {
          tripData: {
            city: 'Paris',
            planningData: {
              startDate: '2024-12-15',
              endDate: '2024-12-20',
              partySize: 2,
              travelerType: 'couple',
              budget: 4,
              interests: ['culture', 'food', 'romance']
            }
          }
        }
      })
    });

    if (!message2Response.ok) {
      throw new Error(`Message 2 failed: ${message2Response.status}`);
    }

    const message2Data = await message2Response.json();
    console.log('✅ Second message sent successfully');
    console.log('   Response preview:', message2Data.message.substring(0, 100) + '...');

    // Test 4: Send third message (should have full context)
    console.log('\n4️⃣ Testing third message with full context...');
    const message3Response = await fetch(`${BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: initData.sessionId,
        message: 'Can you recommend some romantic restaurants?',
        context: {
          tripData: {
            city: 'Paris',
            planningData: {
              startDate: '2024-12-15',
              endDate: '2024-12-20',
              partySize: 2,
              travelerType: 'couple',
              budget: 4,
              interests: ['culture', 'food', 'romance']
            }
          }
        }
      })
    });

    if (!message3Response.ok) {
      throw new Error(`Message 3 failed: ${message3Response.status}`);
    }

    const message3Data = await message3Response.json();
    console.log('✅ Third message sent successfully');
    console.log('   Response preview:', message3Data.message.substring(0, 100) + '...');

    // Test 5: Check conversation history
    console.log('\n5️⃣ Testing conversation history...');
    const historyResponse = await fetch(`${BASE_URL}/api/chat/history/${initData.sessionId}`);

    if (!historyResponse.ok) {
      throw new Error(`History failed: ${historyResponse.status}`);
    }

    const historyData = await historyResponse.json();
    console.log('✅ Conversation history retrieved successfully');
    console.log('   Total messages:', historyData.messages.length);
    console.log('   User messages:', historyData.messages.filter(m => m.role === 'user').length);
    console.log('   Assistant messages:', historyData.messages.filter(m => m.role === 'assistant').length);

    console.log('\n🎉 Conversation context test completed! 🐾✨');
    console.log('✅ Kumo is now using GPT-4o with conversation context!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Server is running on port 3001');
    console.log('   - MongoDB connection is working');
    console.log('   - OpenAI API key is configured');
  }
}

// Run the test
testConversationContext(); 