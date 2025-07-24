import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import KumoChatbot from './components/KumoChatbot';
import ChatButton from './components/ChatButton';
import TextType from './components/TextType';
import './App.css';

// API Keys
const GOOGLE_MAPS_API_KEY = 'AIzaSyCW9G1CBbrs87Gb9gUbhaYpwB0mnpQUGf4';
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || 'your-openai-api-key-here';
const MONGODB_URI = 'mongodb+srv://winvarit:12345@cluster0.uhgsfzc.mongodb.net/';

// Travel Advisor API function
const searchHotelsByGeocode = async (latitude, longitude, budgetLevel = 3) => {
  console.log('🏨 Searching hotels with Travel Advisor API...');
  console.log('📍 Coordinates:', latitude, longitude);
  console.log('💰 Budget level:', budgetLevel);
  
  try {
    // Use the correct GET endpoint with proper parameters
    const url = `https://travel-advisor.p.rapidapi.com/hotels/list-by-latlng?latitude=${latitude}&longitude=${longitude}&lang=en_US&currency=USD`;
    
    console.log('🌐 Making request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': 'dd41c3b481msh51c9e846214042ap1395aejsn98d3615f27bb',
        'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`Travel Advisor API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Travel Advisor API response received');
    console.log('📦 Response structure:', Object.keys(data));
    console.log('📦 Data array length:', data.data ? data.data.length : 'No data array');
    
    // Check for hotel data in the expected structure
    let hotels = [];
    
    if (data.data && Array.isArray(data.data)) {
      hotels = data.data;
      console.log(`🏨 Found ${hotels.length} hotels in data.data`);
    } else if (data.results && Array.isArray(data.results)) {
      hotels = data.results;
      console.log(`🏨 Found ${hotels.length} hotels in data.results`);
    } else if (data.hotels && Array.isArray(data.hotels)) {
      hotels = data.hotels;
      console.log(`🏨 Found ${hotels.length} hotels in data.hotels`);
    } else if (Array.isArray(data)) {
      hotels = data;
      console.log(`🏨 Found ${hotels.length} hotels in root array`);
    } else {
      console.log('⚠️ No hotel data found in any expected structure');
      console.log('📦 Available keys in response:', Object.keys(data));
      console.log('📦 Full response preview:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      return [];
    }
    
    if (hotels.length > 0) {
      // First, try to filter hotels based on budget level
      const targetHotels = hotels.filter(hotel => {
        const hotelClass = parseFloat(hotel.hotel_class) || 0;
        
        // Map budget levels to hotel classes
        // Budget level 1 (Budget): hotel_class 1-2
        // Budget level 2 (Economy): hotel_class 2-3
        // Budget level 3 (Mid-range): hotel_class 3-4
        // Budget level 4 (Luxury): hotel_class 4-5
        // Budget level 5 (Ultra-luxury): hotel_class 5
        let minClass, maxClass;
        
        switch (budgetLevel) {
          case 1: // Budget
            minClass = 1;
            maxClass = 2;
            break;
          case 2: // Economy
            minClass = 2;
            maxClass = 3;
            break;
          case 3: // Mid-range
            minClass = 3;
            maxClass = 4;
            break;
          case 4: // Luxury
            minClass = 4;
            maxClass = 5;
            break;
          case 5: // Ultra-luxury
            minClass = 5;
            maxClass = 5;
            break;
          default:
            minClass = 1;
            maxClass = 5;
        }
        
        const isInBudget = hotelClass >= minClass && hotelClass <= maxClass;
        
        if (isInBudget) {
          console.log(`✅ Hotel "${hotel.name}" (Class ${hotelClass}) matches budget level ${budgetLevel}`);
        } else {
          console.log(`❌ Hotel "${hotel.name}" (Class ${hotelClass}) doesn't match budget level ${budgetLevel}`);
        }
        
        return isInBudget;
      });
      
      console.log(`💰 Budget filtering: ${hotels.length} total hotels → ${targetHotels.length} matching budget level ${budgetLevel}`);
      
      // If no hotels found in target budget, try lower classes
      let finalHotels = targetHotels;
      if (targetHotels.length === 0) {
        console.log(`⚠️ No hotels found for budget level ${budgetLevel}, trying lower classes...`);
        
        // Try progressively lower classes
        const fallbackClasses = [];
        switch (budgetLevel) {
          case 5: // Ultra-luxury → try luxury, then mid-range, etc.
            fallbackClasses.push(4, 3, 2, 1);
            break;
          case 4: // Luxury → try mid-range, economy, budget
            fallbackClasses.push(3, 2, 1);
            break;
          case 3: // Mid-range → try economy, budget
            fallbackClasses.push(2, 1);
            break;
          case 2: // Economy → try budget
            fallbackClasses.push(1);
            break;
          case 1: // Budget → already at lowest, show all
            fallbackClasses.push(1, 2, 3, 4, 5);
            break;
        }
        
        for (const classLevel of fallbackClasses) {
          const fallbackHotels = hotels.filter(hotel => {
            const hotelClass = parseFloat(hotel.hotel_class) || 0;
            return hotelClass === classLevel;
          });
          
          if (fallbackHotels.length > 0) {
            console.log(`✅ Found ${fallbackHotels.length} hotels in class ${classLevel} as fallback`);
            finalHotels = fallbackHotels;
            break;
          }
        }
        
        if (finalHotels.length === 0) {
          console.log(`⚠️ No hotels found in any class, showing all available hotels`);
          finalHotels = hotels;
        }
      }
      
      // Log hotel details for final hotels
      finalHotels.forEach((hotel, index) => {
        console.log(`🏨 Hotel ${index + 1}:`);
        console.log(`   Name: ${hotel.name || 'N/A'}`);
        console.log(`   Rating: ${hotel.rating || 'N/A'}`);
        console.log(`   Hotel Class: ${hotel.hotel_class || 'N/A'}`);
        console.log(`   Reviews: ${hotel.num_reviews || 'N/A'}`);
        console.log(`   Location: ${hotel.location_string || 'N/A'}`);
        console.log(`   Coordinates: ${hotel.latitude}, ${hotel.longitude}`);
        
        // Log photo URL if available
        if (hotel.photo && hotel.photo.images && hotel.photo.images.original && hotel.photo.images.original.url) {
          console.log(`   Photo URL: ${hotel.photo.images.original.url}`);
        } else {
          console.log(`   Photo URL: Not available`);
        }
        console.log('---');
      });
      
      return finalHotels;
    } else {
      console.log('⚠️ No hotels found in response');
      console.log('🔍 This might be because:');
      console.log('   - Coordinates are too far from city center');
      console.log('   - No hotels in this area');
      console.log('   - API rate limit or temporary issue');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching hotels from Travel Advisor API:', error);
    return [];
  }
};

// Token cache
// Debug API key status
console.log('🔑 OpenAI API Key Status:', OPENAI_API_KEY !== 'your-openai-api-key-here' ? '✅ Configured' : '❌ Not configured');
console.log('🌤️ Open-Meteo API Status:', '✅ Free - No API key required');
console.log('🗺️ Google Maps API Key Status:', '✅ Configured');
console.log('🏨 Travel Advisor API Status:', '✅ Configured');
console.log('🗄️ MongoDB URI Status:', MONGODB_URI ? '✅ Configured' : '❌ Not configured');



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

    const prompt = `You are an advanced AI travel planner. Generate a comprehensive, realistic travel plan with ALL required fields. Use this EXACT JSON structure:

{
  "summary": "Create an engaging, detailed trip overview that includes: 1) What makes this destination special, 2) What type of experience this trip will offer (cultural, adventure, relaxation, etc.), 3) Key highlights and unique experiences planned, 4) How the trip is tailored to the traveler type and interests. Make it exciting and informative.",
  "seasonal_notes": "Provide detailed seasonal context including: 1) Current season and typical weather patterns, 2) Peak vs off-peak considerations, 3) Seasonal events or festivals, 4) Crowd levels and pricing implications, 5) Best activities for this time of year",
  "weather_adaptations": "Give specific weather-based recommendations including: 1) Current weather conditions and patterns, 2) What to pack and wear, 3) Indoor vs outdoor activity adjustments, 4) Transportation considerations for weather, 5) Backup plans for weather-dependent activities",
  "accommodation": {
    "recommendations": ["Hotel 1 name", "Hotel 2 name", "Hotel 3 name"],
    "budget_range": "Price range per night",
    "location_tips": "Best areas to stay",
    "booking_tips": "How to book and when",
    "tips": "General accommodation advice"
  },
  "itinerary": [
    {
      "day": "Day 1",
      "date": "YYYY-MM-DD",
      "activities": ["Activity 1", "Activity 2", "Activity 3"],
      "meals": {
        "breakfast": "Breakfast recommendation",
        "lunch": "Lunch recommendation", 
        "dinner": "Dinner recommendation"
      },
      "transport": "Transportation method",
      "morning": {
        "time": "9:00 AM",
        "activity": "Morning activity",
        "transport": "How to get there",
        "weather_consideration": "Weather note if relevant"
      },
      "afternoon": {
        "time": "2:00 PM", 
        "activity": "Afternoon activity",
        "transport": "How to get there",
        "weather_consideration": "Weather note if relevant"
      },
      "evening": {
        "time": "7:00 PM",
        "activity": "Evening activity", 
        "transport": "How to get there",
        "weather_consideration": "Weather note if relevant"
      },
      "flow_tips": "Tips for smooth day flow",
      "budget_notes": "Budget considerations for this day"
    }
  ],
  "budget_breakdown": {
    "accommodation": "Provide realistic total accommodation cost based on budget level and trip duration. Include price range and booking recommendations.",
    "food": "Calculate total food cost based on budget level, party size, and trip duration. Include daily meal estimates and dining recommendations.",
    "activities": "Estimate total activities cost including attractions, tours, and experiences. Consider budget level and group size.",
    "transport": "Calculate total transportation costs including airport transfers, local transport, and any special transport needs.",
    "total": "Sum of all costs with breakdown explanation"
  },
  "weather_preparation": [
    "Provide 5-7 specific, detailed weather preparation items based on the destination's climate, current weather data, and season. Include specific clothing recommendations, gear suggestions, and weather-adaptive strategies. Make each item actionable and specific to the destination and travel dates."
  ],
  "pro_tips": [
    "Provide 5-7 destination-specific pro tips that combine local knowledge, budget considerations, and practical travel advice. Include insider tips, money-saving strategies, timing advice, and unique experiences. Make each tip specific to the destination, traveler type, and budget level."
  ]
}

## CONTEXT
DESTINATION: ${cityName}
TRAVEL DATES: ${planningData.startDate} to ${planningData.endDate}
PARTY SIZE: ${planningData.partySize} people
TRAVELER TYPE: ${planningData.travelerType}
BUDGET LEVEL: ${planningData.budget}/5 (${budgetLabels[planningData.budget]})
INTERESTS: ${planningData.interests.length > 0 ? planningData.interests.join(', ') : 'general tourism'}
WEATHER DATA: ${JSON.stringify(weather)}
TOP ATTRACTIONS: ${attractions.map(a => a.name).join(', ')}

## REQUIREMENTS
1. Fill ALL fields in the JSON structure above with detailed, specific content
2. Use real hotel names, restaurant names, and attraction names from the destination
3. Provide specific, actionable advice tailored to the traveler type and budget level
4. Consider weather, season, group size, and budget in ALL recommendations
5. Make recommendations bookable and practical for the specific destination
6. Include 3-5 days in itinerary based on trip duration with realistic timing
7. Provide detailed budget breakdown with realistic costs based on budget level and destination
8. Include comprehensive weather preparation items based on destination climate and current weather data
9. Create destination-specific pro tips that combine local knowledge with practical travel advice
10. Ensure all content is highly personalized to the destination, dates, and traveler preferences

Respond ONLY with valid JSON matching the structure above.`;

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
    summary: `Embark on an unforgettable ${budgetLabels[planningData.budget]} adventure to ${cityName} for ${planningData.partySize} ${planningData.partySize === 1 ? 'traveler' : 'travelers'} from ${planningData.startDate} to ${planningData.endDate}. This meticulously crafted journey combines ${cityName}'s most iconic landmarks with hidden gems and authentic local experiences. You'll discover the city's rich cultural heritage, vibrant street life, and world-renowned cuisine while immersing yourself in the local way of life. Whether you're exploring ancient temples, navigating bustling markets, or savoring street food delicacies, every moment is designed to create lasting memories.`,
    seasonal_notes: `${cityName} experiences distinct seasonal patterns that shape your travel experience. During your visit, you'll encounter ${cityName}'s characteristic climate with its unique charm. This season offers optimal conditions for outdoor exploration while providing comfortable temperatures for extended sightseeing. You'll benefit from moderate crowd levels, allowing for more intimate experiences at popular attractions. Seasonal events and local festivals may enhance your cultural immersion, while accommodation rates remain competitive. This timing ensures you can fully appreciate ${cityName}'s outdoor markets, temple visits, and street food adventures without weather-related disruptions.`,
    weather_adaptations: `Prepare for ${cityName}'s dynamic weather patterns with smart packing and flexible planning. Pack lightweight, breathable clothing for daytime exploration, with a light jacket or sweater for cooler evenings. Comfortable walking shoes are essential for navigating the city's diverse terrain. Carry a compact umbrella for unexpected rain showers, and consider a sun hat and sunscreen for protection during outdoor activities. Plan indoor activities as weather backup options, such as museum visits or shopping centers. Stay hydrated throughout the day, especially during outdoor temple visits and market explorations. Monitor local weather updates to adjust your daily itinerary accordingly.`,
    accommodation: {
      recommendations: [
        `${cityName} Central Hotel`,
        `${cityName} Boutique Inn`,
        `${cityName} Comfort Suites`
      ],
      budget_range: planningData.budget <= 2 ? "$50-100/night" : planningData.budget <= 3 ? "$100-200/night" : "$200-400/night",
      location_tips: "Book accommodations in the city center for easy access to attractions and public transportation.",
      booking_tips: "Book 2-3 months in advance for best rates and availability.",
      tips: "Choose hotels with good reviews and convenient location."
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
        transport: "Walking and public transportation",
        morning: {
          time: "9:00 AM",
          activity: "Hotel check-in and orientation",
          transport: "Taxi from airport",
          weather_consideration: "Light jacket recommended"
        },
        afternoon: {
          time: "2:00 PM",
          activity: "City center exploration",
          transport: "Walking",
          weather_consideration: "Sunscreen and hat needed"
        },
        evening: {
          time: "7:00 PM",
          activity: "Traditional dinner experience",
          transport: "Walking",
          weather_consideration: "Evening breeze, light sweater"
        },
        flow_tips: "Start with orientation to get familiar with the area",
        budget_notes: "Budget for airport transfer and first day meals"
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
        transport: "Metro and walking",
        morning: {
          time: "9:00 AM",
          activity: "Museum visits",
          transport: "Metro",
          weather_consideration: "Indoor activities if rain"
        },
        afternoon: {
          time: "2:00 PM",
          activity: "Local market shopping",
          transport: "Walking",
          weather_consideration: "Stay hydrated"
        },
        evening: {
          time: "7:00 PM",
          activity: "Fine dining experience",
          transport: "Taxi",
          weather_consideration: "Dress appropriately"
        },
        flow_tips: "Combine indoor and outdoor activities",
        budget_notes: "Allocate budget for shopping and dining"
      }
    ],
    budget_breakdown: {
      accommodation: planningData.budget <= 2 ? "$200" : planningData.budget <= 3 ? "$400" : "$800",
      food: planningData.budget <= 2 ? "$150" : planningData.budget <= 3 ? "$300" : "$600",
      activities: planningData.budget <= 2 ? "$100" : planningData.budget <= 3 ? "$200" : "$400",
      transport: "$50",
      total: planningData.budget <= 2 ? "$500" : planningData.budget <= 3 ? "$950" : "$1850"
    },
    weather_preparation: [
      "Check weather forecast before packing",
      "Bring appropriate clothing for the season",
      "Pack rain gear if needed",
      "Consider local climate patterns"
    ],
    pro_tips: [
      "Book attractions in advance to avoid long queues",
      "Use public transportation to save money",
      "Try local cuisine for authentic experiences",
      "Carry comfortable walking shoes",
      "Learn basic local phrases for better interactions"
    ]
  };
};









