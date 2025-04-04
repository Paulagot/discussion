// usePolling.js
import { useRef, useEffect, useCallback } from 'react';
import { fetchSessionData } from './api';

export function usePolling({
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
  reportGenerated,
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
  forceRefresh,
}) {
  const pollIntervalRef = useRef(null);
  const isPollingRef = useRef(false);
  const lastGrabAttentionRef = useRef(null);
  const prevTimerRef = useRef(timer);
  const hasPlayedTimerSound = useRef(false);

  const fetchSessionDataQuietly = useCallback(async (forceUpdate = false) => {
    if (!sessionCode || !isJoined || isPollingRef.current) return;

    isPollingRef.current = true;

    try {
      const data = await fetchSessionData(sessionCode, guestName);

      if (data.grabAttentionTriggered && data.grabAttentionTriggered !== lastGrabAttentionRef.current) {
        playAudio('grab-attention-polling');
        lastGrabAttentionRef.current = data.grabAttentionTriggered;
      }

      if (data.participants) {
        const newParticipants = data.participants.map(p => ({
          participant_id: p.participant_id,
          name: p.name,
          votes: p.remaining_votes,
          isAdmin: p.is_admin,
          isModerator: p.is_moderator,
        }));
        if (forceUpdate || JSON.stringify(newParticipants) !== JSON.stringify(participants)) {
          setParticipants(newParticipants);
          const currentUser = data.participants.find(p => p.name === guestName);
          if (currentUser) setRemainingVotes(currentUser.remaining_votes);
        }
      }

      if (data.timerInfo) {
        const serverTimer = data.timerInfo.remainingSeconds === undefined ? null : data.timerInfo.remainingSeconds;
        if (
          serverTimer === null &&
          prevTimerRef.current > 0 &&
          data.activeQuestion &&
          !hasPlayedTimerSound.current
        ) {
          playAudio('timer-polling');
          hasPlayedTimerSound.current = true;
        }
        setTimer(serverTimer);

        const voteActive = data.timerInfo.isTimeVoteActive;
        if ((serverTimer === 0 || voteActive) && !showTimeVote) {
          setShowTimeVote(true);
        }
        if (voteActive !== showTimeVote) {
          setShowTimeVote(voteActive);
        }
        if (serverTimer > 0) {
          prevTimerRef.current = serverTimer;
          hasPlayedTimerSound.current = false;
        }
      }

      if (data.timeVoteInfo) {
        const serverVotes = data.timeVoteInfo.votes || { yes: 0, no: 0 };
        const serverHasVoted = data.timeVoteInfo.hasVoted || false;
        if (forceUpdate || JSON.stringify(serverVotes) !== JSON.stringify(timeVotes)) {
          setTimeVotes(serverVotes);
        }
        if (serverHasVoted !== hasVoted || forceUpdate) {
          setHasVoted(serverHasVoted);
        }
      }

      if (data.questions) {
        const newQuestions = data.questions.map(q => ({
          id: q.question_id,
          text: q.text,
          author: q.author,
          votes: q.votes || 0,
          voters: [],
          timestamp: new Date(q.created_at),
        }));
        if (forceUpdate || JSON.stringify(newQuestions) !== JSON.stringify(questions)) {
          setQuestions(newQuestions);
        }
      }

      const newActiveQuestion = data.activeQuestion ? {
        id: data.activeQuestion.question_id,
        text: data.activeQuestion.text,
        author: data.activeQuestion.author,
        votes: data.activeQuestion.votes || 0,
        voters: [],
        timestamp: new Date(data.activeQuestion.created_at),
        sessionId: data.session.session_id,
      } : null;
      if (forceUpdate || 
          (newActiveQuestion?.id !== activeQuestion?.id) || 
          (newActiveQuestion === null && activeQuestion !== null) ||
          JSON.stringify(newActiveQuestion) !== JSON.stringify(activeQuestion)) {
        // console.log('Updating active question from polling:', newActiveQuestion);
        setActiveQuestion(newActiveQuestion);
      }

      if (data.finishedQuestions) {
        const newFinishedQuestions = data.finishedQuestions.map(q => ({
          id: q.question_id,
          text: q.text,
          author: q.author,
          votes: q.votes || 0,
          voters: [],
          timestamp: new Date(q.created_at),
        }));
        if (forceUpdate || JSON.stringify(newFinishedQuestions) !== JSON.stringify(finishedQuestions)) {
          setFinishedQuestions(newFinishedQuestions);
        }
      }

      if (data.replies) {
        const repliesByQuestion = {};
        for (const reply of data.replies) {
          if (!repliesByQuestion[reply.question_id]) repliesByQuestion[reply.question_id] = [];
          repliesByQuestion[reply.question_id].push({
            reply_id: reply.reply_id,
            author: reply.author,
            text: reply.text,
            created_at: new Date(reply.created_at),
            is_pinned: reply.is_pinned,
          });
        }
        if (forceUpdate || JSON.stringify(repliesByQuestion) !== JSON.stringify(replies)) {
          setReplies(repliesByQuestion);
        }
      }

      if (data.reportGenerated !== undefined && data.reportGenerated !== reportGenerated) {
        setReportGenerated(data.reportGenerated);
      }

      if (forceUpdate || data.isQuestionInputEnabled !== isQuestionInputEnabled) {
        setIsQuestionInputEnabled(data.isQuestionInputEnabled !== undefined ? data.isQuestionInputEnabled : true);
      }
      if (forceUpdate || data.isDiscussionStarted !== isDiscussionStarted) {
        setIsDiscussionStarted(data.isDiscussionStarted !== undefined ? data.isDiscussionStarted : false);
      }
      if (forceUpdate || data.isQuestionsSorted !== isQuestionsSorted) {
        setIsQuestionsSorted(data.isQuestionsSorted !== undefined ? data.isQuestionsSorted : false);
      }

      setError('');
    } catch (err) {
      console.error("Polling: Error fetching session data:", err);
      if (err.response?.status === 404) {
        clearSessionFromStorage();
        setSessionActive(false);
        setSessionCode('');
        setIsJoined(false);
        if (isAdmin) setShowStartModal(true);
      } else {
        if (!err.message?.includes('timeout')) {
          setError('Unable to connect to session. Trying to reconnect...');
        }
      }
    } finally {
      isPollingRef.current = false;
    }
  }, [
    sessionCode,
    isJoined,
    guestName,
    participants,
    questions,
    activeQuestion,
    finishedQuestions,
    replies,
    timeVotes,
    hasVoted,
    showTimeVote,
    isAdmin,
    timer,
    reportGenerated,
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
    setReplies,
    setReportGenerated,
    playAudio,
    isQuestionInputEnabled,
    setIsQuestionInputEnabled,
    isDiscussionStarted,
    setIsDiscussionStarted,
    isQuestionsSorted,
    setIsQuestionsSorted,
  ]);

  useEffect(() => {
    if (sessionActive && sessionCode && isJoined) {
      fetchSessionDataQuietly(true);
      pollIntervalRef.current = setInterval(() => {
        fetchSessionDataQuietly(false);
      }, 5000);
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [sessionActive, sessionCode, isJoined, fetchSessionDataQuietly]);

  return { 
    fetchSessionDataQuietly: () => fetchSessionDataQuietly(true) 
  };
}