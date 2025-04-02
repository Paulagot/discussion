// components/ErrorState.jsx
import React from 'react';

const ErrorState = ({ error, isAdmin, onStartNewSession }) => {
  return (
    <div className="meetup-qa-error">
      <h2>Error</h2>
      <p>{error}</p>
      {isAdmin && (
        <button  type="button" onClick={onStartNewSession}>Start New Session</button>
      )}
    </div>
  );
};

export default ErrorState;