// Travel Advisor API functions
const searchHotels = async (cityName, checkIn, checkOut, adults = 1, budgetLevel = 3) => {
  console.log('🏨 Searching hotels with Travel Advisor API...');
  console.log('📍 Search parameters:', { cityName, checkIn, checkOut, adults, budgetLevel });
  
  // Validate city name
  if (!cityName || cityName.trim() === '') {
    console.error('❌ Invalid city name provided:', cityName);
    return generateMockHotels('Unknown City', budgetLevel);
  }
  
  try {
    // Try to get coordinates for the city using Google Maps Geocoding
    let latitude, longitude;
    
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        // Make the search more specific by adding "city" to the query
        const searchQuery = `${cityName.trim()}, city`;
        geocoder.geocode({ address: searchQuery }, (results, status) => {
          if (status === 'OK' && results.length > 0) {
            resolve(results[0]);
          } else {
            console.log('⚠️ Geocoding failed, trying fallback coordinates...');
            reject(new Error(`Geocoding failed with status: ${status}`));
          }
        });
      });

      const location = result.geometry.location;
      latitude = location.lat();
      longitude = location.lng();
      
      // Validate that we got the right city by checking the formatted address
      const formattedAddress = result.formatted_address.toLowerCase();
      const searchCity = cityName.toLowerCase().trim();
      
      console.log('📍 City coordinates from geocoding:', latitude, longitude);
      console.log('📍 Formatted address:', result.formatted_address);
      
      // Check if the geocoded result matches the searched city
      if (!formattedAddress.includes(searchCity) && !searchCity.includes(formattedAddress.split(',')[0])) {
        console.log('⚠️ Geocoding returned different city, checking fallback coordinates...');
        throw new Error('Geocoding returned wrong city');
      }
    } catch (geocodingError) {
      console.log('⚠️ Geocoding failed, using fallback coordinates for common cities...');
      
      // Fallback coordinates for common cities
      const cityCoordinates = {
        'bangkok': { lat: 13.7563, lng: 100.5018 },
        'london': { lat: 51.5074, lng: -0.1278 },
        'paris': { lat: 48.8566, lng: 2.3522 },
        'new york': { lat: 40.7128, lng: -74.0060 },
        'tokyo': { lat: 35.6762, lng: 139.6503 },
        'singapore': { lat: 1.3521, lng: 103.8198 },
        'dubai': { lat: 25.2048, lng: 55.2708 },
        'sydney': { lat: -33.8688, lng: 151.2093 },
        'mumbai': { lat: 19.0760, lng: 72.8777 },
        'delhi': { lat: 28.7041, lng: 77.1025 },
        'shanghai': { lat: 31.2304, lng: 121.4737 },
        'beijing': { lat: 39.9042, lng: 116.4074 },
        'seoul': { lat: 37.5665, lng: 126.9780 },
        'osaka': { lat: 34.6937, lng: 135.5023 },
        'kyoto': { lat: 35.0116, lng: 135.7681 },
        'pattaya': { lat: 12.9236, lng: 100.8824 },
        'phuket': { lat: 7.8804, lng: 98.3923 },
        'chiang mai': { lat: 18.7883, lng: 98.9853 },
        'krabi': { lat: 8.0863, lng: 98.9063 },
        'koh samui': { lat: 9.5120, lng: 100.0136 },
        'bali': { lat: -8.3405, lng: 115.0920 },
        'jakarta': { lat: -6.2088, lng: 106.8456 },
        'manila': { lat: 14.5995, lng: 120.9842 },
        'ho chi minh city': { lat: 10.8231, lng: 106.6297 },
        'hanoi': { lat: 21.0285, lng: 105.8542 },
        'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
        'penang': { lat: 5.4164, lng: 100.3327 },
        'hong kong': { lat: 22.3193, lng: 114.1694 },
        'taipei': { lat: 25.0330, lng: 121.5654 },
        'busan': { lat: 35.1796, lng: 129.0756 },
        'fukuoka': { lat: 33.5902, lng: 130.4017 },
        'nagoya': { lat: 35.1815, lng: 136.9066 },
        'yokohama': { lat: 35.4437, lng: 139.6380 },
        'sapporo': { lat: 43.0618, lng: 141.3545 },
        'nara': { lat: 34.6851, lng: 135.8048 },
        'kanazawa': { lat: 36.5613, lng: 136.6562 },
        'takayama': { lat: 36.1461, lng: 137.2522 },
        'hakone': { lat: 35.2324, lng: 139.1067 },
        'nikko': { lat: 36.7500, lng: 139.6167 },
        'kamakura': { lat: 35.3192, lng: 139.5467 },
        'hiroshima': { lat: 34.3853, lng: 132.4553 },
        'nagasaki': { lat: 32.7503, lng: 129.8777 },
        'okinawa': { lat: 26.2124, lng: 127.6809 },
        'kobe': { lat: 34.6901, lng: 135.1955 }
      };
      
      const normalizedCityName = cityName.toLowerCase().trim();
      
      // Try exact match first
      let coordinates = cityCoordinates[normalizedCityName];
      
      // If no exact match, try partial matches
      if (!coordinates) {
        for (const [city, coords] of Object.entries(cityCoordinates)) {
          if (normalizedCityName.includes(city) || city.includes(normalizedCityName)) {
            coordinates = coords;
            console.log('📍 Found partial match:', city, 'for search:', normalizedCityName);
            break;
          }
        }
      }
      
      if (coordinates) {
        latitude = coordinates.lat;
        longitude = coordinates.lng;
        console.log('📍 Using fallback coordinates for', cityName, ':', latitude, longitude);
      } else {
        console.log('⚠️ No fallback coordinates found for', cityName, ', using mock hotels');
        console.log('🔍 Available fallback cities:', Object.keys(cityCoordinates));
        return generateMockHotels(cityName, budgetLevel);
      }
    }

    // Search hotels using Travel Advisor API with budget filtering
    const hotels = await searchHotelsByGeocode(latitude, longitude, budgetLevel);
    
    if (hotels.length > 0) {
      console.log('✅ Travel Advisor API successful, returning', hotels.length, 'hotels');
      
      // Transform Travel Advisor data to match expected format
      const transformedHotels = hotels.map(hotel => ({
        name: hotel.name || 'Unknown Hotel',
        hotelId: hotel.location_id || hotel.hotel_id || hotel.id || Math.random().toString(36).substr(2, 9),
        rating: hotel.rating || 'N/A',
        hotelClass: hotel.hotel_class || 'N/A',
        numReviews: hotel.num_reviews || 'N/A',
        address: {
          cityName: hotel.location_string?.split(',')[0] || cityName,
          countryCode: 'Unknown',
          latitude: hotel.latitude,
          longitude: hotel.longitude
        },
        offers: [], // Travel Advisor doesn't provide pricing in this endpoint
        amenities: hotel.amenities || hotel.facilities || [],
        description: hotel.description || hotel.overview || '',
        photo: hotel.photo?.images?.original?.url || null,
        webUrl: hotel.web_url || null
      }));
      
      return transformedHotels;
    } else {
      console.log('⚠️ No hotels found from Travel Advisor API, using fallback');
      return generateMockHotels(cityName, budgetLevel);
    }
  } catch (error) {
    console.error('❌ Error searching hotels with Travel Advisor API:', error);
    console.log('🔄 Falling back to mock hotels');
    return generateMockHotels(cityName, budgetLevel);
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
  
  // Test Travel Advisor Hotel Search API
  console.log('🏨 Testing Travel Advisor Hotel Search API...');
  try {
    const hotelTest = await searchHotels('Bangkok', '2024-12-01', '2024-12-03', 2, 3); // Mid-range budget
    if (hotelTest && hotelTest.length > 0) {
      console.log('✅ Travel Advisor Hotel API Test PASSED');
      console.log('Found hotels:', hotelTest.length);
      console.log('First hotel:', hotelTest[0]);
    } else {
      console.log('❌ Travel Advisor Hotel API Test FAILED - No hotels found');
    }
  } catch (error) {
    console.error('❌ Travel Advisor Hotel API Test FAILED:', error);
  }
  
  // Test Travel Advisor API directly with different budget levels
  console.log('🏨 Testing Travel Advisor API with budget filtering...');
  try {
    // Test different budget levels
    for (let budgetLevel = 1; budgetLevel <= 5; budgetLevel++) {
      console.log(`\n💰 Testing budget level ${budgetLevel}:`);
      const directTest = await searchHotelsByGeocode(13.7563, 100.5018, budgetLevel); // Bangkok coordinates
      if (directTest && directTest.length > 0) {
        console.log(`✅ Budget level ${budgetLevel} test PASSED`);
        console.log(`Found ${directTest.length} hotels for budget level ${budgetLevel}`);
        console.log('Sample hotel:', directTest[0]);
      } else {
        console.log(`⚠️ Budget level ${budgetLevel} test - No hotels found`);
      }
    }
  } catch (error) {
    console.error('❌ Travel Advisor Direct API Test FAILED:', error);
  }
  
  console.log('🧪 API testing complete!');
};

