# Kumo Chatbot Setup Guide

## Overview
Kumo is a cute, cloud-themed red panda travel companion that helps users plan their trips with personalized recommendations. The chatbot integrates with your existing travel app to provide context-aware assistance.

## Features
- 🤖 AI-powered travel recommendations
- 🐾 Friendly red panda mascot personality
- 💬 Real-time chat interface
- 📊 Context-aware responses (hotels, attractions, weather)
- 🎯 Trip data integration (no need to repeat preferences)
- 💾 MongoDB chat history storage
- 🎨 Modern, responsive UI

## Setup Instructions

### 1. Install Dependencies

First, install the new dependencies for the server:

```bash
cd travel-ai
npm install --save-dev nodemon
```

Then install server dependencies:
```bash
npm install mongodb openai dotenv
```

### 2. Configuration

The chatbot is configured to use:
- **MongoDB Atlas**: `mongodb+srv://winvarit:12345@cluster0.uhgsfzc.mongodb.net/`
- **Database**: `Kumo`
- **Collection**: `chats`

To complete the setup, update the OpenAI API key in `server.js`:
```javascript
const openai = new OpenAI({
  apiKey: 'your-actual-openai-api-key-here' // Replace with your OpenAI API key
});
```

### 3. MongoDB Setup

The chatbot is configured to use MongoDB Atlas with the following settings:
- **Connection String**: `mongodb+srv://winvarit:12345@cluster0.uhgsfzc.mongodb.net/`
- **Database**: `Kumo`
- **Collection**: `chats`

The app will automatically create the database and collection if they don't exist.

### 4. Start the Application

#### Terminal 1 - Start the Express Server:
```bash
cd travel-ai
node server.js
```

#### Terminal 2 - Start the React App:
```bash
cd travel-ai
npm start
```

### 5. Usage

1. Open your travel app in the browser
2. Look for the floating red panda button (🐾) in the bottom-right corner
3. Click the button to open the Kumo chatbot
4. Start chatting with Kumo about your travel plans!

## API Endpoints

The chatbot adds these new endpoints to your Express server:

- `POST /api/chat/init` - Initialize a new chat session
- `POST /api/chat/message` - Send a message to Kumo
- `GET /api/chat/history/:sessionId` - Get chat history

## Database Schema

Chat sessions are stored in MongoDB with this structure:

```javascript
{
  sessionId: "session_timestamp_random",
  userId: "user_id",
  messages: [
    {
      role: "system|user|assistant",
      content: "message content",
      timestamp: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## Customization

### System Prompt
You can modify Kumo's personality by editing the `KUMO_SYSTEM_PROMPT` in `server.js`.

### UI Styling
The chatbot UI can be customized by editing:
- `src/components/KumoChatbot.css`
- `src/components/ChatButton.css`

### Context Integration
The chatbot receives context about:
- Available hotels
- Local attractions
- Weather data
- Selected city
- **Trip planning data** (destination, dates, party size, budget, interests)

This allows Kumo to provide personalized recommendations without asking for information the user has already provided.

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Verify the MongoDB Atlas connection string is correct
   - Check network connectivity to MongoDB Atlas
   - Ensure the database and collection exist (they will be created automatically)

2. **OpenAI API Errors**
   - Verify your API key is correct
   - Check your OpenAI account has sufficient credits
   - Ensure the API key has the correct permissions

3. **Chatbot Not Opening**
   - Check browser console for JavaScript errors
   - Verify all components are properly imported
   - Ensure the server is running on port 3001

4. **Messages Not Sending**
   - Check network connectivity
   - Verify server is running
   - Check browser console for CORS errors

## Development

### Adding New Features:
1. Extend the context object in `App.js`
2. Update the system prompt to handle new data types
3. Add new API endpoints if needed
4. Update the UI components as required

### Testing:
- Test with different group sizes and budgets
- Verify context integration works correctly
- Test error handling and fallbacks
- Check responsive design on mobile devices

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your OpenAI API key is set in server.js
3. Ensure MongoDB Atlas is accessible
4. Test the API endpoints directly with Postman or curl

Happy travels with Kumo! 🐾✨ 