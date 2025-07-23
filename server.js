const express = require('express');
const cors = require('cors');
const https = require('https');
const querystring = require('querystring');
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');

const app = express();
const PORT = 3001;

// Enable CORS for React app
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://winvarit:12345@cluster0.uhgsfzc.mongodb.net/';
const DB_NAME = 'Kumo';
const COLLECTION_NAME = 'chats';

let db = null;

// Initialize MongoDB connection
async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI, {
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('⚠️ Continuing without MongoDB - chat history will not be saved');
    db = null;
  }
}

// OpenAI configuration
const openai = new OpenAI({
  apiKey: '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'
});

// Kumo chatbot system prompt
const KUMO_SYSTEM_PROMPT = `You are "Kumo," a cute, cloud-themed red panda travel companion for small groups (1-8 people). 
You always provide concise, friendly, and practical travel recommendations tailored to the user's group size, budget (1–5), and interests. 
Speak with encouragement and add a touch of playfulness, using 1–2 cloud or pawprint emojis per message unless asked not to. 
Guide users step-by-step, suggest optimized daily plans, and surface fun facts, booking tips, and local secrets. 

IMPORTANT: When the user has already provided trip planning data (destination, dates, party size, budget, interests), use that information to provide personalized recommendations without asking for the same details again. Only ask for missing information if needed.

Pull hotel and experience data from the latest API calls, never fabricate details, and clarify anything unclear. 
Keep the conversation light, efficient, and welcoming—like a real travel-savvy friend!`;

// Amadeus API credentials
const AMADEUS_CLIENT_ID = 'ARLUoeYjlYUGNltpXpxzFkHKAwHmENTp';
const AMADEUS_CLIENT_SECRET = '09S2uNz8WczvI0Fd';

// Token cache
let amadeusTokenCache = {
  token: null,
  expiresAt: null
};

