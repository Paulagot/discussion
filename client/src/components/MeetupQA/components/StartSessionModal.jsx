// StartSessionModal.jsx
import React, { useState } from 'react';

const StartSessionModal = ({ onStart }) => {
  const [isStarting, setIsStarting] = useState(false);
  
  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStart();
    } catch (err) {
      console.error("Error starting session:", err);
      setIsStarting(false);
    }
  };
  
  return (
    <div className="start-session-modal">
      <div className="modal-content">
        <h2>Start Q&A Session</h2>
        <p>
          As an administrator, you can start a new Q&A session. 
          Once started, you'll receive a unique session code that 
          participants can use to join.
        </p>
        
        <button 
          type="button"
          className="start-session-button"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? 'Starting...' : 'Start Session'}
        </button>
      </div>
    </div>
  );
};

export default StartSessionModal;