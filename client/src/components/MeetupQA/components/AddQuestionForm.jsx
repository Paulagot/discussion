// components/AddQuestionForm.jsx
import React from 'react';

const AddQuestionForm = ({ onAddQuestion }) => {
  return (
    <div className="add-question-form">
      <h3>Add a Question</h3>
      <textarea 
        placeholder="Type your question here..."
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onAddQuestion(e.target.value);
            e.target.value = '';
          }
        }}
      />
      <button 
        type="button"
        onClick={(e) => {
          const textarea = e.target.previousElementSibling;
          onAddQuestion(textarea.value);
          textarea.value = '';
        }}
      >
        Submit Question
      </button>
    </div>
  );
};

export default AddQuestionForm;
