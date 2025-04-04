
// components/ParticipantsList.jsx
import React from 'react';

const ParticipantsList = ({ participants, isAdmin, onSetModerator, onRemoveParticipant }) => {
  // console.log("ParticipantsList received participants:", JSON.stringify(participants, null, 2));
  return (
    <div className="meetup-qa-participants">
      <h2 className="section-h2">Participants</h2>
      <div className="participants-sub">

      <ul>
        {participants.map(p => {
          // console.log("Rendering participant:", p.name, "ID:", p.participant_id);
          return (
            <li key={p.participant_id || p.name}>
              <span>
                {p.name} {p.isAdmin ? '(Admin)' : p.isModerator ? '(Mod)' : ''}
              </span>
              <div className="vote-dots">
                {Array(5).fill(0).map((_, i) => (
                  <span 
                    key={`${p.participant_id}-vote-${i}`} 
                    className={`vote-dot ${i >= p.votes ? 'vote-dot-used' : ''}`}
                  />
                ))}
              </div>
              {isAdmin && !p.isAdmin && (
                <>
                  <button type="button" className="mod-btn" onClick={() => {
                    // console.log("Making mod for ID:", p.participant_id);
                    onSetModerator(p.participant_id, !p.isModerator);
                  }}>
                    {p.isModerator ? 'Remove Mod' : 'Mod'}
                  </button>
                  <button type="button" className="mod-btn" onClick={() => {
                    // console.log("Removing participant ID:", p.participant_id);
                    onRemoveParticipant(p.participant_id);
                  }}>
                    Kick
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
};

export default ParticipantsList;