// Get Amadeus OAuth2 token
const getAmadeusToken = async () => {
  const now = Date.now();
  if (amadeusTokenCache.token && amadeusTokenCache.expiresAt && now < amadeusTokenCache.expiresAt) {
    return amadeusTokenCache.token;
  }

  try {
    const tokenBody = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: AMADEUS_CLIENT_ID,
      client_secret: AMADEUS_CLIENT_SECRET
    });

    const options = {
      hostname: 'test.api.amadeus.com',
      port: 443,
      path: '/v1/security/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenBody)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const tokenData = JSON.parse(data);
              amadeusTokenCache = {
                token: tokenData.access_token,
                expiresAt: now + (tokenData.expires_in - 60) * 1000
              };
              resolve(tokenData.access_token);
            } catch (error) {
              reject(new Error('Failed to parse token response'));
            }
          } else {
            reject(new Error(`Token request failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(tokenBody);
      req.end();
    });
  } catch (error) {
    console.error('Error getting Amadeus token:', error);
    return null;
  }
};

// Proxy hotel search
app.get('/api/hotels', async (req, res) => {
  try {
    const { cityCode, checkIn, checkOut, adults, budgetLevel } = req.query;
    
    const token = await getAmadeusToken();
    if (!token) {
      return res.status(500).json({ error: 'Failed to get Amadeus token' });
    }

    console.log('🏨 Step 1: Getting hotels by city for:', cityCode);
    
    // Step 1: Get hotels by city
    const hotelsByCityPath = `/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`;
    
    const hotelsByCityOptions = {
      hostname: 'test.api.amadeus.com',
      port: 443,
      path: hotelsByCityPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    console.log('🏨 Making hotels by city request to:', `https://test.api.amadeus.com${hotelsByCityPath}`);
    
    const hotelsByCityData = await new Promise((resolve, reject) => {
      const req = https.request(hotelsByCityOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('🏨 Hotels by city response status:', res.statusCode);
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(data);
              console.log('🏨 Hotels by city successful, found', parsedData.data?.length || 0, 'hotels');
              resolve(parsedData);
            } catch (error) {
              reject(new Error('Failed to parse hotels by city response'));
            }
          } else {
            console.log('🏨 Hotels by city failed with status:', res.statusCode);
            console.log('🏨 Response data:', data);
            reject(new Error(`Hotels by city failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    // Step 2: Get hotel offers using the hotel IDs
    if (hotelsByCityData.data && hotelsByCityData.data.length > 0) {
      const hotelIds = hotelsByCityData.data.slice(0, 5).map(hotel => hotel.hotelId).join(',');
      
      console.log('🏨 Step 2: Getting hotel offers for hotel IDs:', hotelIds);
      
      const hotelOffersPath = `/v2/shopping/hotel-offers?hotelIds=${hotelIds}&adults=${adults}`;
      
      const hotelOffersOptions = {
        hostname: 'test.api.amadeus.com',
        port: 443,
        path: hotelOffersPath,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      console.log('🏨 Making hotel offers request to:', `https://test.api.amadeus.com${hotelOffersPath}`);
      
      const hotelOffersData = await new Promise((resolve, reject) => {
        const req = https.request(hotelOffersOptions, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            console.log('🏨 Hotel offers response status:', res.statusCode);
            if (res.statusCode === 200) {
              try {
                const parsedData = JSON.parse(data);
                console.log('🏨 Hotel offers successful, found', parsedData.data?.length || 0, 'hotels with offers');
                resolve(parsedData);
              } catch (error) {
                reject(new Error('Failed to parse hotel offers response'));
              }
            } else {
              console.log('🏨 Hotel offers failed with status:', res.statusCode);
              console.log('🏨 Response data:', data);
              reject(new Error(`Hotel offers failed: ${res.statusCode} - ${data}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      });

      res.json(hotelOffersData);
    } else {
      console.log('🏨 No hotels found for city:', cityCode);
      res.json({ data: [] });
    }
  } catch (error) {
    console.error('Hotel search error:', error);
    // Return mock data as fallback when API fails
    const mockHotels = {
      data: [
        {
          hotel: {
            name: "Luxury Palace Hotel",
            rating: "5⭐",
            address: {
              cityName: cityCode === 'BKK' ? 'Bangkok' : 'Sample City',
              countryCode: cityCode === 'BKK' ? 'TH' : 'US',
              latitude: cityCode === 'BKK' ? '13.7563' : '40.7128',
              longitude: cityCode === 'BKK' ? '100.5018' : '-74.0060'
            }
          },
          offers: [
            {
              price: {
                currency: "USD",
                total: "1200"
              }
            }
          ]
        },
        {
          hotel: {
            name: "Grand Resort & Spa",
            rating: "5⭐",
            address: {
              cityName: cityCode === 'BKK' ? 'Bangkok' : 'Sample City',
              countryCode: cityCode === 'BKK' ? 'TH' : 'US',
              latitude: cityCode === 'BKK' ? '13.7563' : '40.7128',
              longitude: cityCode === 'BKK' ? '100.5018' : '-74.0060'
            }
          },
          offers: [
            {
              price: {
                currency: "USD",
                total: "950"
              }
            }
          ]
        },
        {
          hotel: {
            name: "Executive Business Hotel",
            rating: "4⭐",
            address: {
              cityName: cityCode === 'BKK' ? 'Bangkok' : 'Sample City',
              countryCode: cityCode === 'BKK' ? 'TH' : 'US',
              latitude: cityCode === 'BKK' ? '13.7563' : '40.7128',
              longitude: cityCode === 'BKK' ? '100.5018' : '-74.0060'
            }
          },
          offers: [
            {
              price: {
                currency: "USD",
                total: "450"
              }
            }
          ]
        },
        {
          hotel: {
            name: "Comfort Inn",
            rating: "3⭐",
            address: {
              cityName: cityCode === 'BKK' ? 'Bangkok' : 'Sample City',
              countryCode: cityCode === 'BKK' ? 'TH' : 'US',
              latitude: cityCode === 'BKK' ? '13.7563' : '40.7128',
              longitude: cityCode === 'BKK' ? '100.5018' : '-74.0060'
            }
          },
          offers: [
            {
              price: {
                currency: "USD",
                total: "180"
              }
            }
          ]
        },
        {
          hotel: {
            name: "Budget Hostel",
            rating: "2⭐",
            address: {
              cityName: cityCode === 'BKK' ? 'Bangkok' : 'Sample City',
              countryCode: cityCode === 'BKK' ? 'TH' : 'US',
              latitude: cityCode === 'BKK' ? '13.7563' : '40.7128',
              longitude: cityCode === 'BKK' ? '100.5018' : '-74.0060'
            }
          },
          offers: [
            {
              price: {
                currency: "USD",
                total: "75"
              }
            }
          ]
        }
      ]
    };
    res.json(mockHotels);
  }
});

// Proxy city search
app.get('/api/cities', async (req, res) => {
  try {
    const { keyword } = req.query;
    
    const token = await getAmadeusToken();
    if (!token) {
      return res.status(500).json({ error: 'Failed to get Amadeus token' });
    }

    // Try using general locations search without subType
    const cityPath = `/v1/reference-data/locations?keyword=${encodeURIComponent(keyword)}&page[limit]=5`;
    
    const options = {
      hostname: 'test.api.amadeus.com',
      port: 443,
      path: cityPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    console.log('🌍 Making city search request to:', `https://test.api.amadeus.com${cityPath}`);
    
    const cityData = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('🌍 City search response status:', res.statusCode);
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(data);
              console.log('🌍 City search successful, found', parsedData.data?.length || 0, 'cities');
              resolve(parsedData);
            } catch (error) {
              reject(new Error('Failed to parse city response'));
            }
          } else {
            console.log('🌍 City search failed with status:', res.statusCode);
            console.log('🌍 Response data:', data);
            reject(new Error(`City search failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    res.json(cityData);
  } catch (error) {
    console.error('City search error:', error);
    // Return mock city data as fallback when API fails
    const mockCityData = {
      data: [
        {
          name: keyword === 'Bangkok' ? 'Bangkok' : 'Sample City',
          iataCode: keyword === 'Bangkok' ? 'BKK' : 'SMP',
          address: {
            cityName: keyword === 'Bangkok' ? 'Bangkok' : 'Sample City',
            countryCode: keyword === 'Bangkok' ? 'TH' : 'US'
          }
        }
      ]
    };
    res.json(mockCityData);
  }
});

// Proxy airport search
app.get('/api/airports', async (req, res) => {
  try {
    const { keyword } = req.query;
    
    const token = await getAmadeusToken();
    if (!token) {
      return res.status(500).json({ error: 'Failed to get Amadeus token' });
    }

    // Use the general locations endpoint for airports too
    const airportPath = `/v1/reference-data/locations?keyword=${encodeURIComponent(keyword)}&subType=AIRPORT&page[limit]=10`;
    
    const options = {
      hostname: 'test.api.amadeus.com',
      port: 443,
      path: airportPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const airportData = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } catch (error) {
              reject(new Error('Failed to parse airport response'));
            }
          } else {
            reject(new Error(`Airport search failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    res.json(airportData);
  } catch (error) {
    console.error('Airport search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alternative hotel search using hotel IDs (for testing)
app.get('/api/hotels/alternative', async (req, res) => {
  try {
    const { cityCode, checkIn, checkOut, adults } = req.query;
    
    const token = await getAmadeusToken();
    if (!token) {
      return res.status(500).json({ error: 'Failed to get Amadeus token' });
    }

    // Use known working hotel IDs from Amadeus test environment
    const hotelPath = `/v2/shopping/hotel-offers?hotelIds=ADPAR001,ADPAR002,ADPAR003&adults=${adults}`;
    
    const options = {
      hostname: 'test.api.amadeus.com',
      port: 443,
      path: hotelPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    console.log('🏨 Making alternative hotel search request to:', `https://test.api.amadeus.com${hotelPath}`);

    const hotelData = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('🏨 Alternative hotel search response status:', res.statusCode);
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(data);
              console.log('🏨 Alternative hotel search successful');
              resolve(parsedData);
            } catch (error) {
              reject(new Error('Failed to parse alternative hotel response'));
            }
          } else {
            console.log('🏨 Alternative hotel search failed with status:', res.statusCode);
            console.log('🏨 Response data:', data);
            reject(new Error(`Alternative hotel search failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    res.json(hotelData);
  } catch (error) {
    console.error('Alternative hotel search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get hotels by city code first, then search offers
app.get('/api/hotels/by-city', async (req, res) => {
  try {
    const { cityCode, checkIn, checkOut, adults } = req.query;
    
    const token = await getAmadeusToken();
    if (!token) {
      return res.status(500).json({ error: 'Failed to get Amadeus token' });
    }

    // First, get hotels in the city
    const hotelsPath = `/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`;
    
    const options = {
      hostname: 'test.api.amadeus.com',
      port: 443,
      path: hotelsPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    console.log('🏨 Getting hotels by city:', `https://test.api.amadeus.com${hotelsPath}`);

    const hotelsData = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('🏨 Hotels by city response status:', res.statusCode);
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(data);
              console.log('🏨 Found', parsedData.data?.length || 0, 'hotels in city');
              resolve(parsedData);
            } catch (error) {
              reject(new Error('Failed to parse hotels by city response'));
            }
          } else {
            console.log('🏨 Hotels by city failed with status:', res.statusCode);
            console.log('🏨 Response data:', data);
            reject(new Error(`Hotels by city failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    // If we got hotels, try to get offers for the first few
    if (hotelsData.data && hotelsData.data.length > 0) {
      const hotelIds = hotelsData.data.slice(0, 3).map(hotel => hotel.hotelId).join(',');
      
      const offersPath = `/v2/shopping/hotel-offers?hotelIds=${hotelIds}&adults=${adults}`;
      
      const offersOptions = {
        hostname: 'test.api.amadeus.com',
        port: 443,
        path: offersPath,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      console.log('🏨 Getting hotel offers for:', hotelIds);

      const offersData = await new Promise((resolve, reject) => {
        const req = https.request(offersOptions, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            console.log('🏨 Hotel offers response status:', res.statusCode);
            if (res.statusCode === 200) {
              try {
                const parsedData = JSON.parse(data);
                console.log('🏨 Hotel offers successful');
                resolve(parsedData);
              } catch (error) {
                reject(new Error('Failed to parse hotel offers response'));
              }
            } else {
              console.log('🏨 Hotel offers failed with status:', res.statusCode);
              console.log('🏨 Response data:', data);
              reject(new Error(`Hotel offers failed: ${res.statusCode} - ${data}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      });

      res.json(offersData);
    } else {
      res.json({ data: [] });
    }
  } catch (error) {
    console.error('Hotels by city error:', error);
    // Return mock data as fallback
    const mockHotels = {
      data: [
        {
          name: "Sample Hotel",
          rating: "4⭐",
          address: {
            cityName: "Sample City",
            countryCode: "US",
            latitude: "40.7128",
            longitude: "-74.0060"
          },
          offers: [
            {
              price: {
                currency: "USD",
                total: "150"
              }
            }
          ]
        }
      ]
    };
    res.json(mockHotels);
  }
});

// Proxy hotel search by geocode (alternative method)
app.get('/api/hotels/geocode', async (req, res) => {
  try {
    const { latitude, longitude, checkIn, checkOut, adults, budgetLevel } = req.query;
    
    const token = await getAmadeusToken();
    if (!token) {
      return res.status(500).json({ error: 'Failed to get Amadeus token' });
    }

    // Use the reference data locations hotels by geocode endpoint
    const hotelPath = `/v1/reference-data/locations/hotels/by-geocode?latitude=${latitude}&longitude=${longitude}`;
    
    const options = {
      hostname: 'test.api.amadeus.com',
      port: 443,
      path: hotelPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const hotelData = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } catch (error) {
              reject(new Error('Failed to parse hotel geocode response'));
            }
          } else {
            reject(new Error(`Hotel geocode search failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    res.json(hotelData);
  } catch (error) {
    console.error('Hotel geocode search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chatbot API endpoints

// Initialize chat session
app.post('/api/chat/init', async (req, res) => {
  try {
    const { userId, context } = req.body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let welcomeMessage = "Hi there! I'm Kumo, your cloud-themed red panda travel companion! 🐾✨ I'm here to help you plan the perfect trip. To get started, could you tell me:\n\n• How many people are traveling?\n• What's your budget level (1-5, where 1 is budget-friendly and 5 is luxury)?\n• What are your main interests (culture, food, adventure, relaxation, etc.)?\n• Where would you like to go?\n\nLet's make your travel dreams come true! 🌤️";
    
    // If trip data is available, customize the welcome message
    if (context && context.tripData) {
      const trip = context.tripData;
      welcomeMessage = `Hi there! I'm Kumo, your cloud-themed red panda travel companion! 🐾✨ 

I can see you're planning a trip to ${trip.city} for ${trip.planningData.partySize} people from ${trip.planningData.startDate} to ${trip.planningData.endDate}. 

Your preferences:
• Budget: Level ${trip.planningData.budget}/5 (${trip.planningData.budget <= 2 ? 'Budget-friendly' : trip.planningData.budget <= 3 ? 'Mid-range' : 'Luxury'})
• Traveler Type: ${trip.planningData.travelerType}
• Interests: ${trip.planningData.interests.join(', ')}

Perfect! I'm ready to help you with personalized recommendations for your ${trip.city} adventure! What would you like to know about? 🌤️`;
    }
    
    // Try to save to MongoDB if available
    if (db) {
      try {
        const session = {
          sessionId,
          userId: userId || 'anonymous',
          messages: [
            {
              role: 'system',
              content: KUMO_SYSTEM_PROMPT,
              timestamp: new Date()
            },
            {
              role: 'assistant',
              content: welcomeMessage,
              timestamp: new Date()
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection(COLLECTION_NAME).insertOne(session);
        console.log('✅ Chat session saved to MongoDB with conversation context support');
      } catch (dbError) {
        console.error('⚠️ Failed to save to MongoDB:', dbError);
      }
    }
    
    res.json({ 
      sessionId, 
      message: welcomeMessage 
    });
  } catch (error) {
    console.error('Chat init error:', error);
    res.status(500).json({ error: 'Failed to initialize chat session' });
  }
});

// Send message to chatbot
app.post('/api/chat/message', async (req, res) => {
  try {
    const { sessionId, message, context } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }

    // Prepare messages for OpenAI with conversation context
    const messagesForOpenAI = [
      {
        role: 'system',
        content: KUMO_SYSTEM_PROMPT
      }
    ];

    // Get conversation history from MongoDB if available
    let conversationHistory = [];
    if (db) {
      try {
        const session = await db.collection(COLLECTION_NAME).findOne({ sessionId });
        if (session && session.messages) {
          // Get the last 5 user-assistant message pairs (excluding system messages)
          const userAssistantMessages = session.messages.filter(msg => 
            msg.role === 'user' || msg.role === 'assistant'
          );
          conversationHistory = userAssistantMessages.slice(-10); // Last 10 messages (5 pairs)
        }
      } catch (dbError) {
        console.error('⚠️ Failed to get conversation history from MongoDB:', dbError);
      }
    }

    // Add conversation history to context
    conversationHistory.forEach(msg => {
      messagesForOpenAI.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    if (conversationHistory.length > 0) {
      console.log(`🗣️ Using conversation context: ${conversationHistory.length} previous messages`);
    }

    // Add context about available data if provided
    let contextMessage = '';
    if (context) {
      if (context.hotels) {
        contextMessage += `\n\nAvailable hotel data: ${JSON.stringify(context.hotels)}`;
      }
      if (context.attractions) {
        contextMessage += `\n\nAvailable attraction data: ${JSON.stringify(context.attractions)}`;
      }
      if (context.weather) {
        contextMessage += `\n\nWeather data: ${JSON.stringify(context.weather)}`;
      }
      
      // Add trip planning data if available
      if (context.tripData) {
        const trip = context.tripData;
        contextMessage += `\n\nCURRENT TRIP PLANNING DATA:
- Destination: ${trip.city}
- Travel Dates: ${trip.planningData.startDate} to ${trip.planningData.endDate}
- Party Size: ${trip.planningData.partySize} people
- Traveler Type: ${trip.planningData.travelerType}
- Budget Level: ${trip.planningData.budget}/5
- Interests: ${trip.planningData.interests.join(', ')}
- Weather: ${trip.weather ? `${trip.weather.current?.temp || trip.weather.temp}°C, ${trip.weather.current?.condition || trip.weather.condition}` : 'Not available'}
- Attractions: ${trip.attractions ? trip.attractions.map(a => a.name).join(', ') : 'Not available'}
- Custom Plan: ${trip.plan ? 'Available' : 'Not generated yet'}

IMPORTANT: The user has already provided their trip preferences. Use this information to provide personalized recommendations without asking for the same details again.`;
      }
    }

    if (contextMessage) {
      messagesForOpenAI.push({
        role: 'system',
        content: `Additional context for your response: ${contextMessage}`
      });
    }

    // Add user message
    messagesForOpenAI.push({
      role: 'user',
      content: message
    });

    // Get response from OpenAI with GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messagesForOpenAI,
      max_tokens: 800,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    });

    const assistantMessage = completion.choices[0].message.content;

    // Try to save to MongoDB if available
    if (db) {
      try {
        const session = await db.collection(COLLECTION_NAME).findOne({ sessionId });
        if (session) {
          session.messages.push(
            { role: 'user', content: message, timestamp: new Date() },
            { role: 'assistant', content: assistantMessage, timestamp: new Date() }
          );
          session.updatedAt = new Date();
          
          await db.collection(COLLECTION_NAME).updateOne(
            { sessionId },
            { 
              $set: { 
                messages: session.messages,
                updatedAt: session.updatedAt
              }
            }
          );
          console.log(`✅ Chat message saved to MongoDB (${session.messages.length} total messages)`);
        } else {
          // Create new session if not found
          const newSession = {
            sessionId,
            userId: 'anonymous',
            messages: [
              { role: 'system', content: KUMO_SYSTEM_PROMPT, timestamp: new Date() },
              { role: 'user', content: message, timestamp: new Date() },
              { role: 'assistant', content: assistantMessage, timestamp: new Date() }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await db.collection(COLLECTION_NAME).insertOne(newSession);
          console.log('✅ New chat session created in MongoDB');
        }
      } catch (dbError) {
        console.error('⚠️ Failed to save to MongoDB:', dbError);
      }
    }

    res.json({
      message: assistantMessage,
      sessionId
    });

  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get chat history
app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (db) {
      try {
        const session = await db.collection(COLLECTION_NAME).findOne({ sessionId });
        if (session) {
          return res.json({ messages: session.messages });
        }
      } catch (dbError) {
        console.error('⚠️ Failed to get history from MongoDB:', dbError);
      }
    }
    
    // Return empty history if no database or session not found
    res.json({ messages: [] });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Initialize MongoDB connection and start server
connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
    console.log('📡 Ready to proxy Amadeus API calls');
    console.log('🤖 Kumo chatbot endpoints ready');
  });
}); 