// Dedicated Hotel API Testing Function
const testHotelAPI = async (latitude = 42.3555076, longitude = -71.0565364, budgetLevel = 3) => {
  console.log('🏨 Testing Travel Advisor Hotel API directly...');
  console.log('📍 Testing coordinates:', latitude, longitude);
  console.log('💰 Budget level:', budgetLevel);
  
  try {
    // Make direct GET request to Travel Advisor API
    const url = `https://travel-advisor.p.rapidapi.com/hotels/list-by-latlng?latitude=${latitude}&longitude=${longitude}&lang=en_US&currency=USD`;
    
    console.log('🌐 Making request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': 'dd41c3b481msh51c9e846214042ap1395aejsn98d3615f27bb',
        'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
      }
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API response received');
    console.log('📦 Response structure:', Object.keys(data));
    console.log('📦 Data array length:', data.data ? data.data.length : 'No data array');
    
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      // Return all hotels without budget filtering
      const finalHotels = data.data;
      
      console.log('✅ Hotel API Test PASSED');
      console.log(`🏨 Found ${data.data.length} total hotels (no budget filtering)`);
      
      // Log first 3 final hotels for inspection
      finalHotels.slice(0, 3).forEach((hotel, index) => {
        console.log(`🏨 Hotel ${index + 1}:`);
        console.log(`   Name: ${hotel.name || 'N/A'}`);
        console.log(`   Rating: ${hotel.rating || 'N/A'}`);
        console.log(`   Hotel Class: ${hotel.hotel_class || 'N/A'}`);
        console.log(`   Reviews: ${hotel.num_reviews || 'N/A'}`);
        console.log(`   Location: ${hotel.location_string || 'N/A'}`);
        console.log(`   Coordinates: ${hotel.latitude}, ${hotel.longitude}`);
        
        if (hotel.photo && hotel.photo.images && hotel.photo.images.original) {
          console.log(`   Photo: ${hotel.photo.images.original.url}`);
        } else {
          console.log(`   Photo: Not available`);
        }
        console.log('---');
      });
      
      return finalHotels;
    } else {
      console.log('❌ Hotel API Test FAILED - No hotels found');
      console.log('📦 Full response:', JSON.stringify(data, null, 2));
      return [];
    }
  } catch (error) {
    console.error('❌ Hotel API Test FAILED:', error);
    return [];
  }
};

