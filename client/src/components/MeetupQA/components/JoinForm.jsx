import React, { useState, useEffect } from 'react';
import { submitEmailForNotification } from '../api'; // We'll add this API function

const JoinForm = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState(''); // New state for email
  const [error, setError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(''); // To show success message
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
      const success = await onJoin(name, code);
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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailSuccess('');
    setError('');

    if (!email.trim()) {
      setError('Please enter your email to sign up for notifications.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      await submitEmailForNotification(email);
      setEmailSuccess('Thanks for signing up! We’ll notify you when MindsLive launches.');
      setEmail(''); // Clear the email field
    } catch (err) {
      console.error("Email submission error:", err);
      setError('Failed to sign up. Please try again.');
    }
  };

  return (
    <div className="outer-join-form">
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

    {/* Email Signup Section */}
    {emailSuccess && <div className="success-message">{emailSuccess}</div>}
    <div className="email-signup">
    <h2>Host Your Own MindsLive Session!</h2>
    <p>Sign up to be notified when we’re out of beta</p>
    <form onSubmit={handleEmailSubmit}>
      <input
        type="email"
        placeholder="Your Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit">Submit</button>
    </form>
  </div>
  </div>
  );
};

export default JoinForm;
