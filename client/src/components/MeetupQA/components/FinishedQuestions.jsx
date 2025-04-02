import React, { useState } from 'react';
import { timeAgo } from './../HelperFunctions';

const FinishedQuestions = ({ questions, replies = {} }) => {
  // State to track which questions' comments are expanded
  const [expandedComments, setExpandedComments] = useState({});

  // Toggle the expanded state for a question's comments
  const toggleComments = (questionId) => {
    setExpandedComments(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  return (
    <div className="finished-questions">
      {questions.map(question => {
        // Get the replies for this question
        const questionReplies = replies[question.id] || [];
        const replyCount = questionReplies.length;

        // Sort replies: pinned first, then by created_at descending
        const sortedReplies = [...questionReplies].sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });

        return (
          <div key={question.id} className="finished-question">
            <div className="question-text">{question.text}</div>
            <div className="question-author">Asked by {question.author}</div>
            {replyCount > 0 && (
              <div className="comments-toggle">
                <button
                  type="button"
                  onClick={() => toggleComments(question.id)}
                  className="comments-toggle-button"
                  title={expandedComments[question.id] ? "Hide comments" : "Show comments"}
                >
                  💬 {replyCount} {replyCount === 1 ? 'Comment' : 'Comments'}
                </button>
                {expandedComments[question.id] && (
                  <div className="comments-list">
                    {sortedReplies.map(reply => (
                      <div key={reply.reply_id} className="reply-item">
                       <span className={reply.is_pinned ? 'pinned-reply' : ''}>
  {!!reply.is_pinned && '★ '}
  {reply.author}: {reply.text}
</span>
                        <span className="reply-time">{timeAgo(reply.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {questions.length === 0 && (
        <div className="no-finished-questions">
          <p>No questions have been answered yet.</p>
        </div>
      )}
    </div>
  );
};

export default FinishedQuestions;