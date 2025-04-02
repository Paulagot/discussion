
// MeetupQA/index.jsx
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/auth_context';
import { useSessionState } from './useSessionState';
import { usePolling } from './usePolling';
import { useTimer } from './useTimer';
import { useCallback } from 'react';
import { generateReport } from './components/GenerateReport';
import { useAudio } from './UseAudio';
import { triggerGrabAttention } from './api';// Import playSound
import {
  fetchSessionData,
  startSession,
  endSession,
  joinSession,
  addQuestion,
  voteQuestion,
  setActiveQuestion as activateQuestion,
  setTimer as setTimerAPI,
  submitTimeVote,
  endTimeVote,
  finishActiveQuestion,
  deleteQuestion,
  editQuestion,
  addReply,
  pinReply,
  deleteReply,
  setModerator,
  removeParticipant,

} from './api';

import JoinForm from './components/JoinForm';
import AdminPanel from './components/AdminPanel';
import QuestionsList from './components/QuestionsList';
import ActiveQuestion from './components/ActiveQuestion';
import FinishedQuestions from './components/FinishedQuestions';
import TimeExtensionVote from './components/TimeExtensionVote';
import StartSessionModal from './components/StartSessionModal';
import AddQuestionForm from './components/AddQuestionForm';
import ParticipantsList from './components/ParticipantsList';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';

