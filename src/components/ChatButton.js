import React from 'react';
import './ChatButton.css';

const ChatButton = ({ onClick, isActive, showNotification }) => {
  return (
    <div className="chat-button-wrapper">
      <button 
        className={`chat-button ${isActive ? 'active' : ''}`}
        onClick={onClick}
        title="Chat with Kumo"
      >
        <div className="chat-button-icon">
          <img src="/Kumo.png" alt="Kumo" className="kumo-chat-icon" />
        </div>
        <div className="chat-button-pulse"></div>
      </button>
      
      {/* Notification text bubble */}
      {showNotification && (
        <div className="chat-notification">
          <div className="notification-bubble">
            <span>💬 Talk to Kumo!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatButton; 