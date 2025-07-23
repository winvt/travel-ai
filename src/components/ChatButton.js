import React from 'react';
import './ChatButton.css';

const ChatButton = ({ onClick, isActive }) => {
  return (
    <button 
      className={`chat-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title="Chat with Kumo"
    >
      <div className="chat-button-icon">
        <div className="kumo-panda-icon">🐾</div>
      </div>
      <div className="chat-button-pulse"></div>
    </button>
  );
};

export default ChatButton; 