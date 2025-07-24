import React, { useState, useEffect, useRef } from 'react';
import './KumoChatbot.css';

const KumoChatbot = ({ isOpen, onClose, context }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeChat();
    }
  }, [isOpen, isInitialized]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      
      // Create personalized welcome message if trip data is available
      let welcomeMessage = "Hi there! I'm Kumo, your cloud-themed red panda travel companion! 🐾✨ I'm here to help you plan the perfect trip. To get started, could you tell me:\n\n• How many people are traveling?\n• What's your budget level (1-5, where 1 is budget-friendly and 5 is luxury)?\n• What are your main interests (culture, food, adventure, relaxation, etc.)?\n• Where would you like to go?\n\nLet's make your travel dreams come true! 🌤️";
      
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
      
      setMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get OpenAI API key from environment
      const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
        throw new Error('OpenAI API key not configured');
      }

      // Create conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add trip context if available
      let systemPrompt = "You are Kumo, a friendly and knowledgeable cloud-themed red panda travel companion. You help travelers plan their trips with personalized advice, recommendations, and travel tips. Be warm, enthusiastic, and helpful. Use emojis occasionally to keep the conversation friendly.";
      
      if (context && context.tripData) {
        const trip = context.tripData;
        systemPrompt += `\n\nCurrent trip context:
- Destination: ${trip.city}
- Travelers: ${trip.planningData.partySize} people
- Dates: ${trip.planningData.startDate} to ${trip.planningData.endDate}
- Budget: Level ${trip.planningData.budget}/5
- Traveler Type: ${trip.planningData.travelerType}
- Interests: ${trip.planningData.interests.join(', ')}

Use this context to provide personalized recommendations.`;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            ...conversationHistory,
            {
              role: 'user',
              content: currentInput
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.choices[0].message.content,
          timestamp: new Date()
        }]);
      } else {
        throw new Error('Invalid response from OpenAI');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry! I'm having trouble connecting right now. Please try again in a moment! 🌤️",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="kumo-chatbot-overlay">
      <div className="kumo-chatbot-container">
        {/* Header */}
        <div className="kumo-chatbot-header">
          <div className="kumo-avatar">
            <img src="/Kumo.png" alt="Kumo" className="kumo-profile-pic" />
          </div>
          <div className="kumo-header-text">
            <h3>Kumo</h3>
            <p>Your Travel Companion</p>
          </div>
          <button className="kumo-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="kumo-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`kumo-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              {message.role === 'assistant' && (
                <div className="kumo-avatar-small">
                  <img src="/Kumo.png" alt="Kumo" className="kumo-profile-pic-small" />
                </div>
              )}
              <div className="message-content">
                {formatMessage(message.content)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="kumo-message assistant-message">
              <div className="kumo-avatar-small">
                <img src="/Kumo.png" alt="Kumo" className="kumo-profile-pic-small" />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="kumo-input-container">
          <textarea
            className="kumo-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Kumo about your travel plans..."
            disabled={isLoading}
            rows="1"
          />
          <button
            className="kumo-send-btn"
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            ✈️
          </button>
        </div>
      </div>
    </div>
  );
};

export default KumoChatbot; 