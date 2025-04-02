//src/components/MeetupQA/HelperFunctions.jsx

/**
 * Generate a random alphanumeric session code
 * @param {number} length Length of the code
 * @returns {string} Random session code
 */
export const generateSessionCode = (length = 6) => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Format seconds into minutes:seconds display format
 * @param {number} seconds Total seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Enable drag and drop functionality for elements
 * @param {HTMLElement} element Element to make draggable
 * @param {Function} onDragStart Callback when drag starts
 * @param {Function} onDragEnd Callback when drag ends
 */
export const enableDragDrop = (element, onDragStart, onDragEnd) => {
  if (!element) return;
  
  element.setAttribute('draggable', true);
  
  element.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) onDragStart(e);
  });
  
  element.addEventListener('dragend', (e) => {
    if (onDragEnd) onDragEnd(e);
  });
};

/**
 * Make an element a drop target
 * @param {HTMLElement} element Element to make a drop target
 * @param {Function} onDrop Callback when an item is dropped
 */
export const makeDropTarget = (element, onDrop) => {
  if (!element) return;
  
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    element.classList.add('drop-target-active');
  });
  
  element.addEventListener('dragleave', () => {
    element.classList.remove('drop-target-active');
  });
  
  element.addEventListener('drop', (e) => {
    e.preventDefault();
    element.classList.remove('drop-target-active');
    if (onDrop) onDrop(e);
  });
};

/**
 * Play a sound
 * @param {string} soundUrl URL to the sound file
 * @param {number} volume Volume between 0 and 1
 */
export const playSound = (soundUrl, volume = 0.5) => {
  // console.log(`Attempting to play sound: ${soundUrl}`); // Debug log
  const audio = new Audio(soundUrl);
  audio.volume = volume;
  audio.play()
    .then(() => console.log('Sound played successfully'))
    .catch((error) => console.error('Error playing sound:', error));
};

/**
 * Local storage helper for session persistence
 */
export const sessionStorage = {
  saveSession(sessionId, data) {
    if (!sessionId) return;
    localStorage.setItem(`qa_session_${sessionId}`, JSON.stringify(data));
  },
  
  loadSession(sessionId) {
    if (!sessionId) return null;
    const data = localStorage.getItem(`qa_session_${sessionId}`);
    return data ? JSON.parse(data) : null;
  },
  
  clearSession(sessionId) {
    if (!sessionId) return;
    localStorage.removeItem(`qa_session_${sessionId}`);
  }
};

/**
 * Format a timestamp into "X ago" style
 * @param {Date|string} timestamp The timestamp to format
 * @returns {string} Formatted time (e.g., "Now", "5m ago", "2h ago")
 */
export const timeAgo = (timestamp) => {
  const now = Date.now();
  const past = new Date(timestamp).getTime();
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000); // 60,000 ms = 1 min

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ago`;
};