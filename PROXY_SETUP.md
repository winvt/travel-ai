# 🚀 Amadeus API Proxy Server Setup

This setup allows you to get **real hotel data** from Amadeus API by bypassing CORS restrictions.

## 📋 Prerequisites

- Node.js installed
- Amadeus API credentials (already configured)

## 🛠️ Setup Instructions

### Option 1: Quick Setup (Windows)
```bash
# Run the setup script
setup-proxy.bat
```

### Option 2: Manual Setup
```bash
# Install proxy server dependencies
npm install express cors node-fetch

# Start the proxy server
node server.js
```

## 🚀 Running the Application

### Step 1: Start Proxy Server
```bash
node server.js
```
You should see: `🚀 Proxy server running on http://localhost:3001`

### Step 2: Start React App
```bash
npm start
```
Your React app will run on `http://localhost:3000`

## 🔧 How It Works

1. **Proxy Server** (Port 3001)
   - Handles Amadeus API calls server-side
   - Bypasses CORS restrictions
   - Manages OAuth2 token caching
   - Provides REST endpoints for hotel/city search

2. **React App** (Port 3000)
   - Calls proxy server instead of Amadeus directly
   - Falls back to mock data if proxy is unavailable
   - No CORS issues

## 📡 API Endpoints

- `GET /api/hotels` - Search hotels by city code
- `GET /api/cities` - Search cities by keyword
- `GET /api/airports` - Search airports by keyword

## 🎯 Benefits

✅ **Real Amadeus Data** - Live hotel information  
✅ **No CORS Issues** - Server-side API calls  
✅ **Graceful Fallback** - Mock data if proxy unavailable  
✅ **Token Management** - Automatic OAuth2 handling  
✅ **Error Handling** - Proper error responses  

## 🔍 Testing

1. Start both servers
2. Search for "London" or "Bangkok"
3. Check console for real data messages
4. Hotels should appear on the map

## 🐛 Troubleshooting

**Proxy server not starting:**
- Check if port 3001 is available
- Install dependencies: `npm install express cors node-fetch`

**No real data showing:**
- Ensure proxy server is running on port 3001
- Check console for proxy connection messages
- Verify Amadeus credentials are correct

**CORS errors:**
- Proxy server should handle this automatically
- Check that proxy is running before React app 