// Test different cities with their coordinates
const testMultipleCities = async () => {
  console.log('🌍 Testing multiple cities...');
  
  const testCities = [
    { name: 'Boston', lat: 42.3555076, lng: -71.0565364 },
    { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 }
  ];
  
  for (const city of testCities) {
    console.log(`\n🏨 Testing ${city.name}...`);
    const hotels = await testHotelAPI(city.lat, city.lng);
    console.log(`${city.name}: ${hotels.length} hotels found`);
  }
  
  console.log('\n🌍 Multiple cities test complete!');
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

// Add hotel markers to map
const addHotelMarkersToMap = (hotels, mapInstance, existingMarkers, setMarkers) => {
  if (!mapInstance || !hotels || hotels.length === 0) return;
  
  console.log('📍 Adding hotel markers to map:', hotels.length, 'hotels');
  
  // Clear existing markers
  existingMarkers.forEach(marker => marker.setMap(null));
  
  const newMarkers = [];
  
  hotels.forEach((hotel, index) => {
    if (hotel.address && hotel.address.latitude && hotel.address.longitude) {
      const position = {
        lat: parseFloat(hotel.address.latitude),
        lng: parseFloat(hotel.address.longitude)
      };
      
      const marker = new window.google.maps.Marker({
        position: position,
        map: mapInstance,
        title: hotel.name,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/hotel.png',
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });
      
      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 250px;">
            <h3 style="margin: 0 0 5px 0; color: #333;">${hotel.name}</h3>
            <p style="margin: 0 0 5px 0; color: #666;">⭐ ${hotel.rating}</p>
            ${hotel.offers && hotel.offers.length > 0 ? 
              `<p style="margin: 0; color: #28a745; font-weight: bold;">
                From ${hotel.offers[0].price?.currency} ${hotel.offers[0].price?.total}
              </p>` : ''
            }
          </div>
        `
      });
      
      marker.addListener('click', () => {
        infoWindow.open(mapInstance, marker);
      });
      
      newMarkers.push(marker);
    }
  });
  
  setMarkers(newMarkers);
  console.log('✅ Added', newMarkers.length, 'hotel markers to map');
};

// Make testing functions available globally for easy console access
window.testHotelAPI = testHotelAPI;
window.testMultipleCities = testMultipleCities;
window.testAPIs = testAPIs;

console.log('🧪 Testing functions available in console:');
console.log('  - testHotelAPI(lat, lng, budgetLevel) - Test specific coordinates with budget filtering');
console.log('  - testMultipleCities() - Test multiple cities');
console.log('  - testAPIs() - Test all APIs');
console.log('  - testGeocoding(city) - Test geocoding for a specific city');

// Test geocoding function
window.testGeocoding = async (cityName) => {
  console.log('🧪 Testing geocoding for:', cityName);
  
  try {
    const geocoder = new window.google.maps.Geocoder();
    const result = await new Promise((resolve, reject) => {
      const searchQuery = `${cityName.trim()}, city`;
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === 'OK' && results.length > 0) {
          resolve(results[0]);
        } else {
          reject(new Error(`Geocoding failed with status: ${status}`));
        }
      });
    });

    const location = result.geometry.location;
    console.log('✅ Geocoding successful');
    console.log('📍 Coordinates:', location.lat(), location.lng());
    console.log('📍 Formatted address:', result.formatted_address);
    console.log('📍 Place ID:', result.place_id);
    
    return {
      lat: location.lat(),
      lng: location.lng(),
      address: result.formatted_address
    };
  } catch (error) {
    console.error('❌ Geocoding failed:', error);
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
  const [hotelMarkers, setHotelMarkers] = useState([]);
  
  // Chatbot state
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showChatNotification, setShowChatNotification] = useState(false);
  
  // Trip data for Kumo
  const [currentTripData, setCurrentTripData] = useState(null);
  
  // Plan adjustment state
  const [planAdjustment, setPlanAdjustment] = useState('');
  const [isAdjustingPlan, setIsAdjustingPlan] = useState(false);
  
  // Extra Info collapsible panels state

  
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



  // Hotel API Test Module state
  const [testCity, setTestCity] = useState('Bangkok');
  const [testHotels, setTestHotels] = useState([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [testApiSuccess, setTestApiSuccess] = useState(false);

  // 5 city options with lat/lng
  const testCities = [
    { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'London', lat: 51.5074, lng: -0.1278 }
  ];

  // Hotel API test handler
  const handleTestHotelAPI = async () => {
    setTestLoading(true);
    setTestError('');
    setTestHotels([]);
    const city = testCities.find(c => c.name === testCity);
    if (!city) {
      setTestError('Invalid city selection');
      setTestLoading(false);
      return;
    }
    try {
      const url = `https://travel-advisor.p.rapidapi.com/hotels/list-by-latlng?latitude=${city.lat}&longitude=${city.lng}&lang=en_US&currency=USD&distance=10&limit=30`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': 'dd41c3b481msh51c9e846214042ap1395aejsn98d3615f27bb',
          'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
        }
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      let hotels = [];
      if (data.data && Array.isArray(data.data)) hotels = data.data;
      else if (data.results && Array.isArray(data.results)) hotels = data.results;
      else if (data.hotels && Array.isArray(data.hotels)) hotels = data.hotels;
      else if (Array.isArray(data)) hotels = data;
      setTestHotels(hotels);
      // Show API response success message
      setTestApiSuccess(true);
      setTimeout(() => setTestApiSuccess(false), 3000); // Hide after 3 seconds
    } catch (err) {
      setTestError('Failed to fetch hotels: ' + err.message);
    }
    setTestLoading(false);
  };

  return (
    <div className="App">
      <div className="hero-section">
        <TextType 
          text="WanderWise"
          as="h1"
          typingSpeed={100}
          initialDelay={500}
          showCursor={true}
          cursorCharacter="|"
          className="hero-title"
        />
        <TextType 
          text="We plan your trip"
          as="p"
          className="tagline"
          typingSpeed={80}
          initialDelay={2000}
          showCursor={true}
          cursorCharacter="|"
        />
        <TextType 
          text="AI-powered travel planning powered by kumo"
          as="p"
          className="subtitle"
          typingSpeed={60}
          initialDelay={3500}
          showCursor={true}
          cursorCharacter="|"
        />
        
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
            marginBottom: '10px',
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
                <div className="planning-card interests-card">
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
                <div className="planning-card ready-to-plan-card">
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
                        
                        // Show chat button notification instead of auto-opening
                        setShowChatNotification(true);
                        
                        // Generate extra info for the city
                
                        
                        // Search for hotels after plan generation
                        console.log('🏨 Searching for hotels...');
                        
                        // Set default dates if empty - use current date or handle future dates
                        const today = new Date();
                        const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
                        
                        let startDate = planningData.startDate;
                        let endDate = planningData.endDate;
                        
                        // If no dates provided, use current date + 1 day
                        if (!startDate) {
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          startDate = tomorrow.toISOString().split('T')[0];
                        }
                        
                        if (!endDate) {
                          const dayAfterTomorrow = new Date(today);
                          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
                          endDate = dayAfterTomorrow.toISOString().split('T')[0];
                        }
                        
                        // Check if dates are too far in the future (more than 1 year)
                        const startDateObj = new Date(startDate);
                        const endDateObj = new Date(endDate);
                        const oneYearFromNow = new Date(today);
                        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                        
                        if (startDateObj > oneYearFromNow || endDateObj > oneYearFromNow) {
                          console.log('⚠️ Dates too far in future, using current date for pricing estimates');
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          startDate = tomorrow.toISOString().split('T')[0];
                          
                          const dayAfterTomorrow = new Date(today);
                          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
                          endDate = dayAfterTomorrow.toISOString().split('T')[0];
                        }
                        
                        console.log('📅 Date format check:', {
                          startDate: startDate,
                          endDate: endDate,
                          format: 'YYYY-MM-DD'
                        });
                        
                        // Only search for hotels if we have valid dates and a selected city
                        let hotelResults = [];
                        const cityToSearch = selectedCity || destination;
                        
                        if (startDate && endDate && cityToSearch) {
                          console.log('🏨 Searching hotels for:', cityToSearch, 'with dates:', startDate, 'to', endDate);
                          setIsSearchingHotels(true);
                          hotelResults = await searchHotels(cityToSearch, startDate, endDate, planningData.partySize, planningData.budget);
                          setHotels(hotelResults);
                        } else {
                          console.log('⚠️ Skipping hotel search - missing data:', {
                            startDate: startDate,
                            endDate: endDate,
                            cityToSearch: cityToSearch
                          });
                        }
                        
                        setPlanLoading(false);
                      } catch (error) {
                        console.error('❌ Error generating custom plan:', error);
                        setPlanLoading(false);
                      }
                    }}
                    disabled={planLoading}
                  >
                    <div className="plan-btn-content">
                      {!planLoading ? (
                        <>
                          <img src="/kumo.png" alt="Kumo" className="plan-btn-kumo" />
                          <div className="plan-btn-text">
                            <span className="plan-btn-title">Send Kumo to work</span>
                            <span className="plan-btn-subtitle">Generate your custom travel plan</span>
                          </div>
                        </>
                      ) : (
                        <div className="kumo-loading">
                          <div className="loading-container">
                            <div className="progress-bar">
                              <div className="progress-fill"></div>
                              <div className="kumo-progress">
                                <img src="/kumoloading.png" alt="Kumo" className="kumo-progress-img" />
                              </div>
                            </div>
                            <p className="loading-text">🐾 Kumo is crafting your perfect plan...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Custom Plan Page */}
        {showCustomPlan && customPlan && (
          <div className="custom-plan-section">
            <h2>
              <img src="/kumoloading.png" alt="Kumo" style={{width: '180px', height: '120px', marginRight: '20px', verticalAlign: 'middle'}} />
              Kumo says....
            </h2>
            

            
            <div className="plan-summary">
              <h3>📋 Trip Overview</h3>
              <div className="overview-content">
                <div className="overview-main">
                  <p className="trip-summary">{customPlan.summary}</p>
                </div>
                
                <div className="overview-details">
                  {customPlan.seasonal_notes && (
                    <div className="seasonal-notes">
                      <h4>📅 Seasonal Context</h4>
                      <p>{customPlan.seasonal_notes}</p>
                    </div>
                  )}
                  
                  {customPlan.weather_adaptations && (
                    <div className="weather-adaptations">
                      <h4>🌤️ Weather Preparation</h4>
                      <p>{customPlan.weather_adaptations}</p>
                    </div>
                  )}
                </div>
              </div>
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
                        {/* Hotel Image */}
                        {hotel.photo && (
                          <div className="hotel-image-container">
                            <img 
                              src={hotel.photo} 
                              alt={hotel.name}
                              className="hotel-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="hotel-image-placeholder" style={{display: 'none'}}>
                              🏨
                            </div>
                          </div>
                        )}
                        
                        <div className="hotel-content">
                          <div className="hotel-header">
                            <h4>{hotel.name}</h4>
                            {hotel.rating !== 'N/A' && (
                              <span className="hotel-rating">⭐ {hotel.rating}</span>
                            )}
                          </div>
                          
                          {hotel.hotelClass && hotel.hotelClass !== 'N/A' && (
                            <p className="hotel-class">🏆 {hotel.hotelClass}-star hotel</p>
                          )}
                          
                          {hotel.numReviews && hotel.numReviews !== 'N/A' && (
                            <p className="hotel-reviews">📝 {hotel.numReviews} reviews</p>
                          )}
                          
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
                              {hotel.dateNote && (
                                <p className="date-note">📅 {hotel.dateNote}</p>
                              )}
                            </div>
                          )}
                          
                          <div className="hotel-actions">
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
                            
                            {hotel.webUrl && (
                              <a 
                                href={hotel.webUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="view-details-btn"
                              >
                                🔗 View Details
                              </a>
                            )}
                          </div>
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
                      {day.meals && (
                        <div className="meals">
                          <h5>🍽️ Meals</h5>
                          <div className="meal-times">
                            <span><strong>Breakfast:</strong> {day.meals.breakfast || 'Not specified'}</span>
                            <span><strong>Lunch:</strong> {day.meals.lunch || 'Not specified'}</span>
                            <span><strong>Dinner:</strong> {day.meals.dinner || 'Not specified'}</span>
                          </div>
                        </div>
                      )}
                      
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
              {customPlan.budget_breakdown && (
                <div className="plan-card budget-card">
                  <h3>💰 Budget Breakdown</h3>
                  <div className="budget-items">
                    <div className="budget-item">
                      <span>Accommodation:</span>
                      <span>{customPlan.budget_breakdown.accommodation || 'Not specified'}</span>
                    </div>
                    <div className="budget-item">
                      <span>Food:</span>
                      <span>{customPlan.budget_breakdown.food || 'Not specified'}</span>
                    </div>
                    <div className="budget-item">
                      <span>Activities:</span>
                      <span>{customPlan.budget_breakdown.activities || 'Not specified'}</span>
                    </div>
                    <div className="budget-item">
                      <span>Transport:</span>
                      <span>{customPlan.budget_breakdown.transport || 'Not specified'}</span>
                    </div>
                    <div className="budget-item total">
                      <span>Total:</span>
                      <span>{customPlan.budget_breakdown.total || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              )}
              
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
                        <img src="/kumoloading.png" alt="Kumo" className="kumo-progress-img" />
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
                        <img src="/kumoloading.png" alt="Kumo" className="kumo-progress-img" />
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
          onClick={() => {
            setIsChatbotOpen(true);
            setShowChatNotification(false);
          }}
          isActive={isChatbotOpen}
          showNotification={showChatNotification}
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

      {/* Hotel API Test Module */}
      <div className="hotel-search-card hotel-test-module">
        <div className="hotel-test-header">
          <h2>🧪 Hotel API Test</h2>
          <p className="hotel-test-desc">Check real hotel data for a city (10km radius, no budget filter)</p>
        </div>
        
        <div className="hotel-test-controls">
          <div className="hotel-test-input-group">
            <label htmlFor="test-city-select">Select City:</label>
            <select id="test-city-select" className="hotel-test-select" value={testCity} onChange={e => setTestCity(e.target.value)}>
              {testCities.map(city => (
                <option key={city.name} value={city.name}>{city.name}</option>
              ))}
            </select>
          </div>
          
          <div className="hotel-test-actions">
            <button className="hotel-test-btn" onClick={handleTestHotelAPI} disabled={testLoading}>
              {testLoading ? '🔍 Searching...' : '🔍 Test API'}
            </button>
            {testHotels.length > 0 && (
              <button className="hotel-test-clear-btn" onClick={() => setTestHotels([])}>
                🗑️ Clear
              </button>
            )}
          </div>
        </div>
        
        {/* Status Indicators */}
        {testLoading && (
          <div className="hotel-test-status loading">
            <span className="status-icon">⏳</span>
            <span>Searching for hotels in {testCity}...</span>
          </div>
        )}
        
        {testApiSuccess && (
          <div className="hotel-test-status success">
            <span className="status-icon">✅</span>
            <span>API response received</span>
          </div>
        )}
        
        {testError && (
          <div className="hotel-test-status error">
            <span className="status-icon">❌</span>
            <span>{testError}</span>
          </div>
        )}
        
        {!testLoading && testHotels.length > 0 && (
          <div className="hotel-test-status success">
            <span className="status-icon">✅</span>
            <span>Found {testHotels.length} hotels in {testCity}</span>
          </div>
        )}
        
        {/* Results Section */}
        {!testLoading && testHotels.length > 0 && (
          <div className="hotel-test-results">
            <div className="hotel-test-results-header">
              <h3>🏨 Hotel Results</h3>
              <span className="hotel-count">{testHotels.length} hotels found</span>
            </div>
            
            <div className="hotel-test-grid">
              {testHotels.map((hotel, idx) => (
                <div key={hotel.location_id || hotel.id || idx} className="hotel-test-card">
                  <div className="hotel-test-card-image">
                    <img 
                      src={hotel.photo?.images?.small?.url || hotel.photo?.images?.original?.url || 'https://via.placeholder.com/200x150?text=No+Image'} 
                      alt={hotel.name} 
                      className="hotel-test-card-img"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200x150?text=No+Image';
                      }}
                    />
                    {hotel.hotel_class && (
                      <div className="hotel-class-badge">
                        {hotel.hotel_class}★
                      </div>
                    )}
                  </div>
                  
                  <div className="hotel-test-card-content">
                    <h4 className="hotel-test-card-name">{hotel.name || 'Unnamed Hotel'}</h4>
                    
                    <div className="hotel-test-card-meta">
                      {hotel.rating && (
                        <span className="hotel-rating">
                          ⭐ {hotel.rating}/5
                        </span>
                      )}
                      {hotel.num_reviews && (
                        <span className="hotel-reviews">
                          📝 {hotel.num_reviews} reviews
                        </span>
                      )}
                    </div>
                    
                    {hotel.location_string && (
                      <p className="hotel-test-card-location">
                        📍 {hotel.location_string}
                      </p>
                    )}
                    
                    {hotel.description && (
                      <p className="hotel-test-card-desc">
                        {hotel.description.length > 100 ? hotel.description.substring(0, 100) + '...' : hotel.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!testLoading && testHotels.length === 0 && testError === '' && (
          <div className="hotel-test-empty">
            <div className="empty-icon">🏨</div>
            <p>No hotels found. Try a different city or check the API status.</p>
          </div>
        )}
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