const MeetupQA = () => {
  const sessionState = useSessionState();
  const { user } = useAuth();
  const {
    sessionActive,
    sessionId,
    sessionCode,
    isJoined,
    guestName,
    questions,
    activeQuestion,
    finishedQuestions,
    remainingVotes,
    participants,
    timer,
    showTimeVote,
    timeVotes,
    hasVoted,
    showStartModal,
    isLoading,
    error,
    isAdmin,
    replies,
    reportGenerated,
    setReportGenerated,
    setSessionActive,
    setSessionId,
    setSessionCode,
    setIsJoined,
    setGuestName,
    setQuestions,
    setActiveQuestion,
    setFinishedQuestions,
    setRemainingVotes,
    setParticipants,
    setTimer,
    setShowTimeVote,
    setTimeVotes,
    setHasVoted,
    setShowStartModal,
    setIsLoading,
    setError,
    setReplies,
    generateNewCode,
    saveSessionToStorage,
    clearSessionFromStorage,
    isQuestionInputEnabled,
    setIsQuestionInputEnabled,
    isDiscussionStarted,
    setIsDiscussionStarted,
    isQuestionsSorted,
    setIsQuestionsSorted,
  } = sessionState;

  const hasFetchedInitialData = useRef(false);
  const isModerator = participants.find(p => p.name === guestName)?.isModerator || false;

  // Initialize audio
  const { playAudio, hasPlayedSound, resetTimerSound } = useAudio({ isAdmin, guestName });

  const fetchSessionDataFromServer = useCallback(
    async (code) => {
      try {
        setIsLoading(true);
        const data = await fetchSessionData(code, guestName);
        // console.log("Session data fetched for", guestName, ":", JSON.stringify(data, null, 2));

        if (!sessionActive) setSessionActive(true);
        if (sessionId !== data.session.session_id) setSessionId(data.session.session_id);

        const newParticipants = data.participants.map((p) => ({
          participant_id: p.participant_id,
          name: p.name,
          votes: p.remaining_votes,
          isAdmin: p.is_admin,
          isModerator: p.is_moderator,
        }));
        if (JSON.stringify(newParticipants) !== JSON.stringify(participants)) {
          setParticipants(newParticipants);
        }

        const newQuestions = (data.questions || []).map((question) => ({
          id: question.question_id,
          text: question.text,
          author: question.author,
          votes: question.votes || 0,
          voters: [],
          timestamp: new Date(question.created_at),
        }));
        if (JSON.stringify(newQuestions) !== JSON.stringify(questions)) {
          setQuestions(newQuestions);
        }

        const newActiveQuestion = data.activeQuestion
          ? {
              id: data.activeQuestion.question_id,
              text: data.activeQuestion.text,
              author: data.activeQuestion.author,
              votes: data.activeQuestion.votes || 0,
              voters: [],
              timestamp: new Date(data.activeQuestion.created_at),
              sessionId: data.session.session_id,
            }
          : null;
        if (JSON.stringify(newActiveQuestion) !== JSON.stringify(activeQuestion)) {
          setActiveQuestion(newActiveQuestion);
        }

        const newFinishedQuestions = (data.finishedQuestions || []).map((question) => ({
          id: question.question_id,
          text: question.text,
          author: question.author,
          votes: question.votes || 0,
          voters: [],
          timestamp: new Date(question.created_at),
        }));
        if (JSON.stringify(newFinishedQuestions) !== JSON.stringify(finishedQuestions)) {
          setFinishedQuestions(newFinishedQuestions);
        }

        const repliesByQuestion = {};
        for (const reply of data.replies || []) {
          if (!repliesByQuestion[reply.question_id]) repliesByQuestion[reply.question_id] = [];
          repliesByQuestion[reply.question_id].push({
            reply_id: reply.reply_id,
            author: reply.author,
            text: reply.text,
            created_at: new Date(reply.created_at),
            is_pinned: reply.is_pinned,
          });
        }
        if (JSON.stringify(repliesByQuestion) !== JSON.stringify(replies)) {
          setReplies(repliesByQuestion);
        }

        const currentUser = data.participants.find((p) => p.name === guestName);
        if (currentUser && remainingVotes !== currentUser.remaining_votes) {
          setRemainingVotes(currentUser.remaining_votes);
        }

        if (data.timerInfo) {
          const serverTimer = data.timerInfo.remainingSeconds === undefined ? null : data.timerInfo.remainingSeconds;
          if (timer !== serverTimer) setTimer(serverTimer);
          const voteActive = data.timerInfo.isTimeVoteActive;
          if (showTimeVote !== voteActive) setShowTimeVote(voteActive);
        }

        if (data.timeVoteInfo) {
          if (JSON.stringify(timeVotes) !== JSON.stringify(data.timeVoteInfo.votes)) {
            setTimeVotes(data.timeVoteInfo.votes);
          }
          if (hasVoted !== data.timeVoteInfo.hasVoted) setHasVoted(data.timeVoteInfo.hasVoted);
        }

        // Sync reportGenerated for non-admins
        // Sync reportGenerated for all (remove !isAdmin condition)
  if (data.reportGenerated !== undefined && data.reportGenerated !== reportGenerated) {
    setReportGenerated(data.reportGenerated);
  }

   // New state updates
   if (data.isQuestionInputEnabled !== undefined) {
    setIsQuestionInputEnabled(data.isQuestionInputEnabled);
  }
  if (data.isDiscussionStarted !== undefined) {
    setIsDiscussionStarted(data.isDiscussionStarted);
  }
  if (data.isQuestionsSorted !== undefined) {
    setIsQuestionsSorted(data.isQuestionsSorted);
  }

        setError('');
      } catch (err) {
        console.error("Fetch error details:", err);
        setError('Something went wrong, please try again.');
        if (err.response?.status === 404) {
          clearSessionFromStorage();
          setSessionActive(false);
          setSessionCode('');
          setIsJoined(false);
          if (isAdmin) setShowStartModal(true);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      guestName,
      sessionActive,
      sessionId,
      participants,
      questions,
      activeQuestion,
      finishedQuestions,
      replies,
      remainingVotes,
      timer,
      showTimeVote,
      timeVotes,
      hasVoted,
      isAdmin,
      reportGenerated,
      setReportGenerated,
      setSessionActive,
      setSessionId,
      setParticipants,
      setQuestions,
      setActiveQuestion,
      setFinishedQuestions,
      setReplies,
      setRemainingVotes,
      setTimer,
      setShowTimeVote,
      setTimeVotes,
      setHasVoted,
      setIsLoading,
      setError,
      clearSessionFromStorage,
      setSessionCode,
      setIsJoined,
      setShowStartModal,
      setReportGenerated,
      setIsQuestionInputEnabled,
      setIsDiscussionStarted,
      setIsQuestionsSorted,
    
    ]
  );

  const polling = usePolling({
    sessionActive,
    sessionCode,
    isJoined,
    guestName,
    questions,
    participants,
    isAdmin,
    showTimeVote,
    activeQuestion,
    finishedQuestions,
    timer,
    setParticipants,
    setRemainingVotes,
    setTimer,
    setShowTimeVote,
    setTimeVotes,
    setHasVoted,
    setQuestions,
    setActiveQuestion,
    setFinishedQuestions,
    setError,
    setSessionActive,
    clearSessionFromStorage,
    setIsJoined,
    setSessionCode,
    setShowStartModal,
    timeVotes,
    hasVoted,
    replies,
    setReplies,
    setReportGenerated,
    playAudio,
    isQuestionInputEnabled,
    setIsQuestionInputEnabled,
    isDiscussionStarted,
    setIsDiscussionStarted,
    isQuestionsSorted,
    setIsQuestionsSorted,
    forceRefresh: () => fetchSessionDataFromServer(sessionCode),
  });

  useEffect(() => {
    if (sessionActive && sessionCode && isJoined && !hasFetchedInitialData.current) {
      fetchSessionDataFromServer(sessionCode);
      hasFetchedInitialData.current = true;
    }
  }, [sessionActive, sessionCode, isJoined, fetchSessionDataFromServer]);

  const timerManager = useTimer({
    timer,
    activeQuestion,
    isAdmin,
    sessionId,
    showTimeVote,
    setTimer,
    setShowTimeVote,
    hasVoted,
    playAudio, // Pass to useTimer
    hasPlayedSound, // Pass to useTimer
    resetTimerSound
  });



  const handleStartSession = async () => {
    try {
      const code = generateNewCode();
      const adminName = user?.first_name || user?.email || "Admin";
      const response = await startSession(code, adminName, null);
      

      setSessionCode(code);
      setSessionId(response.session_id);
      setSessionActive(true);
      setShowStartModal(false);
      setGuestName(adminName);
      setIsJoined(true);
      setReportGenerated(false);
      playAudio('start');
      saveSessionToStorage(code, adminName, response.session_id, true);
      await fetchSessionDataFromServer(code);
    } catch (err) {
      console.error("Error starting session:", err);
      setError('Failed to start session. Please try again.');
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession(sessionId);
      setSessionActive(false);
      setSessionCode('');
      setSessionId(null);
      setQuestions([]);
      setActiveQuestion(null);
      setFinishedQuestions([]);
      setParticipants([]);
      setIsJoined(false);
      setReportGenerated(true);
      clearSessionFromStorage();
      if (isAdmin) setShowStartModal(true);
    } catch (err) {
      console.error("Error ending session:", err);
      setError('Failed to end session. Please try again.');
      throw err; // Re-throw to propagate to AdminPanel
    }
  };

  const handleJoin = async (guestName, sessionCode) => {
    try {
      const response = await joinSession(sessionCode, guestName);
      setGuestName(guestName);
      setSessionCode(sessionCode);
      setIsJoined(true);
      setSessionActive(true);
      setReportGenerated(false);
      saveSessionToStorage(sessionCode, guestName, response.session_id, false);
      playAudio('join');
      await polling.fetchSessionDataQuietly(true);
      await fetchSessionDataFromServer(sessionCode);
      return true;
    } catch (err) {
      console.error("Join error:", err);
      if (err.response?.status === 409) throw new Error('Name already taken in this session');
      if (err.response?.status === 404) throw new Error('Invalid session code');
      throw err;
    }
  };

  {!isJoined && !isAdmin && (
    <div>
      <input value={sessionCode} onChange={(e) => setSessionCode(e.target.value)} placeholder="Session Code" />
      <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your Name" />

      <button  type="button" onClick={() => handleJoin(sessionCode, guestName)}>Join Session</button>
    </div>
  )}

  const handleAddQuestion = async (questionText) => {
    if (!questionText.trim() || !sessionId) return;

    try {
      await addQuestion(sessionId, questionText, guestName);
      await polling.fetchSessionDataQuietly(true);
    } catch (err) {
      console.error("Error adding question:", err);
      setError('Failed to add question. Please try again.');
    }
  };

  const handleVoteQuestion = async (questionId) => {
    if (remainingVotes <= 0) {
      setError('You have no votes remaining.');
      return;
    }

    try {
      const response = await voteQuestion(questionId, guestName);
      setRemainingVotes((prev) => prev - 1);
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, votes: response.votes } : q))
      );
      await polling.fetchSessionDataQuietly(true);
      setError('');
    } catch (err) {
      console.error("Error voting for question:", err);
      setError(err.response?.status === 400 ? 'No votes left or already voted.' : 'Failed to vote.');
    }
  };

  const handleSetActive = async (questionId) => {
    try {
      await activateQuestion(questionId);
      const questionToActivate = questions.find((q) => q.id === questionId);
      if (questionToActivate) {
        setActiveQuestion({ ...questionToActivate, sessionId, status: 'active' });
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      }
      setTimer(null);
      setShowTimeVote(false);
      setTimeVotes({ yes: 0, no: 0 });
      setHasVoted(false);
      await polling.fetchSessionDataQuietly(true);
    } catch (err) {
      console.error("Error setting active question:", err);
      setError('Failed to set active question.');
    }
  };

  const handleSetTimer = async (minutes) => {
    try {
      const seconds = minutes * 60;
      await setTimerAPI(sessionId, minutes);
      timerManager.setTimerValue(seconds);
      setShowTimeVote(false);
      await polling.fetchSessionDataQuietly(true);
    } catch (err) {
      console.error("Error setting timer:", err);
      setError('Failed to set timer.');
    }
  };

    // New Grab Attention handler
    const handleGrabAttention = async () => {
      playAudio('grab-attention'); // Play locally for admin
      try {
        await triggerGrabAttention(sessionId, guestName); // Signal server
      } catch (err) {
        console.error('Failed to trigger grab attention:', err);
      }
    };

    const handleTimeVote = async (vote) => {
      if (vote === 'close') {
        setShowTimeVote(false);
        return;
      }
      if (hasVoted) return;
      try {
        const data = await submitTimeVote(sessionId, guestName, vote);
        setTimeVotes(data.votes);
        setHasVoted(true);
      } catch (err) {
        console.error("Error submitting vote:", err);
        setError("Failed to submit vote.");
      }
    };
  
  

  const handleResolveTimeVote = async (addMoreTime) => {
    try {
      await endTimeVote(sessionId);
      setShowTimeVote(false);
      setTimeVotes({ yes: 0, no: 0 });
      setHasVoted(false);

      if (!addMoreTime) {
        await finishActiveQuestion(sessionId);
        if (activeQuestion) {
          setFinishedQuestions((prev) => [{ ...activeQuestion, status: 'finished' }, ...prev]);
          setActiveQuestion(null);
        }
        setTimer(null);
      } else {
        setTimer(null);
      }
      await polling.fetchSessionDataQuietly(true);
    } catch (err) {
      console.error("Error resolving time vote:", err);
      setError('Failed to resolve vote.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;
    if (!isAdmin && !isModerator && question.author !== guestName) {
      setError('You can only delete your own questions.');
      return;
    }
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteQuestion(sessionId, questionId, guestName);
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        if (activeQuestion?.id === questionId) {
          setActiveQuestion(null);
          setTimer(null);
          timerManager.setPrevTimerValue(0);
        }
        setError('');
        await polling.fetchSessionDataQuietly(true);
      } catch (err) {
        console.error("Error deleting question:", err);
        setError(err.response?.data?.error || 'Failed to delete question.');
      }
    }
  };

  const handleEditQuestion = async (questionId, newText) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || question.author !== guestName) {
      setError('You can only edit your own questions.');
      return;
    }
    if (newText?.trim() && newText !== question?.text) {
      try {
        const response = await editQuestion(sessionId, questionId, newText, guestName);
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, text: response.question.text } : q))
        );
        setError('');
        await polling.fetchSessionDataQuietly(true);
      } catch (err) {
        console.error("Error editing question:", err);
        setError(err.response?.data?.error || 'Failed to edit question.');
      }
    }
  };

  const handleAddReply = async (questionId, text) => {
    try {
      const response = await addReply(sessionId, questionId, text, guestName);
      setReplies((prev) => {
        const newReplies = { ...prev };
        if (!newReplies[questionId]) newReplies[questionId] = [];
        newReplies[questionId] = [
          ...newReplies[questionId],
          {
            reply_id: response.reply.reply_id,
            author: response.reply.author,
            text: response.reply.text,
            created_at: new Date(response.reply.created_at),
            is_pinned: response.reply.is_pinned,
          },
        ];
        return newReplies;
      });
      await polling.fetchSessionDataQuietly(true);
    } catch (err) {
      console.error("Error adding reply:", err);
      setError(err.response?.data?.error || 'Failed to add reply');
    }
  };

  const handlePinReply = async (questionId, replyId) => {
    try {
      const response = await pinReply(sessionId, questionId, replyId);
      setReplies((prev) => ({
        ...prev,
        [questionId]: prev[questionId].map((reply) =>
          reply.reply_id === replyId ? { ...reply, is_pinned: response.reply.is_pinned } : reply
        ),
      }));
      await polling.fetchSessionDataQuietly(true);
    } catch (err) {
      console.error("Error pinning reply:", err);
      setError(err.response?.data?.error || 'Failed to pin reply');
    }
  };

  const handleDeleteReply = async (questionId, replyId) => {
    try {
      await deleteReply(sessionId, questionId, replyId, guestName);
      setReplies((prev) => ({
        ...prev,
        [questionId]: prev[questionId].filter((reply) => reply.reply_id !== replyId),
      }));
      await polling.fetchSessionDataQuietly(true);
    } catch (err) {
      console.error("Error deleting reply:", err);
      setError(err.response?.data?.error || 'Failed to delete reply.');
    }
  };

  const handleSetModerator = async (participantId, isModerator) => {
    try {
      await setModerator(sessionId, participantId, isModerator, guestName);
      await polling.fetchSessionDataQuietly(true);
    } catch (err) {
      console.error("Error setting moderator:", err);
      setError(err.response?.data?.error || 'Failed to update moderator status.');
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (window.confirm("Are you sure you want to remove this participant?")) {
      try {
        await removeParticipant(sessionId, participantId, guestName);
        setParticipants((prev) => prev.filter((p) => p.participant_id !== participantId));
        await polling.fetchSessionDataQuietly(true);
      } catch (err) {
        console.error("Error removing participant:", err);
        setError(err.response?.data?.error || 'Failed to remove participant.');
      }
    }
  };

  if (isLoading) return <LoadingState />;
  if (isAdmin && showStartModal) return <StartSessionModal onStart={handleStartSession} />;
  if (!isJoined) return <JoinForm onJoin={handleJoin} />;
  if (error && !sessionActive) return (
    <ErrorState
      error={error}
      isAdmin={isAdmin}
      onStartNewSession={() => setShowStartModal(true)}
    />
  );

  const displayedQuestions = isQuestionsSorted
  ? [...questions].sort((a, b) => b.votes - a.votes)
  : questions;

return (
  <main className="container__right" id="main">
    <div className="meetup-qa-container">
      {error && <div className="error-message">{error}</div>}

      {isAdmin && (
        <AdminPanel
          sessionCode={sessionCode}
          onSetTimer={handleSetTimer}
          timer={timer}
          participants={participants}
          onEndSession={handleEndSession}
          questions={questions}
          activeQuestion={activeQuestion}
          finishedQuestions={finishedQuestions}
          replies={replies}
          setReportGenerated={setReportGenerated}
          guestName={guestName}
          onGrabAttention={handleGrabAttention}
          sessionId={sessionId}
          isQuestionInputEnabled={isQuestionInputEnabled}
          setIsQuestionInputEnabled={setIsQuestionInputEnabled}
          isDiscussionStarted={isDiscussionStarted}
          setIsDiscussionStarted={setIsDiscussionStarted}
          isQuestionsSorted={isQuestionsSorted}
          setIsQuestionsSorted={setIsQuestionsSorted}
        />
      )}
      <div className="download-report-button-container">
        {reportGenerated && (
          <button
            type="button"
            className="download-report-button"
            onClick={() => generateReport({ sessionCode, participants, questions, activeQuestion, finishedQuestions, replies, hostName: guestName, isAdmin })}
          >
            Download Report
          </button>
        )}
      </div>

      <ParticipantsList
        participants={participants}
        isAdmin={isAdmin}
        onSetModerator={handleSetModerator}
        onRemoveParticipant={handleRemoveParticipant}
      />

      {!reportGenerated && isQuestionInputEnabled && !isQuestionsSorted && (
        <div className="meetup-qa-questions">
          <AddQuestionForm onAddQuestion={handleAddQuestion} />
        </div>
      )}

      <div className="meetup-qa-main">
        <div className="meetup-qa-unanswered">
          <h2 className="meetup-qa-unanswered-header">Questions ({displayedQuestions.length})</h2>
          <QuestionsList
            questions={displayedQuestions}
            onVote={handleVoteQuestion}
            onEdit={handleEditQuestion}
            onDelete={handleDeleteQuestion}
            onSetActive={isAdmin ? handleSetActive : null}
            currentUser={guestName}
            remainingVotes={remainingVotes}
            isAdmin={isAdmin}
            isModerator={isModerator}
          />
          {isQuestionsSorted && (
            <div className="meetup-qa-finished">
              <h2 className="meetup-qa-finished-header">
                Answered Questions ({finishedQuestions.length})
              </h2>
              <FinishedQuestions questions={finishedQuestions} replies={replies} />
            </div>
          )}
        </div>

        {isQuestionsSorted && (
          <div className="meetup-qa-active" id="active-question-area">
            <ActiveQuestion
              question={activeQuestion}
              timer={timer}
              replies={replies[activeQuestion?.id] || []}
              currentUser={guestName}
              isAdmin={isAdmin}
              isModerator={isModerator}
              onAddReply={handleAddReply}
              onPinReply={(replyId) => handlePinReply(activeQuestion?.id, replyId)}
              onDeleteReply={(replyId) => handleDeleteReply(activeQuestion?.id, replyId)}
              showTimeVote={showTimeVote}
            />
            {showTimeVote && (
              <TimeExtensionVote
                onVote={handleTimeVote}
                onResolve={isAdmin ? handleResolveTimeVote : null}
                votes={timeVotes}
                totalParticipants={participants.length}
                hasVoted={hasVoted}
              />
            )}
          </div>
        )}
      </div>
    </div>
  </main>
);
};

export default MeetupQA;