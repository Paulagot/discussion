// TimeExtensionVote.jsx - Fixed version
import React, { useState, useEffect } from 'react';

const TimeExtensionVote = ({ onVote, onResolve, votes, totalParticipants, hasVoted }) => {
  const [isClosing, setIsClosing] = useState(false);
  const safeVotes = votes || { yes: 0, no: 0 };
  const totalVotes = safeVotes.yes + safeVotes.no;
  const yesPercentage = totalVotes > 0 ? (safeVotes.yes / totalVotes) * 100 : 0;

  useEffect(() => {
    let closeTimeout;
    if (hasVoted && !onResolve && !isClosing) { // Non-admin, first vote
      // console.log("User voted, scheduling modal close in 2 seconds");
      setIsClosing(true);
      closeTimeout = setTimeout(() => {
        // console.log("Closing modal after user vote");
        onVote('close');
      }, 2000);
    }
    return () => {
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  }, [hasVoted, onResolve, onVote, isClosing]);

  const handleVote = (vote) => {
    if (vote === 'close') {
      // console.log("Closing time vote modal");
      onVote('close');
      return;
    }
    if (!hasVoted && !isClosing) {
      // console.log("User submitting vote:", vote);
      onVote(vote);
    }
  };

  const handleAddMoreTime = () => {
    // console.log("Admin chose to continue with question");
    onResolve(true);
  };

  const handleMoveOn = () => {
    // console.log("Admin chose to move to next question");
    onResolve(false);
  };

  // console.log("TimeExtensionVote render:", { hasVoted, isClosing, onResolve });

  return (
    <div className="time-extension-vote">
      <div className="time-vote-modal">
        <h3>Time's Up!</h3>
        <p>Would you like more time for this question?</p>

        {!hasVoted && !onResolve && !isClosing && (
          <div className="time-vote-options">
            <button type="button" className="time-vote-button yes-button" onClick={() => handleVote('yes')}>
              Yes, more time
            </button>
            <button type="button" className="time-vote-button no-button" onClick={() => handleVote('no')}>
              No, move on
            </button>
          </div>
        )}

        {hasVoted && !onResolve && (
          <div className="user-vote-message">
            <p>Thank you for your vote!</p>
            {isClosing && <p>This message will close automatically...</p>}
          </div>
        )}

        <div className="time-vote-results">
          <p>{safeVotes.yes} votes for more time, {safeVotes.no} votes to move on</p>
          <p>{totalVotes} of {totalParticipants} participants have voted</p>
          <div className="vote-progress-bar">
            <div className="vote-progress-fill" style={{ width: `${yesPercentage}%` }} />
          </div>
        </div>

        {onResolve && (
          <div className="admin-resolve-buttons">
            <button type="button" className="time-vote-button yes-button" onClick={handleAddMoreTime}>
              Continue with this Question
            </button>
            <button type="button" className="time-vote-button no-button" onClick={handleMoveOn}>
              Move to Next Question
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeExtensionVote;