// AdminPanel.jsx
import React, { useState } from 'react';
import { generateReport } from './GenerateReport.jsx';
import { triggerGenerateReport } from './../api.js'; // Adjust path as needed

const AdminPanel = ({
  sessionCode,
  onSetTimer,
  timer,
  participants,
  onEndSession,
  questions,
  activeQuestion,
  finishedQuestions,
  replies,
  setReportGenerated,
  guestName,
  onGrabAttention,
  sessionId
}) => {
  const [minutes, setMinutes] = useState(5);
  const [isEnding, setIsEnding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionCode)
      .then(() => alert('Session code copied to clipboard!'))
      .catch(err => console.error('Failed to copy session code:', err));
  };

  const handleEndSession = async () => {
    if (window.confirm("Are you sure you want to end this Q&A session? All data will be permanently deleted. Please ensure you have downloaded the Report.")) {
      setIsEnding(true);
      try {
        await onEndSession();
        setIsEnding(false); // Reset after success
      } catch (err) {
        console.error("Error ending session:", err);
        setIsEnding(false);
        alert("Failed to end session. Please try again.");
      }
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      generateReport({
        sessionCode,
        participants,
        questions,
        activeQuestion,
        finishedQuestions,
        replies,
        hostName: guestName,
      });
      await triggerGenerateReport(sessionId);
      setReportGenerated(true);
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="session-info">
        <div>
          <strong>Session Code:</strong>
          <span className="session-code">{sessionCode}</span>
          <button
            type="button"
            className="copy-button"
            onClick={copySessionCode}
            title="Copy to clipboard"
          >
            📋
          </button>
        </div>

        <div className="participants-count">
          <strong>Participants:</strong> {participants.length}
        </div>

        <button type="button" className="bell-btn" onClick={onGrabAttention}>
          <span role="img" aria-label="Bell">🔔</span>
        </button>

        <div className="admin-actions">
          <button
            type="button"
            className="generate-report-button"
            onClick={handleGenerateReport}
            disabled={isEnding || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        <button
          type="button"
          className="end-session-button"
          onClick={handleEndSession}
          disabled={isEnding || isGenerating}
        >
          {isEnding ? 'Ending...' : 'End Session'}
        </button>
      </div>

      <div className="timer-controls">
        <div className="timer-display">
          {timer > 0 ? formatTime(timer) : "00:00"}
        </div>

        <div className="timer-inputs">
          <input
            type="number"
            min="1"
            max="60"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            disabled={isEnding || isGenerating}
          />
          <button
            type="button"
            className="set-timer-button"
            onClick={() => onSetTimer(minutes)}
            disabled={isEnding || isGenerating || !activeQuestion} // Add !activeQuestion
          >
            Set Timer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
