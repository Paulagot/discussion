// QuestionsList.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { enableDragDrop } from '../HelperFunctions';

const QuestionsList = ({ 
  questions, 
  onVote, 
  onEdit, 
  onDelete, 
  onSetActive, 
  currentUser, 
  remainingVotes,
  isAdmin,
  isModerator,
  isQuestionsSorted,
}) => {
  const questionRefs = useRef({});
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editText, setEditText] = useState('');
  const [votedQuestions, setVotedQuestions] = useState(new Set());
  const [voteError, setVoteError] = useState('');
  const dropTimeoutRef = useRef(null); // Ref to debounce drop

  // Debounced drop handler
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const activeQuestionArea = document.querySelector('#active-question-area');
    if (activeQuestionArea) {
      activeQuestionArea.classList.remove('drop-target-active');
    }
    const questionId = e.dataTransfer.getData('questionId');
    if (questionId && onSetActive && !dropTimeoutRef.current) {
      dropTimeoutRef.current = setTimeout(() => {
        // console.log(`Dropping question ${questionId}`);
        onSetActive(questionId);
        dropTimeoutRef.current = null;
      }, 100); // 100ms debounce
    }
  }, [onSetActive]);

  useEffect(() => {
    if (onSetActive) {
      for (const question of questions) {
        const questionEl = questionRefs.current[question.id];
        if (questionEl) {
          enableDragDrop(
            questionEl,
            (e) => {
              e.dataTransfer.setData('questionId', question.id);
              e.target.classList.add('dragging');
            },
            (e) => {
              e.target.classList.remove('dragging');
            }
          );
        }
      }
      
      const activeQuestionArea = document.querySelector('#active-question-area');
      if (activeQuestionArea) {
        activeQuestionArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          activeQuestionArea.classList.add('drop-target-active');
        });
        
        activeQuestionArea.addEventListener('dragleave', () => {
          activeQuestionArea.classList.remove('drop-target-active');
        });
        
        activeQuestionArea.addEventListener('drop', handleDrop);
      }
      
      return () => {
        const activeQuestionArea = document.querySelector('#active-question-area');
        if (activeQuestionArea) {
          activeQuestionArea.removeEventListener('dragover', () => {});
          activeQuestionArea.removeEventListener('dragleave', () => {});
          activeQuestionArea.removeEventListener('drop', handleDrop);
        }
      };
    }
  }, [questions, onSetActive, handleDrop]);

  if (!questions || questions.length === 0) {
    return <p className="no-questions">No questions yet. Be the first to ask!</p>;
  }

  const startEditing = (question) => {
    setEditingQuestionId(question.id);
    setEditText(question.text);
  };

  const cancelEditing = () => {
    setEditingQuestionId(null);
    setEditText('');
  };

  const saveEdit = (questionId) => {
    if (editText.trim() && onEdit) {
      onEdit(questionId, editText);
    }
    setEditingQuestionId(null);
    setEditText('');
  };

  const handleVote = async (questionId) => {
    if (votedQuestions.has(questionId)) {
      setVoteError('Already voted on this question');
      setTimeout(() => setVoteError(''), 3000);
      return;
    }

    try {
      const response = await onVote(questionId);
      setVotedQuestions(prev => new Set(prev).add(questionId));
      setVoteError('');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to vote';
      setVoteError(errorMessage);
      setTimeout(() => setVoteError(''), 3000);
    }
  };

  return (
    <div className={`questions-list ${!isQuestionsSorted ? 'questions-list--unsorted' : ''}`}>
      {voteError && <div className="vote-error">{voteError}</div>}
      {questions.map(question => (
        <div 
          key={question.id} 
          className="question-card"
          ref={(el) => {
            if (el) {
              questionRefs.current[question.id] = el;
            }
          }}
          data-question-id={question.id}
        >
          {editingQuestionId === question.id ? (
            <div className="question-edit">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="edit-input"
                rows="2"
              />
              <div className="edit-actions">
                <button
                  type="button"
                  className="save-button"
                  onClick={() => saveEdit(question.id)}
                  disabled={!editText.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="question-text">{question.text}</div>
          )}

<div className="question-votes">
          {!isQuestionsSorted && (  // Only show vote button when questions aren't sorted
            <button
              type="button"
              className="vote-button"
              onClick={() => handleVote(question.id)}
              disabled={remainingVotes <= 0 || votedQuestions.has(question.id)}
              title={
                remainingVotes <= 0 ? "No votes remaining" : 
                votedQuestions.has(question.id) ? "Already voted" : "Vote for this question"
              }
            >
              <span className="vote-icon">↑</span>
              <span>Vote: ({question.votes})</span> {/* Just show vote count without "Vote" text */}
            </button>
          )}
          
          {!!isQuestionsSorted && (  // Show vote count only when sorted
            <span className="vote-count">({question.votes})</span>
          )}
          
          {onSetActive && (
            <button 
              type="button"
              className="activate-button"
              onClick={() => onSetActive(question.id)}
              title="Set as active question"
            >
              Discuss
            </button>
          )}
            
            {(onEdit && question.author === currentUser && editingQuestionId !== question.id) && (
              <button 
                type="button"
                className="activate-button"
                onClick={() => startEditing(question)}
                title="Edit your question"
              >
                Edit
              </button>
            )}
            
            {((isAdmin || isModerator || question.author === currentUser) && onDelete) && (
              <button 
                type="button"
                className="activate-button"
                onClick={() => onDelete(question.id)}
                title={isAdmin || isModerator ? "Delete this question (Admin/Mod)" : "Delete your question"}
              >
                Delete
              </button>
            )}
          </div>
          
          <div className="question-footer">
            <div>
              Asked by {question.author === currentUser ? 'you' : question.author}
              <span className="question-time">
                {' • '}
                {new Date(question.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            {onSetActive && (
              <div className="drag-handle" title="Drag to make active">
                ⋮⋮
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionsList;