// ActiveQuestion.jsx - Simplified version
import React from 'react';
import QuestionReplies from './QuestionReplies';

const ActiveQuestion = ({ 
  question, 
  timer, 
  replies = [], 
  currentUser, 
  isAdmin, 
  isModerator, // NEW: Add this prop
  onAddReply, 
  onPinReply, 
  onDeleteReply,
  showTimeVote
}) => {
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const getTimerDisplay = () => {
    // console.log("getTimerDisplay:", { question: !!question, timer, showTimeVote });
    if (!question) return "";
    if (showTimeVote) return "Time's up!";
    if (timer === null || timer === undefined) return "Setting Time...";
    if (timer === 0) return "Time's up!";
    return formatTime(timer);
  };

  // console.log("ActiveQuestion rendering:", {
  //   hasQuestion: !!question,
  //   timer: timer,
  //   timerDisplay: getTimerDisplay(),
  //   showTimeVote: showTimeVote,
  //   replyCount: replies.length
  // });

  return (
    <div className="active-question">
      <div className="active-question-header">
        <h2 className="section-h2">Current Discussion</h2>
      </div>
      
      {question ? (
        <>
          <div className="active-question-timer">
            {getTimerDisplay()}
          </div>
          
          <div className="active-question-card">
            <div className="active-question-text">
              {question.text}
            </div>
            <div className="active-question-author">
              Asked by {question.author}
            </div>
          </div>


          <QuestionReplies
            questionId={question.id}
            sessionId={question.sessionId}
            replies={replies}
            currentUser={currentUser}
            isAdmin={isAdmin}
            isModerator={isModerator} // NEW: Pass this prop
            onAddReply={(text) => onAddReply(question.id, text)}
            onPinReply={onPinReply}
            onDeleteReply={onDeleteReply}
          />

         
        </>
      ) : (
        <div className="no-active-question">
          <p>No question is currently active</p>
          {isAdmin && (
            <div className="admin-drag-hint">
              Drag a question from the list to this area to make it active
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveQuestion;