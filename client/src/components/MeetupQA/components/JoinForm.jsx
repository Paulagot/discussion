import React, { useState, useEffect } from 'react';

const JoinForm = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // useEffect(() => {
  //   console.log("JoinForm mounted");
  // }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // console.log("Join form submitted with:", { name, code });
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!code.trim()) {
      setError('Please enter the session code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // console.log("Calling onJoin with:", name, code);
      const success = await onJoin(name, code);
      // console.log("onJoin result:", success);
      
      if (success === false) {
        setError('Invalid session code. Please check and try again.');
      }
    } catch (err) {
      console.error("Join error:", err);
      if (err.message === 'Name already taken in this session') {
        setError('That name is already taken. Please choose a different name.');
      } else if (err.message === 'Invalid session code') {
        setError('Invalid session code. Please check and try again.');
      } else {
        setError('Failed to join the session. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="join-form">
      <h2>Join Q&A Session</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          required
        />
        
        <input
          type="text"
          placeholder="Session Code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={isLoading}
          required
        />
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Joining...' : 'Join Session'}
        </button>
      </form>
    </div>
  );
};

export default JoinForm;
