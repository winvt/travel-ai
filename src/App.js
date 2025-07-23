import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import KumoChatbot from './components/KumoChatbot';
import ChatButton from './components/ChatButton';
import './App.css';

// API Keys
const GOOGLE_MAPS_API_KEY = 'AIzaSyCW9G1CBbrs87Gb9gUbhaYpwB0mnpQUGf4';
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || 'your-openai-api-key-here';
const AMADEUS_CLIENT_ID = 'ARLUoeYjlYUGNltpXpxzFkHKAwHmENTp';
const AMADEUS_CLIENT_SECRET = '09S2uNz8WczvI0Fd';
const MONGODB_URI = 'mongodb+srv://winvarit:12345@cluster0.uhgsfzc.mongodb.net/';

// Token cache
let amadeusTokenCache = {
  token: null,
  expiresAt: null
};

// Debug API key status
console.log('🔑 OpenAI API Key Status:', OPENAI_API_KEY !== 'your-openai-api-key-here' ? '✅ Configured' : '❌ Not configured');
console.log('🌤️ Open-Meteo API Status:', '✅ Free - No API key required');
console.log('🗺️ Google Maps API Key Status:', '✅ Configured');
console.log('🏨 Amadeus API Status:', '✅ Configured');
console.log('🗄️ MongoDB URI Status:', MONGODB_URI ? '✅ Configured' : '❌ Not configured');

// Amadeus OAuth2 Token function
const getAmadeusToken = async () => {
  // Check if we have a valid cached token
  const now = Date.now();
  if (amadeusTokenCache.token && amadeusTokenCache.expiresAt && now < amadeusTokenCache.expiresAt) {
    console.log('🔑 Using cached Amadeus token (expires in', Math.round((amadeusTokenCache.expiresAt - now) / 1000), 'seconds)');
    return amadeusTokenCache.token;
  }

  console.log('🔑 Getting new Amadeus OAuth2 token...');
  console.log('🔑 Client ID:', AMADEUS_CLIENT_ID);
  console.log('🔑 Client Secret:', AMADEUS_CLIENT_SECRET ? '***configured***' : 'NOT CONFIGURED');
  
  try {
    const tokenUrl = 'https://test.api.amadeus.com/v1/security/oauth2/token';
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: AMADEUS_CLIENT_ID,
      client_secret: AMADEUS_CLIENT_SECRET
    });
    
    console.log('🔑 Token request URL:', tokenUrl);
    console.log('🔑 Token request body:', tokenBody.toString());
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody
    });

    console.log('🔑 Token response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token request failed:', errorText);
      throw new Error(`Token request failed: ${response.status}`);
    }

    const tokenData = await response.json();
    console.log('✅ Amadeus token obtained successfully');
    console.log('✅ Token expires in:', tokenData.expires_in, 'seconds');
    
    // Cache the token with expiration (subtract 60 seconds for safety)
    amadeusTokenCache = {
      token: tokenData.access_token,
      expiresAt: now + (tokenData.expires_in - 60) * 1000
    };
    
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ Error getting Amadeus token:', error);
    return null;
  }
};

// OpenAI API function
const generateAIContent = async (city, type) => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.log('⚠️ Using fallback data - OpenAI API key not configured');
    return getMockData(city, type);
  }

  console.log(`🤖 Generating AI content for ${city} - ${type}`);
  
  try {
    const prompt = getPromptForType(city, type);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
                  body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'You are a travel expert providing concise, engaging information about destinations.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 800,
              temperature: 0.7
            })
    });

    console.log('OpenAI Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log(`✅ AI content generated for ${city} - ${type}:`, content);
    return content;
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    console.log('🔄 Falling back to mock data');
    return getMockData(city, type);
  }
};

const getPromptForType = (city, type) => {
  switch (type) {
    case 'weather':
      return `Provide a 5-day weather forecast for ${city} in this exact JSON format: {"current": {"temp": number, "condition": "description", "humidity": number, "wind": "speed"}, "forecast": [{"day": "Day 1", "temp": number, "condition": "description"}, {"day": "Day 2", "temp": number, "condition": "description"}, {"day": "Day 3", "temp": number, "condition": "description"}, {"day": "Day 4", "temp": number, "condition": "description"}, {"day": "Day 5", "temp": number, "condition": "description"}]}. Make it realistic for the current season.`;
    
    case 'summary':
      return `Write a concise but comprehensive description about ${city} in exactly 160 words or less. Cover: 1) Historical background and cultural significance, 2) What makes it unique for travelers, 3) Local culture and cuisine highlights, 4) Best times to visit, 5) Overall atmosphere. Make it engaging and informative.`;
    
    case 'attractions':
      return `List the top 5 must-visit attractions in ${city} in this exact JSON format: [{"name": "attraction name", "rating": number, "type": "category", "description": "brief description"}]. Include famous landmarks, museums, parks, or cultural sites. Ratings should be between 4.0-4.8. Add a brief description for each attraction.`;
    
    default:
      return `Tell me about ${city}`;
  }
};

// Get attraction image (fallback to placeholder)
const getAttractionImage = (attractionName, cityName, photoUrl = null) => {
  // If we have a real photo URL from Google Places, use it
  if (photoUrl) {
    return photoUrl;
  }
  
  // Fallback to a more reliable placeholder image service
  return `https://picsum.photos/300/200?random=${encodeURIComponent(attractionName)}`;
};

// Unsplash image function removed - using Picsum Photos instead

