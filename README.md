# WanderWise - AI-Powered Travel Planning

We plan your trip with AI-powered insights and real-time data.

## 🌟 Features

- **Real-time Weather Data** - Current conditions and 5-day forecasts
- **Historical Weather Integration** - Uses historical data for future travel dates
- **Google Maps Integration** - Real attractions and landmarks
- **AI-Powered Planning** - Personalized itineraries based on traveler type, dates, and weather
- **Custom Planning** - Date selection, party size, budget, and traveler type
- **Seasonal Planning** - Considers local events and tourism patterns
- **Weather-Adaptive Activities** - Indoor alternatives and weather-appropriate suggestions
- **Interactive Maps** - Dynamic location-based mapping
- **Responsive Design** - Works on all devices

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd travel-ai
npm install
```

### 2. Set Up API Keys

Create a `.env` file in the root directory:

```env
REACT_APP_OPENAI_API_KEY=your-openai-api-key-here
REACT_APP_AMADEUS_CLIENT_SECRET=your-amadeus-client-secret-here
```

#### Getting API Keys:

**OpenAI API Key:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Add it to your `.env` file

**Amadeus API (Optional):**
1. Go to [Amadeus for Developers](https://developers.amadeus.com/)
2. Create an account and get your client ID and client secret
3. Add the client secret to your `.env` file
4. The client ID is already configured in the code

**Weather Data:**
- Uses [Open-Meteo](https://open-meteo.com/) API
- **Completely free** - no account required
- **No API key needed** - just works out of the box
- High-quality weather data from multiple sources

**Hotel & Flight Data:**
- Uses [Amadeus API](https://developers.amadeus.com/) for real hotel and flight search
- **OAuth2 Authentication** - Requires client ID and client secret
- **Hotel search** with availability, pricing, and room types
- **Flight search** with multiple airlines and routes
- **Travel insights** and destination information

### 3. Run the App
```bash
npm start
```

## 🔧 API Integration

### Weather Data
- **Primary**: Open-Meteo API (real-time data)
- **Fallback**: AI-generated weather (if API fails)
- **Features**: Current weather, 5-day forecast, humidity, wind speed
- **Free**: No account or API key required

### Hotel & Flight Data
- **Primary**: Amadeus API (real hotel and flight data)
- **Features**: Hotel search with availability, pricing, room types
- **Flight search**: Multiple airlines, routes, and pricing
- **Travel insights**: Destination information and recommendations

### Attractions
- **Primary**: Google Maps Places API (real attractions)
- **Fallback**: AI-generated attractions (if API fails)
- **Features**: Top-rated attractions with ratings and descriptions

### Travel Planning
- **AI Model**: GPT-4o (enhanced reasoning and planning)
- **Features**: Personalized itineraries based on traveler type, dates, and weather
- **Customization**: Dates, party size, budget, traveler type
- **Seasonal Planning**: Historical weather data and seasonal tourism patterns
- **Weather Integration**: Weather-adaptive activities and indoor alternatives

## 🎯 Traveler Types

- **👤 Single**: Solo adventurer experiences
- **💑 Couple**: Romantic getaway planning
- **👨‍👩‍👧‍👦 Family**: Kid-friendly activities
- **👥 Group**: Friends & fun experiences

## 💰 Budget Levels

- **$**: Budget/Backpacker
- **$$**: Economy
- **$$$**: Mid-range
- **$$$$**: Luxury
- **$$$$$**: Ultra-luxury

## 🛠️ Technologies Used

- **React.js** - Frontend framework
- **Google Maps API** - Maps and Places
- **Open-Meteo API** - Real-time weather data (free)
- **Amadeus API** - Hotel and flight search
- **OpenAI API** - AI-powered content generation
- **CSS3** - Styling and animations

## 🌍 Supported Destinations

Works with any city worldwide! The app uses:
- **Google Maps Geocoding** for location accuracy
- **Open-Meteo** for global weather data (free)
- **Google Places API** for local attractions

## 🎨 Customization

The app is highly customizable:
- **API Keys**: Easy to configure
- **Styling**: Modern glassmorphism design
- **Features**: Modular component structure
- **Responsive**: Mobile-first design

## 📱 Mobile Responsive

Fully responsive design that works on:
- 📱 Mobile phones
- 📱 Tablets
- 💻 Desktop computers

## 🔄 Fallback System

The app has robust fallback mechanisms:
1. **Real weather data** → AI-generated weather → Mock data
2. **Google Places attractions** → AI-generated attractions → Mock data
3. **OpenAI responses** → Mock data

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Traveling! ✈️🌍**
