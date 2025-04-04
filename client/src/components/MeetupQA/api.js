// api.js
import axios from 'axios';

// Add this fallback to ensure we always have a base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// For debugging - log the base URL
// console.log('API_BASE_URL:', API_BASE_URL);

// Helper function to handle API calls and errors consistently
const apiCall = async (method, url, data = null, params = null) => {
  try {
    // console.log(`${method} request to: ${url}`);
    const config = {
      method,
      url,
      ...(data && { data }),
      ...(params && { params }),
    };
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Error (${method} ${url}):`, error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received.');
    }
    throw error;
  }
};

export const fetchSessionData = async (code, participantName) => {
  return apiCall(
    'GET', 
    `${API_BASE_URL}/meetup_qa/meetupQA/code/${code}`, 
    null, 
    { participant_name: participantName }
  );
};

export const startSession = async (code, adminName, adminId) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA`, 
    {
      session_code: code,
      created_by: adminName,
      admin_id: adminId
    }
  );
};

export const endSession = async (sessionId) => {
  return apiCall(
    'PUT', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/end`
  );
};

export const joinSession = async (sessionCode, guestName) => {
  // First get the session details
  const sessionData = await apiCall(
    'GET', 
    `${API_BASE_URL}/meetup_qa/meetupQA/code/${sessionCode}`
  );
  
  const sessionId = sessionData.session.session_id;
  
  // Then join the session
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/participants`, 
    { name: guestName }
  );
};

export const addQuestion = async (sessionId, questionText, authorName) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/questions`, 
    {
      text: questionText,
      author: authorName
    }
  );
};

export const voteQuestion = async (questionId, participantName) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/questions/${questionId}/vote`, 
    { participant_name: participantName }
  );
};

export const setActiveQuestion = async (questionId) => {
  // Based on your server code, this is the correct endpoint
  return apiCall(
    'PUT', 
    `${API_BASE_URL}/meetup_qa/questions/${questionId}/activate`
  );
};

export const setTimer = async (sessionId, minutes) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/timer`, 
    { minutes }
  );
};

export const startTimeVote = async (sessionId) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/time-vote/start`
  );
};

export const submitTimeVote = async (sessionId, participantName, vote) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/time-vote`, 
    {
      participant_name: participantName,
      vote
    }
  );
};

export const endTimeVote = async (sessionId) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/time-vote/end`
  );
};

export const finishActiveQuestion = async (sessionId) => {
  return apiCall(
    'PUT', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/finish-active`
  );
};

export const deleteQuestion = async (sessionId, questionId, participantName) => {
  return apiCall(
    'DELETE', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/questions/${questionId}`, 
    null, 
    { participant_name: participantName }
  );
};

export const editQuestion = async (sessionId, questionId, newText, participantName) => {
  return apiCall(
    'PUT', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/questions/${questionId}`, 
    {
      text: newText,
      participant_name: participantName
    }
  );
};

export const addReply = async (sessionId, questionId, text, author) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/questions/${questionId}/replies`, 
    {
      text,
      author
    }
  );
};

export const pinReply = async (sessionId, questionId, replyId) => {
  return apiCall(
    'PUT', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/questions/${questionId}/replies/${replyId}/pin`
  );
};

export const deleteReply = async (sessionId, questionId, replyId, participantName) => {
  return apiCall(
    'DELETE', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/questions/${questionId}/replies/${replyId}`, 
    null, 
    { participant_name: participantName }
  );
};

export const setModerator = async (sessionId, participantId, isModerator, participantName) => {
  return apiCall(
    'PUT', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/participants/${participantId}/moderator`, 
    { is_moderator: isModerator }, 
    { participant_name: participantName }
  );
};

export const removeParticipant = async (sessionId, participantId, participantName) => {
  return apiCall(
    'DELETE', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/participants/${participantId}`, 
    null, 
    { participant_name: participantName }
  );
};

export const triggerGrabAttention = async (sessionId, adminName) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/grab-attention`, 
    { admin_name: adminName }
  );
};

export const triggerGenerateReport = async (sessionId) => {
  return apiCall(
    'POST', 
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/generate-report`
  );
};

// api.js
export const toggleQuestionInput = async (sessionId, enabled) => {
  return apiCall(
    'PUT',
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/toggle-question-input`,
    { enabled }
  );
};

export const startDiscussion = async (sessionId) => {
  return apiCall(
    'PUT',
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/start-discussion`
  );
};

export const sortQuestions = async (sessionId) => {
  return apiCall(
    'PUT',
    `${API_BASE_URL}/meetup_qa/meetupQA/${sessionId}/sort-questions`
  );
};

export const submitEmailForNotification = async (email) => {
  return apiCall(
    'POST',
    `${API_BASE_URL}/meetup_qa/leads`,
    { email }
  );
};