// Fetch real weather data from Open-Meteo API
const fetchWeatherData = async (cityName) => {
  // Open-Meteo API does not require an API key for free usage
  console.log('🌤️ Fetching real weather data for:', cityName);
  
  try {
    // First, get coordinates for the city
    const geocodeResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding failed: ${geocodeResponse.status}`);
    }
    
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      throw new Error('City not found');
    }
    
    const { latitude, longitude } = geocodeData.results[0];
    
    // Get current weather and 5-day forecast
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relativehumidity_2m,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    );
    
    if (!weatherResponse.ok) {
      throw new Error(`Weather API failed: ${weatherResponse.status}`);
    }
    
    const weatherData = await weatherResponse.json();
    
    // Weather code mapping for better descriptions
    const weatherDescriptions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      95: 'Thunderstorm'
    };
    
    // Process the weather data
    const current = weatherData.current;
    const daily = weatherData.daily;
    
    const processedWeather = {
      current: {
        temp: Math.round(current.temperature_2m),
        condition: weatherDescriptions[current.weathercode] || 'Clear',
        humidity: Math.round(current.relativehumidity_2m),
        wind: `${Math.round(current.windspeed_10m)} km/h`
      },
      forecast: daily.time.map((date, index) => ({
        day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `Day ${index + 1}`,
        temp: Math.round((daily.temperature_2m_max[index] + daily.temperature_2m_min[index]) / 2),
        condition: weatherDescriptions[daily.weathercode[index]] || 'Clear'
      })).slice(0, 5) // Get top 5 daily forecasts
    };
    
    console.log('✅ Real weather data fetched:', processedWeather);
    return processedWeather;
    
  } catch (error) {
    console.error('❌ Error fetching weather data:', error);
    console.log('🔄 Falling back to AI-generated weather');
    return null; // Will trigger AI weather generation
  }
};

// Generate personalized travel plan
const generateCustomPlan = async (cityName, planningData, weather, attractions) => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.log('⚠️ OpenAI API key not configured - using mock data');
    return getMockCustomPlan(cityName, planningData);
  }

  console.log('🤖 Generating personalized travel plan for:', cityName, planningData);
  
  try {
    const budgetLabels = {
      1: 'Budget ($)',
      2: 'Economy ($$)',
      3: 'Mid-range ($$$)',
      4: 'Luxury ($$$$)',
      5: 'Ultra-luxury ($$$$$)'
    };

    const prompt = `🧠 Advanced AI Travel Planner Request

DESTINATION: ${cityName}
TRAVEL DATES: ${planningData.startDate} to ${planningData.endDate}
PARTY SIZE: ${planningData.partySize} people
TRAVELER TYPE: ${planningData.travelerType} (${planningData.travelerType === 'single' ? 'solo adventurer' : planningData.travelerType === 'couple' ? 'romantic getaway' : planningData.travelerType === 'family' ? 'kid-friendly fun' : 'friends & fun'})
BUDGET LEVEL: ${planningData.budget}/5 (${budgetLabels[planningData.budget]})
INTERESTS: ${planningData.interests.length > 0 ? planningData.interests.join(', ') : 'general tourism'}
${planningData.userAdjustments ? `USER ADJUSTMENTS: ${planningData.userAdjustments}` : ''}

WEATHER DATA: ${JSON.stringify(weather)}
TOP ATTRACTIONS: ${attractions.map(a => a.name).join(', ')}

📅 DATE ANALYSIS:
- If dates are in the future: Use historical weather data for that time period
- If dates are in the past: Use historical weather patterns
- Consider seasonal activities and events for the travel dates
- Account for daylight hours and seasonal tourism patterns

🌤️ WEATHER INTEGRATION:
- Adapt activities based on weather conditions
- Suggest indoor alternatives for rainy days
- Consider temperature for outdoor activities
- Plan appropriate clothing and gear recommendations

👥 TRAVELER TYPE CONSIDERATIONS:
- Solo: Flexible schedules, immersive experiences, social opportunities
- Couple: Romantic settings, balanced activities, intimate dining
- Family: Kid-friendly venues, educational activities, safety considerations
- Group: Social activities, group discounts, shared experiences

🎯 INTERESTS INTEGRATION:
- Food & Dining: Local cuisine, food tours, cooking classes, restaurant recommendations
- Nature & Outdoors: Parks, hiking trails, wildlife experiences, outdoor activities
- Nightlife: Bars, clubs, entertainment venues, evening activities
- Culture & History: Historical sites, traditional experiences, local customs
- Museums & Arts: Art galleries, museums, cultural exhibitions, creative experiences
- Golf & Sports: Golf courses, sports facilities, athletic activities

💰 BUDGET INTEGRATION:
- Accommodation: Match budget to hotel type and location
- Dining: Street food vs restaurants based on budget
- Activities: Free attractions vs paid experiences
- Transport: Public transit vs private options

Please create a comprehensive travel plan following this exact JSON format:
{
  "summary": "3-4 sentence overview considering dates, weather, traveler type, and budget",
  "group_type": "solo/couple/friends/family based on party size",
  "seasonal_notes": "seasonal considerations for the travel dates",
  "weather_adaptations": "how weather affects the itinerary",
  "accommodation": {
    "recommendations": ["specific hotel/guesthouse names with brief descriptions"],
    "budget_range": "price range per night for this budget level",
    "location_tips": "neighborhood recommendations",
    "booking_tips": "advice for this group size and budget"
  },
  "itinerary": [
    {
      "day": "Day 1",
      "date": "actual date",
      "weather_forecast": "expected weather for this day",
      "morning": {
        "time": "9:00 AM",
        "activity": "specific activity with exact location",
        "transport": "detailed transport instructions",
        "weather_consideration": "how weather affects this activity"
      },
      "afternoon": {
        "time": "2:00 PM", 
        "activity": "specific activity with exact location",
        "transport": "detailed transport instructions",
        "weather_consideration": "how weather affects this activity"
      },
      "evening": {
        "time": "7:00 PM",
        "activity": "specific activity with exact location", 
        "transport": "detailed transport instructions",
        "weather_consideration": "how weather affects this activity"
      },
      "meals": {
        "breakfast": "specific restaurant name, type, and why recommended",
        "lunch": "specific restaurant name, type, and why recommended",
        "dinner": "specific restaurant name, type, and why recommended"
      },
      "flow_tips": "efficient route planning and timing",
      "budget_notes": "cost considerations for this day"
    }
  ],
  "budget_breakdown": {
    "accommodation": "detailed cost breakdown for the group",
    "food": "daily meal costs for the group", 
    "activities": "entrance fees and experience costs",
    "transport": "daily transport costs",
    "miscellaneous": "unexpected costs and tips",
    "total": "total estimated cost for the entire trip"
  },
  "weather_preparation": [
    "clothing recommendations based on weather",
    "gear suggestions for activities",
    "backup plans for weather-dependent activities"
  ],
  "pro_tips": [
    "seasonal booking advice for the travel dates",
    "weather-appropriate packing tips",
    "group-specific local etiquette",
    "budget optimization for this traveler type",
    "seasonal event or festival information"
  ]
}

🎯 CRITICAL REQUIREMENTS:
1. Use historical weather data if travel dates are in the future
2. Consider seasonal tourism patterns and local events
3. Adapt activities based on weather conditions
4. Match accommodation and dining to budget level
5. Provide specific, bookable recommendations
6. Include weather-appropriate clothing and gear advice
7. Consider group dynamics and safety
8. Optimize for the specific traveler type preferences
9. Prioritize activities based on selected interests
10. Include interest-specific recommendations and experiences`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `🧠 System Prompt – Custom AI Travel Planner (1–8 People)
You are a smart travel assistant that creates personalized travel plans for individuals or small groups (1–8 people).

Your task is to generate a realistic and enjoyable travel plan that includes:

Tailored Day-by-Day Itinerary (times, flow, activities)
Attractions & Experiences (group-size friendly, budget-appropriate)
Meal Recommendations (local favorites, street food, restaurants)
Transport Options (walk, tuk-tuk, rideshare, van, etc., based on group size)
Accommodation Suggestions (budget, midrange, or luxury based on user input)
Pro Tips for booking, crowds, etiquette, and maximizing fun for small groups

💡 Adapt tone and itinerary based on group type:
Solo traveler = flexible, immersive, discovery-driven
Couple = romantic, balanced, atmospheric
Friends group = playful, fun-packed, social
Family = easygoing, kid-friendly options

Make sure the plan feels thoughtful and practical, with flow and efficiency (e.g., nearby attractions grouped together, avoid backtracking). Budget level should influence food, lodging, and activity types—not just cost.

Always respond with valid JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
                      max_tokens: 2500,
              temperature: 0.7
      })
    });

    console.log('Custom Plan Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const planContent = data.choices[0].message.content;
    console.log('✅ Custom plan generated:', planContent);
    
    // Parse the JSON response
    try {
      // Clean the content by removing markdown formatting
      let cleanedContent = planContent;
      if (cleanedContent.includes('```json')) {
        cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (cleanedContent.includes('```')) {
        cleanedContent = cleanedContent.replace(/```\n?/g, '');
      }
      
      const parsedPlan = JSON.parse(cleanedContent);
      console.log('✅ Custom plan generated successfully');
      console.log('📋 Custom plan structure:', JSON.stringify(parsedPlan, null, 2));
      return parsedPlan;
    } catch (error) {
      console.error('Error parsing custom plan JSON:', error);
      return getMockCustomPlan(cityName, planningData);
    }

  } catch (error) {
    console.error('❌ Error generating custom plan:', error);
    console.log('🔄 Falling back to mock plan');
    return getMockCustomPlan(cityName, planningData);
  }
};

// City validation and formatting for Amadeus API
const validateAndFormatCity = async (inputCity) => {
  console.log('🔍 Validating city input:', inputCity);
  
  // Common city mappings and corrections
  const cityMappings = {
    // Common misspellings and variations
    'bangkok': 'Bangkok',
    'bkk': 'Bangkok',
    'london': 'London',
    'lnd': 'London',
    'paris': 'Paris',
    'prs': 'Paris',
    'new york': 'New York',
    'nyc': 'New York',
    'newyork': 'New York',
    'tokyo': 'Tokyo',
    'tky': 'Tokyo',
    'rome': 'Rome',
    'madrid': 'Madrid',
    'barcelona': 'Barcelona',
    'amsterdam': 'Amsterdam',
    'berlin': 'Berlin',
    'singapore': 'Singapore',
    'sgp': 'Singapore',
    'dubai': 'Dubai',
    'sydney': 'Sydney',
    'melbourne': 'Melbourne',
    'vancouver': 'Vancouver',
    'toronto': 'Toronto',
    'mumbai': 'Mumbai',
    'delhi': 'Delhi',
    'shanghai': 'Shanghai',
    'beijing': 'Beijing',
    'seoul': 'Seoul',
    'osaka': 'Osaka',
    'kyoto': 'Kyoto',
    'pattaya': 'Pattaya',
    'pattaya city': 'Pattaya',
    'phuket': 'Phuket',
    'chiang mai': 'Chiang Mai',
    'chiangmai': 'Chiang Mai',
    'krabi': 'Krabi',
    'koh samui': 'Koh Samui',
    'kohsamui': 'Koh Samui',
    'bali': 'Bali',
    'jakarta': 'Jakarta',
    'manila': 'Manila',
    'ho chi minh city': 'Ho Chi Minh City',
    'hochiminh': 'Ho Chi Minh City',
    'hanoi': 'Hanoi',
    'saigon': 'Ho Chi Minh City',
    'kuala lumpur': 'Kuala Lumpur',
    'kualalumpur': 'Kuala Lumpur',
    'penang': 'Penang',
    'georgetown': 'Georgetown',
    'hong kong': 'Hong Kong',
    'hongkong': 'Hong Kong',
    'taipei': 'Taipei',
    'busan': 'Busan',
    'fukuoka': 'Fukuoka',
    'nagoya': 'Nagoya',
    'yokohama': 'Yokohama',
    'sapporo': 'Sapporo',
    'nara': 'Nara',
    'kanazawa': 'Kanazawa',
    'takayama': 'Takayama',
    'hakone': 'Hakone',
    'nikko': 'Nikko',
    'kamakura': 'Kamakura',
    'hiroshima': 'Hiroshima',
    'nagasaki': 'Nagasaki',
    'okinawa': 'Okinawa',
    'kobe': 'Kobe'
  };

  // Normalize input
  const normalizedInput = inputCity.toLowerCase().trim();
  
  // Check for exact matches first
  if (cityMappings[normalizedInput]) {
    console.log('✅ Found exact city match:', cityMappings[normalizedInput]);
    return cityMappings[normalizedInput];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(cityMappings)) {
    if (key.includes(normalizedInput) || normalizedInput.includes(key)) {
      console.log('✅ Found partial city match:', value);
      return value;
    }
  }

  // Try to get city code from Amadeus API for validation
  try {
    console.log('🌐 Checking city with Amadeus API...');
    const proxyUrl = `http://localhost:3001/api/cities?keyword=${encodeURIComponent(inputCity)}`;
    const response = await fetch(proxyUrl);
    
    if (response.ok) {
      const cityData = await response.json();
      if (cityData.data && cityData.data.length > 0) {
        const firstCity = cityData.data[0];
        const validatedName = firstCity.name || inputCity;
        console.log('✅ Amadeus API validated city:', validatedName);
        return validatedName;
      }
    }
  } catch (error) {
    console.log('⚠️ Amadeus API validation failed, using input as-is:', error.message);
  }

  // If no validation found, format the input properly
  const formattedCity = inputCity
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  console.log('📝 Formatted city name:', formattedCity);
  return formattedCity;
};

// Generate mock hotel data
const generateMockHotels = (cityName, budgetLevel) => {
  const budgetRanges = {
    1: { min: 50, max: 100, label: 'Budget ($)' },
    2: { min: 100, max: 200, label: 'Economy ($$)' },
    3: { min: 200, max: 400, label: 'Mid-range ($$$)' },
    4: { min: 400, max: 800, label: 'Luxury ($$$$)' },
    5: { min: 800, max: 2000, label: 'Ultra-luxury ($$$$$)' }
  };

  const budgetRange = budgetRanges[budgetLevel];
  const hotelNames = [
    `${cityName} Central Hotel`,
    `${cityName} Boutique Inn`,
    `${cityName} Comfort Suites`,
    `${cityName} Grand Plaza`,
    `${cityName} Riverside Lodge`,
    `${cityName} Business Center`,
    `${cityName} Heritage Hotel`,
    `${cityName} Modern Resort`,
    `${cityName} City View Inn`,
    `${cityName} Luxury Palace`
  ];

  const hotels = [];
  for (let i = 0; i < 8; i++) {
    const basePrice = Math.floor(Math.random() * (budgetRange.max - budgetRange.min)) + budgetRange.min;
    const hotel = {
      name: hotelNames[i % hotelNames.length],
      rating: Math.floor(Math.random() * 2) + 3 + '⭐', // 3-4 stars
      address: {
        cityName: cityName,
        countryCode: 'US',
        latitude: (Math.random() * 0.1 + 40).toFixed(6),
        longitude: (Math.random() * 0.1 - 74).toFixed(6),
        streetName: `${Math.floor(Math.random() * 9999)} Main Street`,
        streetNumber: Math.floor(Math.random() * 999)
      },
      amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant'],
      offers: [
        {
          id: `offer-${i}`,
          roomType: 'Standard Room',
          boardType: 'Room Only',
          price: {
            currency: 'USD',
            total: basePrice.toString(),
            base: (basePrice * 0.8).toString()
          },
          cancellationPolicy: 'Free cancellation'
        },
        {
          id: `offer-${i}-deluxe`,
          roomType: 'Deluxe Room',
          boardType: 'Room Only',
          price: {
            currency: 'USD',
            total: (basePrice * 1.3).toString(),
            base: (basePrice * 1.1).toString()
          },
          cancellationPolicy: 'Free cancellation'
        }
      ]
    };
    hotels.push(hotel);
  }

  return hotels;
};

// Mock custom plan for fallback
const getMockCustomPlan = (cityName, planningData) => {
  const budgetLabels = {
    1: 'Budget ($)',
    2: 'Economy ($$)',
    3: 'Mid-range ($$$)',
    4: 'Luxury ($$$$)',
    5: 'Ultra-luxury ($$$$$)'
  };

  return {
    summary: `Your personalized ${budgetLabels[planningData.budget]} trip to ${cityName} for ${planningData.partySize} people from ${planningData.startDate} to ${planningData.endDate}. This carefully crafted itinerary balances must-see attractions with authentic local experiences.`,
    accommodation: {
      recommendations: [
        `${cityName} Central Hotel`,
        `${cityName} Boutique Inn`,
        `${cityName} Comfort Suites`
      ],
      budget_range: planningData.budget <= 2 ? "$50-100/night" : planningData.budget <= 3 ? "$100-200/night" : "$200-400/night",
      tips: "Book accommodations in the city center for easy access to attractions and public transportation."
    },
    itinerary: [
      {
        day: "Day 1",
        date: planningData.startDate,
        activities: [
          "Arrive and check into hotel",
          "Explore the city center",
          "Visit main attractions"
        ],
        meals: {
          breakfast: "Hotel breakfast",
          lunch: "Local café",
          dinner: "Traditional restaurant"
        },
        transport: "Walking and public transportation"
      },
      {
        day: "Day 2",
        date: planningData.endDate,
        activities: [
          "Visit museums and galleries",
          "Shopping and local markets",
          "Evening entertainment"
        ],
        meals: {
          breakfast: "Local bakery",
          lunch: "Street food experience",
          dinner: "Fine dining restaurant"
        },
        transport: "Metro and walking"
      }
    ],
    budget_breakdown: {
      accommodation: planningData.budget <= 2 ? "$200" : planningData.budget <= 3 ? "$400" : "$800",
      food: planningData.budget <= 2 ? "$150" : planningData.budget <= 3 ? "$300" : "$600",
      activities: planningData.budget <= 2 ? "$100" : planningData.budget <= 3 ? "$200" : "$400",
      transport: "$50",
      total: planningData.budget <= 2 ? "$500" : planningData.budget <= 3 ? "$950" : "$1850"
    },
    tips: [
      "Book attractions in advance to avoid long queues",
      "Use public transportation to save money",
      "Try local cuisine for authentic experiences",
      "Carry comfortable walking shoes",
      "Learn basic local phrases for better interactions"
    ]
  };
};

// Amadeus API functions
const searchHotels = async (cityName, checkIn, checkOut, adults = 1, budgetLevel = 3) => {
  console.log('🏨 Searching hotels with Amadeus API...');
  console.log('📍 Search parameters:', { cityName, checkIn, checkOut, adults, budgetLevel });
  
  const maxRetries = 2;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      // Get OAuth2 token first
      const token = await getAmadeusToken();
      if (!token) {
        console.log('⚠️ Cannot search hotels - no Amadeus token');
        return [];
      }

    // Try to get real city code from proxy server first
    let cityCode = null;
    
    try {
      console.log('🌍 Attempting to get real city code from proxy server...');
      const proxyUrl = `http://localhost:3001/api/cities?keyword=${encodeURIComponent(cityName)}`;
      console.log('🌐 City search proxy URL:', proxyUrl);
      
      const cityResponse = await fetch(proxyUrl);
      
      if (cityResponse.ok) {
        const cityData = await cityResponse.json();
        console.log('✅ Real city data received from proxy');
        
        if (cityData.data && cityData.data.length > 0) {
          const cityWithCode = cityData.data.find(city => city.address && city.address.cityCode);
          if (cityWithCode) {
            cityCode = cityWithCode.address.cityCode;
            console.log('📍 Found real city code:', cityCode, 'for', cityName);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Proxy server not available for city search:', error.message);
    }
    
    // Fallback to hardcoded city codes
    console.log('🔄 Using fallback city code system...');
    
    if (!cityCode) {
      // Enhanced city code mapping with validated names
      const commonCityCodes = {
        // Major cities with validated names
        'Bangkok': 'BKK',
        'London': 'LON',
        'Paris': 'PAR',
        'New York': 'NYC',
        'Tokyo': 'TYO',
        'Rome': 'ROM',
        'Madrid': 'MAD',
        'Barcelona': 'BCN',
        'Amsterdam': 'AMS',
        'Berlin': 'BER',
        'Singapore': 'SIN',
        'Dubai': 'DXB',
        'Sydney': 'SYD',
        'Melbourne': 'MEL',
        'Vancouver': 'YVR',
        'Toronto': 'YYZ',
        'Mumbai': 'BOM',
        'Delhi': 'DEL',
        'Shanghai': 'SHA',
        'Beijing': 'PEK',
        'Seoul': 'SEL',
        'Osaka': 'OSA',
        'Kyoto': 'KYO',
        'Pattaya': 'PAT',
        'Phuket': 'HKT',
        'Chiang Mai': 'CNX',
        'Krabi': 'KBV',
        'Koh Samui': 'USM',
        'Bali': 'DPS',
        'Jakarta': 'CGK',
        'Manila': 'MNL',
        'Ho Chi Minh City': 'SGN',
        'Hanoi': 'HAN',
        'Kuala Lumpur': 'KUL',
        'Penang': 'PEN',
        'Georgetown': 'PEN',
        'Hong Kong': 'HKG',
        'Taipei': 'TPE',
        'Busan': 'PUS',
        'Fukuoka': 'FUK',
        'Nagoya': 'NGO',
        'Yokohama': 'YOK',
        'Sapporo': 'CTS',
        'Nara': 'NRT',
        'Kanazawa': 'KMQ',
        'Takayama': 'TAK',
        'Hakone': 'HND',
        'Nikko': 'NRT',
        'Kamakura': 'NRT',
        'Hiroshima': 'HIJ',
        'Nagasaki': 'NGS',
        'Okinawa': 'OKA',
        'Kobe': 'UKB',
        'Los Angeles': 'LAX',
        'Chicago': 'ORD',
        'Miami': 'MIA',
        'San Francisco': 'SFO',
        'Seattle': 'SEA',
        'Denver': 'DEN',
        'Atlanta': 'ATL',
        'Dallas': 'DFW',
        'Houston': 'IAH',
        'Phoenix': 'PHX',
        'Las Vegas': 'LAS',
        'Orlando': 'MCO',
        'Nashville': 'BNA',
        'Austin': 'AUS',
        'Portland': 'PDX',
        'San Diego': 'SAN',
        'Tampa': 'TPA',
        'Minneapolis': 'MSP',
        'Detroit': 'DTW',
        'Cleveland': 'CLE',
        'Pittsburgh': 'PIT',
        'Cincinnati': 'CVG',
        'Indianapolis': 'IND',
        'Columbus': 'CMH',
        'Milwaukee': 'MKE',
        'Kansas City': 'MCI',
        'St Louis': 'STL',
        'Oklahoma City': 'OKC',
        'Memphis': 'MEM',
        'New Orleans': 'MSY',
        'Baltimore': 'BWI',
        'Charlotte': 'CLT',
        'Raleigh': 'RDU',
        'Richmond': 'RIC',
        'Norfolk': 'ORF',
        'Buffalo': 'BUF',
        'Rochester': 'ROC',
        'Syracuse': 'SYR',
        'Albany': 'ALB',
        'Providence': 'PVD',
        'Hartford': 'BDL',
        'Springfield': 'SGF',
        'Des Moines': 'DSM',
        'Omaha': 'OMA',
        'Fargo': 'FAR',
        'Billings': 'BIL',
        'Boise': 'BOI',
        'Spokane': 'GEG',
        'Missoula': 'MSO',
        'Anchorage': 'ANC',
        'Honolulu': 'HNL'
      };
      
      // Use the validated city name directly
      cityCode = commonCityCodes[cityName];
      
      if (cityCode) {
        console.log('📍 Using validated city code:', cityCode, 'for', cityName);
      } else {
        console.log('❌ No validated city code found for:', cityName);
        console.log('🔄 Trying to use first 3 letters as city code...');
        cityCode = cityName.substring(0, 3).toUpperCase();
        console.log('📍 Generated city code:', cityCode, 'for', cityName);
      }
    }

    // Try to get real data from proxy server first
    try {
      console.log('🏨 Attempting to get real hotel data from proxy server...');
      const proxyUrl = `http://localhost:3001/api/hotels/by-city?cityCode=${cityCode}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&budgetLevel=${budgetLevel}`;
      console.log('🌐 Proxy URL:', proxyUrl);
      
      const hotelResponse = await fetch(proxyUrl);
      
      if (hotelResponse.ok) {
        const hotelData = await hotelResponse.json();
        console.log('✅ Real hotel data received from proxy');
        
        if (hotelData.data && hotelData.data.length > 0) {
          console.log('🏨 Raw hotel data structure:', JSON.stringify(hotelData.data[0], null, 2));
          
          // Process real hotel data with defensive parsing
          let hotels = hotelData.data.map(hotel => {
            // Handle different possible data structures
            const hotelInfo = hotel.hotel || hotel;
            const hotelName = hotelInfo.name || hotelInfo.hotelName || 'Unknown Hotel';
            const hotelRating = hotelInfo.rating || hotelInfo.stars || 'N/A';
            const hotelAddress = hotelInfo.address || {};
            const hotelAmenities = hotelInfo.amenities || [];
            
            // Handle offers structure
            const offers = hotel.offers || hotel.offersList || [];
            const processedOffers = offers.map(offer => ({
              id: offer.id || `offer-${Math.random()}`,
              roomType: offer.room?.type || offer.roomType || 'Standard Room',
              boardType: offer.boardType || 'Room Only',
              price: offer.price || { currency: 'USD', total: '150' },
              cancellationPolicy: offer.policies?.cancellation || 'Standard'
            }));
            
            return {
              name: hotelName,
              rating: hotelRating,
              address: hotelAddress,
              amenities: hotelAmenities,
              offers: processedOffers
            };
          });

          // Filter by budget
          const budgetRanges = {
            1: { min: 0, max: 100, label: 'Budget ($)' },
            2: { min: 100, max: 200, label: 'Economy ($$)' },
            3: { min: 200, max: 400, label: 'Mid-range ($$$)' },
            4: { min: 400, max: 800, label: 'Luxury ($$$$)' },
            5: { min: 800, max: 9999, label: 'Ultra-luxury ($$$$$)' }
          };

          const budgetRange = budgetRanges[budgetLevel];
          hotels = hotels.filter(hotel => {
            if (!hotel.offers || hotel.offers.length === 0) {
              return false; // Skip hotels with no offers
            }
            
            const avgPrice = hotel.offers.reduce((sum, offer) => {
              const price = parseFloat(offer.price?.total || offer.price?.amount || 0);
              return sum + price;
            }, 0) / hotel.offers.length;
            
            return avgPrice >= budgetRange.min && avgPrice <= budgetRange.max;
          });

          console.log(`✅ Found ${hotels.length} real hotels in ${budgetRange.label} range`);
          return hotels;
        }
      }
    } catch (error) {
      console.log('⚠️ Proxy server not available, using mock data:', error.message);
    }
    
    // Fallback to mock data
    console.log('🏨 Using mock hotel data as fallback');
    console.log('🏨 City code:', cityCode, 'for', cityName);
    
    const mockHotels = generateMockHotels(cityName, budgetLevel);
    console.log('🏨 Generated', mockHotels.length, 'mock hotels');
    
    return mockHotels;

  } catch (error) {
    console.error('❌ Error searching hotels:', error);
    
    // If it's a token expired error, retry
    if (error.message.includes('Token expired') && retryCount < maxRetries) {
      retryCount++;
      console.log(`🔄 Retrying hotel search (attempt ${retryCount}/${maxRetries})...`);
      continue;
    }
    
    return [];
  }
  } // Close the while loop
};

const searchFlights = async (origin, destination, departureDate, returnDate = null, adults = 1) => {
  console.log('✈️ Searching flights with Amadeus API...');
  
  try {
    // Get OAuth2 token first
    const token = await getAmadeusToken();
    if (!token) {
      console.log('⚠️ Cannot search flights - no Amadeus token');
      return [];
    }

    const flightResponse = await fetch(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${departureDate}${returnDate ? `&returnDate=${returnDate}` : ''}&adults=${adults}&max=20`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!flightResponse.ok) {
      throw new Error(`Flight search failed: ${flightResponse.status}`);
    }

    const flightData = await flightResponse.json();
    
    if (!flightData.data || flightData.data.length === 0) {
      throw new Error('No flights found for the specified criteria');
    }

    // Process flight data according to Amadeus API structure
    const flights = flightData.data.map(flight => ({
      id: flight.id,
      price: flight.price,
      itineraries: flight.itineraries,
      numberOfBookableSeats: flight.numberOfBookableSeats,
      pricingOptions: flight.pricingOptions
    }));

    console.log('✅ Found', flights.length, 'flights');
    return flights;

  } catch (error) {
    console.error('❌ Error searching flights:', error);
    return [];
  }
};

// Travel insights function removed - not currently used

// Test function for API calls
const testAPIs = async () => {
  console.log('🧪 Testing API calls...');
  
  // Test Open-Meteo Weather API
  console.log('🌤️ Testing Open-Meteo Weather API...');
  try {
    const weatherTest = await fetchWeatherData('Paris');
    if (weatherTest) {
      console.log('✅ Open-Meteo API Test PASSED');
      console.log('Weather data:', weatherTest);
    } else {
      console.log('❌ Open-Meteo API Test FAILED - No data returned');
    }
  } catch (error) {
    console.error('❌ Open-Meteo API Test FAILED:', error);
  }
  
  // Test Amadeus Hotel Search API
  console.log('🏨 Testing Amadeus Hotel Search API...');
  try {
    const hotelTest = await searchHotels('Paris', '2024-12-01', '2024-12-03', 2, 3); // Mid-range budget
    if (hotelTest && hotelTest.length > 0) {
      console.log('✅ Amadeus Hotel API Test PASSED');
      console.log('Found hotels:', hotelTest.length);
      console.log('First hotel:', hotelTest[0]);
    } else {
      console.log('❌ Amadeus Hotel API Test FAILED - No hotels found or authentication failed');
    }
  } catch (error) {
    console.error('❌ Amadeus Hotel API Test FAILED:', error);
  }
  
  // Test Amadeus Flight Search API
  console.log('✈️ Testing Amadeus Flight Search API...');
  try {
    const flightTest = await searchFlights('PAR', 'LON', '2024-12-01', null, 1);
    if (flightTest && flightTest.length > 0) {
      console.log('✅ Amadeus Flight API Test PASSED');
      console.log('Found flights:', flightTest.length);
      console.log('First flight:', flightTest[0]);
    } else {
      console.log('❌ Amadeus Flight API Test FAILED - No flights found or authentication failed');
    }
  } catch (error) {
    console.error('❌ Amadeus Flight API Test FAILED:', error);
  }
  
  console.log('🧪 API testing complete!');
};

// Search for attractions using Google Maps Places API
const searchAttractionsWithGoogleMaps = async (cityName, service) => {
  console.log('🗺️ Searching Google Maps Places API for attractions in:', cityName);
  
  try {
    // Search for tourist attractions in the city
    const attractionsRequest = {
      query: `tourist attractions in ${cityName}`,
      type: 'tourist_attraction',
      rankBy: window.google.maps.places.RankBy.RATING
    };

    const attractionsResults = await new Promise((resolve, reject) => {
      service.textSearch(attractionsRequest, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else {
          console.error('Google Places API error:', status);
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });

    // Also search for landmarks
    const landmarksRequest = {
      query: `landmarks in ${cityName}`,
      type: 'establishment',
      rankBy: window.google.maps.places.RankBy.RATING
    };

    const landmarksResults = await new Promise((resolve, reject) => {
      service.textSearch(landmarksRequest, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else {
          console.error('Google Places API error:', status);
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });

    // Combine and sort results by rating
    const allResults = [...attractionsResults, ...landmarksResults];
    const sortedResults = allResults
      .filter(place => place.rating && place.rating >= 4.0) // Only places with good ratings
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10); // Get top 10 to avoid duplicates

    // Remove duplicates and get top 5 with photos
    const uniquePlaces = [];
    const seenNames = new Set();
    
    for (const place of sortedResults) {
      const name = place.name.toLowerCase();
      if (!seenNames.has(name) && uniquePlaces.length < 5) {
        seenNames.add(name);
        
        // Get photos for this place
        let photoUrl = null;
        if (place.photos && place.photos.length > 0) {
          const photo = place.photos[0];
          photoUrl = photo.getUrl({
            maxWidth: 400,
            maxHeight: 300
          });
        }
        
        uniquePlaces.push({
          name: place.name,
          rating: place.rating || 4.0,
          type: place.types ? place.types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Attraction',
          description: place.formatted_address || place.vicinity || 'A popular attraction in the area',
          photoUrl: photoUrl,
          placeId: place.place_id
        });
      }
    }

    console.log('✅ Found attractions via Google Maps:', uniquePlaces);
    return uniquePlaces;

  } catch (error) {
    console.error('❌ Error searching Google Maps Places:', error);
    console.log('🔄 Falling back to AI-generated attractions');
    return null; // Will trigger fallback to AI
  }
};

// Fallback mock data
const getMockData = (city, type) => {
  const weatherData = {
    'New York': {
      current: { temp: 22, condition: 'Sunny', humidity: 65, wind: '12 km/h' },
      forecast: [
        { day: 'Today', temp: 22, condition: 'Sunny' },
        { day: 'Tomorrow', temp: 24, condition: 'Partly Cloudy' },
        { day: 'Day 3', temp: 20, condition: 'Rainy' },
        { day: 'Day 4', temp: 23, condition: 'Clear' },
        { day: 'Day 5', temp: 25, condition: 'Sunny' }
      ]
    },
    'London': {
      current: { temp: 18, condition: 'Cloudy', humidity: 75, wind: '8 km/h' },
      forecast: [
        { day: 'Today', temp: 18, condition: 'Cloudy' },
        { day: 'Tomorrow', temp: 16, condition: 'Rainy' },
        { day: 'Day 3', temp: 19, condition: 'Partly Cloudy' },
        { day: 'Day 4', temp: 17, condition: 'Drizzle' },
        { day: 'Day 5', temp: 20, condition: 'Clear' }
      ]
    },
    'Paris': {
      current: { temp: 20, condition: 'Partly Cloudy', humidity: 70, wind: '10 km/h' },
      forecast: [
        { day: 'Today', temp: 20, condition: 'Partly Cloudy' },
        { day: 'Tomorrow', temp: 22, condition: 'Sunny' },
        { day: 'Day 3', temp: 19, condition: 'Light Rain' },
        { day: 'Day 4', temp: 21, condition: 'Clear' },
        { day: 'Day 5', temp: 23, condition: 'Sunny' }
      ]
    },
    'Tokyo': {
      current: { temp: 25, condition: 'Clear', humidity: 60, wind: '15 km/h' },
      forecast: [
        { day: 'Today', temp: 25, condition: 'Clear' },
        { day: 'Tomorrow', temp: 27, condition: 'Sunny' },
        { day: 'Day 3', temp: 24, condition: 'Partly Cloudy' },
        { day: 'Day 4', temp: 26, condition: 'Clear' },
        { day: 'Day 5', temp: 28, condition: 'Sunny' }
      ]
    }
  };

      const summaries = {
      'New York': 'New York City, the "Big Apple," is a global metropolis founded as a Dutch trading post in 1624. Its iconic skyline tells the story of American ambition and innovation. What makes New York special is its incredible diversity - every neighborhood has its own character, from Greenwich Village\'s artistic vibe to Brooklyn\'s hipster culture. The city\'s cultural scene is unmatched, with world-class museums, Broadway theaters, and countless galleries. The culinary scene reflects the city\'s immigrant heritage, offering authentic cuisine from every country. Spring and Fall offer pleasant weather and fewer crowds, while summer brings outdoor festivals and winter offers magical holiday markets. Visitors can expect a city that\'s both overwhelming and welcoming, where every street corner offers something new to discover.',
      'London': 'London, the capital of England, is where ancient history meets modern innovation. Founded by the Romans nearly 2,000 years ago, it has been at the center of world events for centuries. The city\'s unique character comes from its perfect blend of tradition and modernity - royal palaces stand alongside cutting-edge architecture. London\'s cultural scene is world-renowned, with institutions like the British Museum and West End theaters. The diverse population has created a culinary scene ranging from traditional British pubs to innovative international cuisine. Spring brings blooming parks, autumn offers milder weather, while winter provides magical holiday markets. Visitors can expect a city that respects its past while embracing the future, where every neighborhood tells a different story.',
      'Paris': 'Paris, the "City of Light," is a timeless symbol of romance, culture, and artistic achievement. Founded over 2,000 years ago, it has evolved into one of the world\'s most beautiful and culturally significant cities. What makes Paris special is its ability to blend old with new seamlessly - iconic landmarks like the Eiffel Tower stand alongside modern architecture. Every arrondissement has its own character, from Montmartre\'s bohemian charm to the Champs-Élysées\' elegance. The artistic heritage is unparalleled, with world-class museums housing masterpieces from every era. The culinary scene ranges from traditional bistros to Michelin-starred restaurants. Spring and autumn offer pleasant weather and blooming gardens, while summer brings Paris Plages and winter offers magical Christmas markets. Visitors can expect a city that celebrates beauty in all forms.',
      'Tokyo': 'Tokyo, Japan\'s capital, is a fascinating metropolis where ultramodern technology coexists with ancient traditions. Originally a fishing village called Edo, it has grown into the world\'s largest metropolitan area. The city\'s unique character comes from its incredible contrast - you can visit serene Shinto shrines in the morning, then experience cutting-edge technology in the afternoon. Each district has its own personality: Akihabara\'s electronic wonderland, Harajuku\'s fashion-forward streets, and Asakusa\'s traditional atmosphere. Tokyo\'s culinary scene is world-renowned, from humble ramen shops to exclusive sushi restaurants. Spring brings cherry blossom season, autumn offers pleasant weather and beautiful colors, while summer features festivals and winter provides hot springs. Visitors can expect a city that\'s both overwhelming and incredibly organized, where ancient traditions are preserved alongside innovation.'
    };

  const attractions = {
    'New York': [
      { name: 'Statue of Liberty', rating: 4.5, type: 'Landmark', description: 'Iconic symbol of freedom and democracy, offering stunning harbor views' },
      { name: 'Central Park', rating: 4.7, type: 'Park', description: '843-acre urban oasis with walking paths, lakes, and cultural attractions' },
      { name: 'Times Square', rating: 4.3, type: 'Entertainment', description: 'The crossroads of the world, famous for its bright lights and energy' },
      { name: 'Metropolitan Museum', rating: 4.6, type: 'Museum', description: 'World-class art museum with collections spanning 5,000 years' },
      { name: 'Empire State Building', rating: 4.4, type: 'Landmark', description: 'Art Deco skyscraper with observation deck offering city views' }
    ],
    'London': [
      { name: 'Big Ben', rating: 4.5, type: 'Landmark', description: 'Iconic clock tower and symbol of London, part of Westminster Palace' },
      { name: 'Tower of London', rating: 4.4, type: 'Historic Site', description: 'Historic castle and fortress with the Crown Jewels on display' },
      { name: 'British Museum', rating: 4.6, type: 'Museum', description: 'World-famous museum housing artifacts from human history' },
      { name: 'Buckingham Palace', rating: 4.3, type: 'Royal Residence', description: 'Official residence of the British monarch with changing of the guard' },
      { name: 'Westminster Abbey', rating: 4.4, type: 'Church', description: 'Gothic abbey church and site of royal coronations and weddings' }
    ],
    'Paris': [
      { name: 'Eiffel Tower', rating: 4.6, type: 'Landmark', description: 'Iconic iron lattice tower and symbol of Paris, offering city views' },
      { name: 'Louvre Museum', rating: 4.5, type: 'Museum', description: 'World\'s largest art museum, home to the Mona Lisa and Venus de Milo' },
      { name: 'Notre-Dame Cathedral', rating: 4.4, type: 'Church', description: 'Medieval Catholic cathedral, masterpiece of French Gothic architecture' },
      { name: 'Arc de Triomphe', rating: 4.3, type: 'Landmark', description: 'Triumphal arch honoring those who fought for France' },
      { name: 'Champs-Élysées', rating: 4.2, type: 'Avenue', description: 'Famous avenue known for luxury shopping and the Arc de Triomphe' }
    ],
    'Tokyo': [
      { name: 'Senso-ji Temple', rating: 4.5, type: 'Temple', description: 'Tokyo\'s oldest temple, famous for its massive lantern and traditional atmosphere' },
      { name: 'Tokyo Skytree', rating: 4.4, type: 'Observation Tower', description: 'Tallest tower in Japan, offering panoramic views of the city' },
      { name: 'Shibuya Crossing', rating: 4.3, type: 'Landmark', description: 'World\'s busiest pedestrian crossing, symbol of Tokyo\'s energy' },
      { name: 'Meiji Shrine', rating: 4.6, type: 'Shrine', description: 'Peaceful Shinto shrine surrounded by forest in the heart of the city' },
      { name: 'Tsukiji Fish Market', rating: 4.2, type: 'Market', description: 'Famous fish market known for fresh seafood and sushi restaurants' }
    ]
  };

  switch (type) {
    case 'weather':
      return weatherData[city] || {
        current: { temp: 20, condition: 'Mild', humidity: 70, wind: '10 km/h' },
        forecast: [
          { day: 'Today', temp: 20, condition: 'Mild' },
          { day: 'Tomorrow', temp: 22, condition: 'Sunny' },
          { day: 'Day 3', temp: 19, condition: 'Cloudy' },
          { day: 'Day 4', temp: 21, condition: 'Clear' },
          { day: 'Day 5', temp: 23, condition: 'Sunny' }
        ]
      };
    case 'summary':
      return summaries[city] || 'A fascinating destination with rich culture, history, and modern amenities waiting to be explored. This city offers visitors a unique blend of traditional heritage and contemporary innovation, making it an ideal destination for travelers seeking both cultural enrichment and modern comforts. The local cuisine reflects the region\'s diverse influences, while the architecture tells stories of different eras. Best visited during spring or autumn for pleasant weather and fewer crowds. Visitors can expect a welcoming atmosphere where tradition meets modernity.';
    case 'attractions':
      return attractions[city] || [
        { name: 'City Center', rating: 4.0, type: 'Downtown', description: 'The heart of the city with shops, restaurants, and cultural venues' },
        { name: 'Main Square', rating: 4.1, type: 'Plaza', description: 'Historic central square surrounded by important buildings' },
        { name: 'Local Museum', rating: 4.2, type: 'Museum', description: 'Cultural institution showcasing local history and art' },
        { name: 'Central Park', rating: 4.0, type: 'Park', description: 'Green space offering recreation and relaxation' },
        { name: 'Historic District', rating: 4.1, type: 'Historic Site', description: 'Preserved area showcasing the city\'s architectural heritage' }
      ];
    default:
      return null;
  }
};

function HomePage() {
  const [destination, setDestination] = useState('');
  const [map, setMap] = useState(null);
  const [service, setService] = useState(null);
  const [weather, setWeather] = useState(null);
  const [summary, setSummary] = useState('');
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Custom planning state
  const [showPlanningForm, setShowPlanningForm] = useState(false);
  const [planningData, setPlanningData] = useState({
    startDate: '',
    endDate: '',
    partySize: 1,
    budget: 3,
    travelerType: 'single',
    interests: []
  });
  
  // Custom plan state
  const [showCustomPlan, setShowCustomPlan] = useState(false);
  const [customPlan, setCustomPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  
  // Hotel search state
  const [hotels, setHotels] = useState([]);
  const [isSearchingHotels, setIsSearchingHotels] = useState(false);
  
  // Chatbot state
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  
  // Trip data for Kumo
  const [currentTripData, setCurrentTripData] = useState(null);
  
  // Plan adjustment state
  const [planAdjustment, setPlanAdjustment] = useState('');
  const [isAdjustingPlan, setIsAdjustingPlan] = useState(false);
  
  // Load trip data from localStorage on component mount
  useEffect(() => {
    const savedTripData = localStorage.getItem('kumoTripData');
    if (savedTripData) {
      try {
        setCurrentTripData(JSON.parse(savedTripData));
      } catch (error) {
        console.error('Failed to load trip data from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Load Google Maps API
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      // Initialize map centered on world
      const mapInstance = new window.google.maps.Map(document.getElementById('map'), {
        center: { lat: 20, lng: 0 }, // World center
        zoom: 2,
        styles: [
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#7c93a3' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#ffffff' }]
          }
        ]
      });

      const placesService = new window.google.maps.places.PlacesService(mapInstance);
      
      setMap(mapInstance);
      setService(placesService);
    }).catch(error => {
      console.error('Error loading Google Maps:', error);
    });
  }, []);

  const searchDestination = async () => {
    if (!service || !destination.trim()) return;

    console.log('🚀 User clicked "Plan My Trip" for destination:', destination);
    setLoading(true);
    setAiLoading(true);
    
    // Validate and format city name for Amadeus API
    const validatedCity = await validateAndFormatCity(destination.trim());
    console.log('📍 Validated city:', validatedCity);
    
    // Show planning form after destination is set
    setShowPlanningForm(true);
    
    try {
      // Get city coordinates
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: destination }, (results, status) => {
          if (status === 'OK') {
            resolve(results[0]);
          } else {
            reject(new Error('Geocoding failed'));
          }
        });
      });

      const location = result.geometry.location;
      const cityName = validatedCity; // Use the validated city name

      console.log('📍 Using validated city:', cityName);

      // Update map to destination
      map.setCenter(location);
      map.setZoom(12);

      // Add marker for destination
      new window.google.maps.Marker({
        position: location,
        map: map,
        title: destination,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
      });

      // Fetch real weather data first, then generate summary
      console.log('🌤️ Fetching weather data...');
      let weatherData = await fetchWeatherData(cityName);
      
      // If real weather data is not available, use AI-generated weather
      if (!weatherData) {
        console.log('🤖 Generating AI weather data...');
        const aiWeatherData = await generateAIContent(cityName, 'weather');
        try {
          weatherData = typeof aiWeatherData === 'string' ? JSON.parse(aiWeatherData) : aiWeatherData;
        } catch (error) {
          console.error('Error parsing AI weather response:', error);
          weatherData = getMockData(cityName, 'weather');
        }
      }
      
      // Generate summary
      console.log('🤖 Generating AI summary...');
      const summaryData = await generateAIContent(cityName, 'summary');

      // Search for attractions using Google Maps Places API
      let attractionsData = await searchAttractionsWithGoogleMaps(cityName, service);
      
      // If Google Maps search fails, fall back to AI-generated attractions
      if (!attractionsData || attractionsData.length === 0) {
        console.log('🔄 Falling back to AI-generated attractions');
        try {
          const aiAttractionsData = await generateAIContent(cityName, 'attractions');
          if (typeof aiAttractionsData === 'string') {
            attractionsData = JSON.parse(aiAttractionsData);
          } else {
            attractionsData = aiAttractionsData;
          }
        } catch (error) {
          console.error('Error with AI attractions:', error);
          attractionsData = getMockData(cityName, 'attractions');
        }
      }

      setWeather(weatherData);
      setSummary(summaryData);
      setAttractions(attractionsData);
      setSelectedCity(cityName);
      
      console.log('✅ Trip planning completed for:', cityName);
      setLoading(false);
      setAiLoading(false);

    } catch (error) {
      console.error('Error searching destination:', error);
      setLoading(false);
      setAiLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="hero-section">
        <h1>WanderWise</h1>
        <p className="tagline">We plan your trip</p>
        <p className="subtitle">AI-powered travel planning with custom insights</p>
        
        {/* Test API Button */}
        <button 
          className="test-api-btn"
          onClick={testAPIs}
          style={{
            background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '25px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '600',
            marginTop: '15px'
          }}
        >
          🧪 Test APIs
        </button>
      </div>

      <div className="search-container">
        <div className="search-box">
          <input
            type="text"
            placeholder="Enter your destination (e.g., New York, London, Tokyo)..."
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchDestination()}
          />
          <button onClick={searchDestination} disabled={loading}>
            {loading ? 'Planning...' : 'Plan My Trip'}
          </button>
        </div>
      </div>

      <div className="content-container">
        <div id="map" style={{ height: '400px', width: '100%', marginBottom: '20px' }}></div>
        
        {/* Custom Planning Form */}
        {showPlanningForm && (
          <div className="planning-form-section">
            <h2>🎯 Customize Your Trip</h2>
            <div className="planning-form">
              <div className="planning-grid">
                {/* Date Selection */}
                <div className="planning-card">
                  <h3>📅 When are you traveling?</h3>
                  <div className="date-inputs">
                    <div className="date-input">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={planningData.startDate}
                        onChange={(e) => setPlanningData({...planningData, startDate: e.target.value})}
                      />
                    </div>
                    <div className="date-input">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={planningData.endDate}
                        onChange={(e) => setPlanningData({...planningData, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Party Size */}
                <div className="planning-card">
                  <h3>👥 How many people?</h3>
                  <div className="party-size-buttons">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <button
                        key={num}
                        className={`party-size-btn ${planningData.partySize === num ? 'active' : ''}`}
                        onClick={() => setPlanningData({...planningData, partySize: num})}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Traveler Type Selection */}
                <div className="planning-card">
                  <h3>👥 What type of traveler are you?</h3>
                  <div className="traveler-type-buttons">
                    {[
                      {value: 'single', label: 'Single', desc: 'Solo adventurer', icon: '👤'},
                      {value: 'couple', label: 'Couple', desc: 'Romantic getaway', icon: '💑'},
                      {value: 'family', label: 'Family', desc: 'Kid-friendly fun', icon: '👨‍👩‍👧‍👦'},
                      {value: 'group', label: 'Group', desc: 'Friends & fun', icon: '👥'}
                    ].map(traveler => (
                      <button
                        key={traveler.value}
                        className={`traveler-type-btn ${planningData.travelerType === traveler.value ? 'active' : ''}`}
                        onClick={() => setPlanningData({...planningData, travelerType: traveler.value})}
                      >
                        <span className="traveler-icon">{traveler.icon}</span>
                        <div className="traveler-info">
                          <span className="traveler-label">{traveler.label}</span>
                          <span className="traveler-desc">{traveler.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Selection */}
                <div className="planning-card">
                  <h3>💰 What's your budget?</h3>
                  <div className="budget-buttons">
                    {[
                      {value: 1, label: '$', desc: 'Budget'},
                      {value: 2, label: '$$', desc: 'Economy'},
                      {value: 3, label: '$$$', desc: 'Mid-range'},
                      {value: 4, label: '$$$$', desc: 'Luxury'},
                      {value: 5, label: '$$$$$', desc: 'Ultra-luxury'}
                    ].map(budget => (
                      <button
                        key={budget.value}
                        className={`budget-btn ${planningData.budget === budget.value ? 'active' : ''}`}
                        onClick={() => setPlanningData({...planningData, budget: budget.value})}
                      >
                        <span className="budget-label">{budget.label}</span>
                        <span className="budget-desc">{budget.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interests Selection */}
                <div className="planning-card">
                  <h3>🎯 What interests you most?</h3>
                  <p className="interests-subtitle">Select all that apply</p>
                  <div className="interests-grid">
                    {[
                      {value: 'food', label: 'Food & Dining', icon: '🍽️', desc: 'Local cuisine & restaurants'},
                      {value: 'nature', label: 'Nature & Outdoors', icon: '🌿', desc: 'Parks, hiking & wildlife'},
                      {value: 'nightlife', label: 'Nightlife', icon: '🌙', desc: 'Bars, clubs & entertainment'},
                      {value: 'culture', label: 'Culture & History', icon: '🏛️', desc: 'Traditions & heritage'},
                      {value: 'museums', label: 'Museums & Arts', icon: '🎨', desc: 'Galleries & exhibitions'},
                      {value: 'golf', label: 'Golf & Sports', icon: '⛳', desc: 'Golf courses & activities'}
                    ].map(interest => (
                      <button
                        key={interest.value}
                        className={`interest-btn ${planningData.interests.includes(interest.value) ? 'active' : ''}`}
                        onClick={() => {
                          const currentInterests = planningData.interests;
                          const newInterests = currentInterests.includes(interest.value)
                            ? currentInterests.filter(i => i !== interest.value)
                            : [...currentInterests, interest.value];
                          setPlanningData({...planningData, interests: newInterests});
                        }}
                      >
                        <span className="interest-icon">{interest.icon}</span>
                        <div className="interest-info">
                          <span className="interest-label">{interest.label}</span>
                          <span className="interest-desc">{interest.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Plan Button */}
                <div className="planning-card">
                  <h3>🚀 Ready to plan?</h3>
                  <button 
                    className="generate-plan-btn"
                    onClick={async () => {
                      console.log('🎯 Generating custom plan with:', planningData);
                      setPlanLoading(true);
                      
                      try {
                        const plan = await generateCustomPlan(selectedCity, planningData, weather, attractions);
                        setCustomPlan(plan);
                        setShowCustomPlan(true);
                        setShowPlanningForm(false);
                        
                        // Store trip data for Kumo chatbot and localStorage
                        const tripData = {
                          city: selectedCity,
                          planningData: planningData,
                          weather: weather,
                          attractions: attractions,
                          plan: plan
                        };
                        setCurrentTripData(tripData);
                        
                        // Save to localStorage for persistence
                        try {
                          localStorage.setItem('kumoTripData', JSON.stringify(tripData));
                          console.log('✅ Trip data saved to localStorage');
                        } catch (error) {
                          console.error('Failed to save trip data to localStorage:', error);
                        }
                        
                        // Automatically open Kumo with trip data
                        setIsChatbotOpen(true);
                        
                        // Search for hotels after plan generation
                        console.log('🏨 Searching for hotels...');
                        
                        // Set default dates if empty
                        const startDate = planningData.startDate || '2024-12-01';
                        const endDate = planningData.endDate || '2024-12-03';
                        
                        console.log('📅 Date format check:', {
                          startDate: startDate,
                          endDate: endDate,
                          format: 'YYYY-MM-DD'
                        });
                        
                        // Only search for hotels if we have valid dates
                        let hotelResults = [];
                        if (startDate && endDate) {
                          setIsSearchingHotels(true);
                          hotelResults = await searchHotels(selectedCity, startDate, endDate, planningData.partySize, planningData.budget);
                          setHotels(hotelResults);
                        } else {
                          console.log('⚠️ Skipping hotel search - no valid dates provided');
                          setHotels([]);
                        }
                        
                        // Hotel markers functionality removed for now
                        // if (hotelResults.length > 0 && map) {
                        //   addHotelMarkersToMap(hotelResults, map, hotelMarkers, setHotelMarkers);
                        // }
                        
                        setIsSearchingHotels(false);
                      } catch (error) {
                        console.error('Error generating custom plan:', error);
                      } finally {
                        setPlanLoading(false);
                      }
                    }}
                    disabled={planLoading}
                  >
                    {planLoading ? 'Generating Plan...' : 'Generate My Custom Plan'}
                  </button>
                  
                  <button 
                    className="back-to-search-btn"
                    onClick={() => {
                      setShowPlanningForm(false);
                      setSelectedCity('');
                      setDestination('');
                      setWeather(null);
                      setSummary('');
                      setAttractions([]);
                      setCustomPlan(null);
                      setHotels([]);
                      setPlanLoading(false);
                      setIsSearchingHotels(false);
                      setCurrentTripData(null);
                      localStorage.removeItem('kumoTripData');
                      setPlanningData({
                        startDate: '',
                        endDate: '',
                        partySize: 1,
                        travelerType: 'single',
                        budget: 3,
                        interests: []
                      });
                      setCurrentTripData(null);
                      localStorage.removeItem('kumoTripData');
                    }}
                  >
                    ← Back to Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Custom Plan Page */}
        {showCustomPlan && customPlan && (
          <div className="custom-plan-section">
            <h2>🎯 Your Personalized Travel Plan</h2>
            
            {planLoading && (
              <div className="kumo-loading">
                <div className="loading-container">
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                    <div className="kumo-progress">
                      <img src="/Kumo.png" alt="Kumo" className="kumo-progress-img" />
                    </div>
                  </div>
                  <p className="loading-text">🐾 Kumo is crafting your perfect travel plan...</p>
                </div>
              </div>
            )}
            
            <div className="plan-summary">
              <h3>📋 Trip Overview</h3>
              <p>{customPlan.summary}</p>
              {customPlan.seasonal_notes && (
                <div className="seasonal-notes">
                  <h4>📅 Seasonal Notes</h4>
                  <p>{customPlan.seasonal_notes}</p>
                </div>
              )}
              {customPlan.weather_adaptations && (
                <div className="weather-adaptations">
                  <h4>🌤️ Weather Adaptations</h4>
                  <p>{customPlan.weather_adaptations}</p>
                </div>
              )}
            </div>
            
            <div className="plan-grid">
              {/* Accommodation Card */}
              <div className="plan-card accommodation-card">
                <h3>🏨 Accommodation</h3>
                <div className="hotel-recommendations">
                  {customPlan.accommodation.recommendations.map((hotel, index) => (
                    <div key={index} className="hotel-item">
                      <span className="hotel-name">
                        {typeof hotel === 'string' ? hotel : hotel.name || hotel.description || 'Hotel'}
                      </span>
                      {typeof hotel === 'object' && hotel.description && (
                        <span className="hotel-description">{hotel.description}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="budget-info">
                  <p><strong>Budget Range:</strong> {customPlan.accommodation.budget_range}</p>
                  {customPlan.accommodation.location_tips && (
                    <p><strong>Location Tips:</strong> {customPlan.accommodation.location_tips}</p>
                  )}
                  {customPlan.accommodation.booking_tips && (
                    <p><strong>Booking Tips:</strong> {customPlan.accommodation.booking_tips}</p>
                  )}
                  {customPlan.accommodation.tips && (
                    <p><strong>General Tips:</strong> {customPlan.accommodation.tips}</p>
                  )}
                </div>
              </div>
              
              {/* Hotel Search Card */}
              <div className="plan-card hotel-search-card">
                <h3>🏨 Real Hotel Options</h3>
                <div className="budget-filter-info">
                  <span className="budget-badge">
                    {planningData.budget === 1 ? 'Budget ($)' : 
                     planningData.budget === 2 ? 'Economy ($$)' :
                     planningData.budget === 3 ? 'Mid-range ($$$)' :
                     planningData.budget === 4 ? 'Luxury ($$$$)' : 'Ultra-luxury ($$$$$)'}
                  </span>
                  <span className="hotel-count">{hotels.length} hotels found</span>
                </div>
                
                {isSearchingHotels ? (
                  <div className="hotel-loading">
                    <div className="loading-spinner"></div>
                    <p>🔍 Searching for hotels...</p>
                  </div>
                ) : hotels.length > 0 ? (
                  <div className="hotel-list">
                    {hotels.slice(0, 5).map((hotel, index) => (
                      <div key={index} className="hotel-card">
                        <div className="hotel-header">
                          <h4>{hotel.name}</h4>
                          {hotel.rating !== 'N/A' && (
                            <span className="hotel-rating">⭐ {hotel.rating}</span>
                          )}
                        </div>
                        {hotel.address && (
                          <p className="hotel-address">📍 {hotel.address.cityName}, {hotel.address.countryCode}</p>
                        )}
                        {hotel.offers && hotel.offers.length > 0 && (
                          <div className="hotel-offers">
                            <p><strong>Available Rooms:</strong></p>
                            {hotel.offers.slice(0, 3).map((offer, offerIndex) => (
                              <div key={offerIndex} className="hotel-offer">
                                <span className="room-type">{offer.roomType}</span>
                                <span className="price">{offer.price.currency} {offer.price.total}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="hotel-map-link">
                          <button 
                            className="view-on-map-btn"
                            onClick={() => {
                              if (hotel.address && hotel.address.latitude && hotel.address.longitude) {
                                map.setCenter({ 
                                  lat: parseFloat(hotel.address.latitude), 
                                  lng: parseFloat(hotel.address.longitude) 
                                });
                                map.setZoom(15);
                              }
                            }}
                          >
                            🗺️ View on Map
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-hotels">No hotels found for the selected criteria.</p>
                )}
              </div>
              
              {/* Itinerary Card */}
              <div className="plan-card itinerary-card">
                <h3>🗓️ Daily Itinerary</h3>
                <div className="itinerary-list">
                  {customPlan.itinerary.map((day, index) => (
                    <div key={index} className="day-item">
                      <h4>{day.day} - {day.date}</h4>
                      
                      {/* Weather Forecast */}
                      {day.weather_forecast && (
                        <div className="weather-forecast">
                          <h5>🌤️ Weather: {day.weather_forecast}</h5>
                        </div>
                      )}
                      
                      {/* Morning */}
                      {day.morning && (
                        <div className="time-slot morning">
                          <h5>🌅 Morning ({day.morning.time})</h5>
                          <p><strong>Activity:</strong> {day.morning.activity}</p>
                          <p><strong>Transport:</strong> {day.morning.transport}</p>
                          {day.morning.weather_consideration && (
                            <p><strong>Weather Note:</strong> {day.morning.weather_consideration}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Afternoon */}
                      {day.afternoon && (
                        <div className="time-slot afternoon">
                          <h5>☀️ Afternoon ({day.afternoon.time})</h5>
                          <p><strong>Activity:</strong> {day.afternoon.activity}</p>
                          <p><strong>Transport:</strong> {day.afternoon.transport}</p>
                          {day.afternoon.weather_consideration && (
                            <p><strong>Weather Note:</strong> {day.afternoon.weather_consideration}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Evening */}
                      {day.evening && (
                        <div className="time-slot evening">
                          <h5>🌙 Evening ({day.evening.time})</h5>
                          <p><strong>Activity:</strong> {day.evening.activity}</p>
                          <p><strong>Transport:</strong> {day.evening.transport}</p>
                          {day.evening.weather_consideration && (
                            <p><strong>Weather Note:</strong> {day.evening.weather_consideration}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Meals */}
                      <div className="meals">
                        <h5>🍽️ Meals</h5>
                        <div className="meal-times">
                          <span><strong>Breakfast:</strong> {day.meals.breakfast}</span>
                          <span><strong>Lunch:</strong> {day.meals.lunch}</span>
                          <span><strong>Dinner:</strong> {day.meals.dinner}</span>
                        </div>
                      </div>
                      
                      {/* Flow Tips */}
                      {day.flow_tips && (
                        <div className="flow-tips">
                          <h5>💡 Flow Tips</h5>
                          <p>{day.flow_tips}</p>
                        </div>
                      )}
                      
                      {/* Budget Notes */}
                      {day.budget_notes && (
                        <div className="budget-notes">
                          <h5>💰 Budget Notes</h5>
                          <p>{day.budget_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Weather Preparation Card */}
              {customPlan.weather_preparation && (
                <div className="plan-card weather-prep-card">
                  <h3>🌤️ Weather Preparation</h3>
                  <div className="weather-prep-list">
                    {customPlan.weather_preparation.map((prep, index) => (
                      <div key={index} className="prep-item">
                        <span className="prep-number">{index + 1}</span>
                        <span className="prep-text">{typeof prep === 'string' ? prep : JSON.stringify(prep)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Budget Card */}
              <div className="plan-card budget-card">
                <h3>💰 Budget Breakdown</h3>
                <div className="budget-items">
                  <div className="budget-item">
                    <span>Accommodation:</span>
                    <span>{customPlan.budget_breakdown.accommodation}</span>
                  </div>
                  <div className="budget-item">
                    <span>Food:</span>
                    <span>{customPlan.budget_breakdown.food}</span>
                  </div>
                  <div className="budget-item">
                    <span>Activities:</span>
                    <span>{customPlan.budget_breakdown.activities}</span>
                  </div>
                  <div className="budget-item">
                    <span>Transport:</span>
                    <span>{customPlan.budget_breakdown.transport}</span>
                  </div>
                  <div className="budget-item total">
                    <span>Total:</span>
                    <span>{customPlan.budget_breakdown.total}</span>
                  </div>
                </div>
              </div>
              
              {/* Tips Card */}
              <div className="plan-card tips-card">
                <h3>💡 Pro Tips</h3>
                <div className="tips-list">
                  {customPlan.pro_tips ? customPlan.pro_tips.map((tip, index) => (
                    <div key={index} className="tip-item">
                      <span className="tip-number">{index + 1}</span>
                      <span className="tip-text">{typeof tip === 'string' ? tip : JSON.stringify(tip)}</span>
                    </div>
                  )) : customPlan.tips ? customPlan.tips.map((tip, index) => (
                    <div key={index} className="tip-item">
                      <span className="tip-number">{index + 1}</span>
                      <span className="tip-text">{typeof tip === 'string' ? tip : JSON.stringify(tip)}</span>
                    </div>
                  )) : null}
                </div>
              </div>
            </div>
            
            {/* Plan Adjustment Section */}
            <div className="plan-adjustment-section">
              <h3>🎯 Adjust Your Plan</h3>
              <p>Want to modify your travel plan? Tell us what you'd like to change:</p>
              
              <div className="adjustment-input-container">
                <textarea
                  className="adjustment-input"
                  value={planAdjustment}
                  onChange={(e) => setPlanAdjustment(e.target.value)}
                  placeholder="e.g., Add more outdoor activities, focus on budget-friendly options, include more cultural sites, make it more family-friendly..."
                  rows="3"
                />
                <button
                  className="adjust-plan-btn"
                  onClick={async () => {
                    if (!planAdjustment.trim()) return;
                    
                    setIsAdjustingPlan(true);
                    try {
                      // Combine original planning data with user adjustments
                      const adjustedPlanningData = {
                        ...planningData,
                        userAdjustments: planAdjustment.trim()
                      };
                      
                      // Generate new plan with adjustments
                      const newPlan = await generateCustomPlan(selectedCity, adjustedPlanningData, weather, attractions);
                      setCustomPlan(newPlan);
                      
                      // Update trip data with new plan
                      const updatedTripData = {
                        ...currentTripData,
                        plan: newPlan,
                        userAdjustments: planAdjustment.trim()
                      };
                      setCurrentTripData(updatedTripData);
                      
                      // Save to localStorage
                      try {
                        localStorage.setItem('kumoTripData', JSON.stringify(updatedTripData));
                        console.log('✅ Updated trip data saved to localStorage');
                      } catch (error) {
                        console.error('Failed to save updated trip data to localStorage:', error);
                      }
                      
                      // Clear adjustment input
                      setPlanAdjustment('');
                      
                      console.log('✅ Plan adjusted successfully with user feedback');
                    } catch (error) {
                      console.error('Error adjusting plan:', error);
                    } finally {
                      setIsAdjustingPlan(false);
                    }
                  }}
                  disabled={!planAdjustment.trim() || isAdjustingPlan}
                >
                  {isAdjustingPlan ? 'Adjusting Plan...' : 'Adjust Plan'}
                </button>
              </div>
              
              {isAdjustingPlan && (
                <div className="kumo-loading">
                  <div className="loading-container">
                    <div className="progress-bar">
                      <div className="progress-fill"></div>
                      <div className="kumo-progress">
                        <img src="/Kumo.png" alt="Kumo" className="kumo-progress-img" />
                      </div>
                    </div>
                    <p className="loading-text">🐾 Kumo is adjusting your plan...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Back Button */}
            <div className="plan-actions">
              <button 
                className="back-btn"
                onClick={() => {
                  setShowCustomPlan(false);
                  setShowPlanningForm(true);
                  // Reset planning data to allow fresh input
                  setPlanningData({
                    startDate: '',
                    endDate: '',
                    partySize: 1,
                    travelerType: 'single',
                    budget: 3,
                    interests: []
                  });
                  // Reset custom plan and hotels
                  setCustomPlan(null);
                  setHotels([]);
                  setPlanLoading(false);
                  setIsSearchingHotels(false);
                  setPlanAdjustment('');
                }}
              >
                ← Back to Planning
              </button>
            </div>
          </div>
        )}
        
        {selectedCity && (
          <div className="destination-dashboard">
            <h2>Your Trip to {selectedCity}</h2>
            
            {aiLoading && (
              <div className="kumo-loading">
                <div className="loading-container">
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                    <div className="kumo-progress">
                      <img src="/Kumo.png" alt="Kumo" className="kumo-progress-img" />
                    </div>
                  </div>
                  <p className="loading-text">🐾 Kumo is crafting your travel insights...</p>
                </div>
              </div>
            )}
            
            <div className="dashboard-grid">
              {/* Weather Card */}
              <div className="dashboard-card weather-card">
                <h3>🌤️ Weather</h3>
                {weather && (
                  <div className="weather-info">
                    <div className="current-weather">
                      <div className="temp">{weather.current?.temp || weather.temp}°C</div>
                      <div className="condition">{weather.current?.condition || weather.condition}</div>
                      <div className="details">
                        <span>Humidity: {weather.current?.humidity || weather.humidity}%</span>
                        <span>Wind: {weather.current?.wind || weather.wind}</span>
                      </div>
                    </div>
                    
                    {weather.forecast && (
                      <div className="forecast-section">
                        <h4>5-Day Forecast</h4>
                        <div className="forecast-grid">
                          {weather.forecast.map((day, index) => (
                            <div key={index} className="forecast-day">
                              <div className="day-name">{day.day}</div>
                              <div className="day-temp">{day.temp}°C</div>
                              <div className="day-condition">{day.condition}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary Card */}
              <div className="dashboard-card summary-card">
                <h3>📖 About {selectedCity}</h3>
                <div className="summary-content">
                  {summary.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Attractions Card */}
              <div className="dashboard-card attractions-card">
                <h3>🏛️ Top 5 Attractions</h3>
                <div className="attractions-list">
                  {attractions.map((attraction, index) => (
                    <div key={index} className="attraction-item">
                      <div className="attraction-rank">#{index + 1}</div>
                      <div className="attraction-details">
                        <h4>{attraction.name}</h4>
                        <p className="attraction-type">{attraction.type}</p>
                        <p className="attraction-rating">⭐ {attraction.rating}</p>
                        {attraction.description && (
                          <p className="attraction-description">{attraction.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Attraction Images Section */}
            {attractions.length > 0 && (
              <div className="attractions-images-section">
                <h3>📸 Top Attractions</h3>
                <div className="attractions-images-grid">
                  {attractions.slice(0, 3).map((attraction, index) => (
                    <div key={index} className="attraction-image-card">
                      <img 
                        src={getAttractionImage(attraction.name, selectedCity, attraction.photoUrl)} 
                        alt={attraction.name}
                        className="attraction-image"
                        onError={(e) => {
                          // Fallback to a more reliable placeholder if image fails to load
                          e.target.src = `https://picsum.photos/300/200?random=${encodeURIComponent(attraction.name)}`;
                        }}
                      />
                      <h4 className="attraction-image-title">{attraction.name}</h4>
                      <p className="attraction-image-type">{attraction.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Chatbot Components */}
        <ChatButton 
          onClick={() => setIsChatbotOpen(true)}
          isActive={isChatbotOpen}
        />
        
        <KumoChatbot 
          isOpen={isChatbotOpen}
          onClose={() => setIsChatbotOpen(false)}
          context={{
            hotels: hotels,
            attractions: attractions,
            weather: weather,
            city: selectedCity,
            tripData: currentTripData
          }}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
