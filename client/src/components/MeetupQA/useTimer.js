// useTimer.js
import { useEffect, useRef } from 'react';

export function useTimer({
  timer,
  setTimer,
  sessionId,
  isAdmin,
  showTimeVote,
  setShowTimeVote,
  activeQuestion
}) {
  const setTimerValue = (value) => {
    // console.log(`Timer set to: ${value} by ${isAdmin ? 'admin' : 'user'}`);
    setTimer(value);
  };

  const prevTimerRef = useRef(timer);

  useEffect(() => {
    // console.log(`useTimer effect (${isAdmin ? 'admin' : 'user'}):`, {
    //   timer,
    //   prevTimer: prevTimerRef.current,
    //   activeQuestion: !!activeQuestion,
    //   showTimeVote
    // });

    if (timer === 0 && activeQuestion && !showTimeVote) {
      // console.log(`Timer hit 0 (${isAdmin ? 'admin' : 'user'}), activating time vote`);
      setShowTimeVote(true);
    }

    prevTimerRef.current = timer;
  }, [timer, activeQuestion, showTimeVote, setShowTimeVote, isAdmin]);

  return { setTimerValue };
}