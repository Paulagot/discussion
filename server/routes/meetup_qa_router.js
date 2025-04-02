//Server/meetup_qa_router.js
import express from 'express';
import pool from './config_db.js';

const meetupQARouter = express.Router();

// Use Promise-based pool
const promisePool = pool.promise();

// Create a new session
meetupQARouter.post('/meetupQA', (req, res) => {
    const { session_code, created_by, admin_id } = req.body;
    
    const query = `
        INSERT INTO meetupqa
        (session_code, created_by, admin_id)
        VALUES (?, ?, ?)
    `;
    
    pool.query(query, [session_code, created_by, admin_id], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: 'Database error', details: err });
        }
        
        // Add admin as first participant
        const participantQuery = `
            INSERT INTO session_participants
            (session_id, name, is_admin)
            VALUES (?, ?, TRUE)
        `;
        
        pool.query(participantQuery, [result.insertId, created_by], (partErr) => {
            if (partErr) {
                console.error('Error adding admin participant:', partErr);
                // Session was created, continue but log error
            }
            
            return res.status(201).json({ 
                message: 'Session created successfully', 
                session_id: result.insertId,
                session_code
            });
        });
    });
});

// Set timer for a session
meetupQARouter.post('/meetupQA/:session_id/timer', (req, res) => {
  const { session_id } = req.params;
  const { minutes } = req.body;
  
  const durationSeconds = minutes * 60;
  const startTimestamp = new Date();
  const endTimestamp = new Date(Date.now() + durationSeconds * 1000);

  const query = `
      UPDATE meetupqa
      SET timer_start_timestamp = ?,
          timer_end_timestamp = ?,
          timer_duration_seconds = ?,
          time_vote_active = FALSE
      WHERE session_id = ?
  `;
  
  pool.query(query, [startTimestamp, endTimestamp, durationSeconds, session_id], (err, result) => {
      if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ error: 'Database error', details: err });
      }
      
      if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Session not found' });
      }
      
      const clearVotesQuery = `
          DELETE FROM time_extension_votes
          WHERE session_id = ?
      `;
      
      pool.query(clearVotesQuery, [session_id], (clearErr) => {
          if (clearErr) {
              console.error('Error clearing votes:', clearErr);
          }
          
          return res.status(200).json({ 
              message: 'Timer set successfully',
              timer_start_timestamp: startTimestamp,
              timer_end_timestamp: endTimestamp,
              timer_duration_seconds: durationSeconds
          });
      });
  });
});

// meetup_qa_router.js
meetupQARouter.post('/meetupQA/:sessionId/grab-attention', (req, res) => {
  const { sessionId } = req.params;
  const { admin_name } = req.body;

  // Check if session exists and is active
  const checkQuery = `
    SELECT * FROM meetupqa WHERE session_id = ? AND is_active = TRUE
  `;
  pool.query(checkQuery, [sessionId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Database query error (check session):', checkErr);
      return res.status(500).json({ error: 'Database error', details: checkErr });
    }
    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    // Set grab_attention_triggered
    const triggerValue = `${admin_name}-${Date.now()}`;
    const updateQuery = `
      UPDATE meetupqa
      SET grab_attention_triggered = ?
      WHERE session_id = ?
    `;
    pool.query(updateQuery, [triggerValue, sessionId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Database query error (set trigger):', updateErr);
        return res.status(500).json({ error: 'Database error', details: updateErr });
      }

      // Reset after 5 seconds
      setTimeout(() => {
        pool.query(
          'UPDATE meetupqa SET grab_attention_triggered = NULL WHERE session_id = ?',
          [sessionId],
          (resetErr) => {
            if (resetErr) console.error('Error resetting grab_attention_triggered:', resetErr);
          }
        );
      }, 5000);

      res.json({ success: true });
    });
  });
});

//flag for generate report
meetupQARouter.post('/meetupQA/:sessionId/generate-report', (req, res) => {
  const { sessionId } = req.params;
  const query = `
    UPDATE meetupqa
    SET report_generated = TRUE
    WHERE session_id = ? AND is_active = TRUE
  `;
  pool.query(query, [sessionId], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }
    res.json({ success: true });
  });
});


// Get session details by code (updated to calculate remainingSeconds accurately)
meetupQARouter.get('/meetupQA/code/:code', (req, res) => {
  const { code } = req.params;
  const participantName = req.query.participant_name;
  
  // console.log(`Fetching session data for code: ${code}, participant: ${participantName}`);
  
  const query = `
    SELECT * FROM meetupqa
    WHERE session_code = ? AND is_active = TRUE
  `;
  
  pool.query(query, [code], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }
    
    const session = results[0];
    
    let remainingSeconds = null;
    let isTimeVoteActive = session.time_vote_active || false;
    
    if (session.timer_end_timestamp && !isTimeVoteActive) {
      const endTime = new Date(session.timer_end_timestamp).getTime();
      const currentTime = Date.now();
      remainingSeconds = Math.max(0, Math.floor((endTime - currentTime) / 1000));
      // console.log(`Server timer calc: end=${session.timer_end_timestamp}, now=${new Date(currentTime)}, remaining=${remainingSeconds}`);
      if (remainingSeconds === 0 && session.timer_end_timestamp) {
         pool.query(
          'UPDATE meetupqa SET time_vote_active = TRUE WHERE session_id = ? AND time_vote_active = FALSE',
          [session.session_id]
        );
        isTimeVoteActive = true;
      }
    }
    
    const participantsQuery = `
      SELECT * FROM session_participants
      WHERE session_id = ?
    `;
    
    pool.query(participantsQuery, [session.session_id], (partErr, participants) => {
      if (partErr) {
        console.error('Error getting participants:', partErr);
        return res.status(500).json({ error: 'Error getting participants' });
      }
      
      const questionsQuery = `
        SELECT 
          q.*,
          (SELECT COUNT(*) FROM question_votes WHERE question_id = q.question_id) as votes
        FROM session_questions q
        WHERE q.session_id = ? AND q.status = 'pending'
        ORDER BY votes DESC
      `;
      
      pool.query(questionsQuery, [session.session_id], (qErr, questions) => {
        if (qErr) {
          console.error('Error getting questions:', qErr);
          return res.status(500).json({ error: 'Error getting questions' });
        }
        
        const activeQuery = `
          SELECT * FROM session_questions
          WHERE session_id = ? AND status = 'active'
        `;
        
        pool.query(activeQuery, [session.session_id], (activeErr, activeQuestions) => {
          if (activeErr) {
            console.error('Error getting active question:', activeErr);
            return res.status(500).json({ error: 'Error getting active question' });
          }
          
          const finishedQuery = `
            SELECT * FROM session_questions
            WHERE session_id = ? AND status = 'finished'
            ORDER BY updated_at DESC
          `;
          
          pool.query(finishedQuery, [session.session_id], (finishedErr, finishedQuestions) => {
            if (finishedErr) {
              console.error('Error getting finished questions:', finishedErr);
              return res.status(500).json({ error: 'Error getting finished questions' });
            }
            
            const repliesQuery = `
              SELECT * FROM question_replies
              WHERE session_id = ?
              ORDER BY created_at ASC
            `;
            
            pool.query(repliesQuery, [session.session_id], (repliesErr, repliesResults) => {
              if (repliesErr) {
                console.error('Error getting replies:', repliesErr);
                return res.status(500).json({ error: 'Error getting replies' });
              }
              
              const replies = repliesResults || [];
              
              if (isTimeVoteActive) {
                const votesQuery = `
                  SELECT vote_value, COUNT(*) as count
                  FROM time_extension_votes
                  WHERE session_id = ?
                  GROUP BY vote_value
                `;
                
                pool.query(votesQuery, [session.session_id], (votesErr, votesResults) => {
                  if (votesErr) {
                    console.error('Error getting time votes:', votesErr);
                    return res.status(500).json({ error: 'Error getting time votes' });
                  }
                  
                  const votesCounts = { yes: 0, no: 0 };
                  for (const row of votesResults) {
                      if (row.vote_value === 'yes') votesCounts.yes = row.count;
                      if (row.vote_value === 'no') votesCounts.no = row.count;
                  }
                  
                  if (participantName) {
                    const participantVoteQuery = `
                      SELECT 1 FROM time_extension_votes
                      WHERE session_id = ? AND participant_name = ?
                      LIMIT 1
                    `;
                    
                    pool.query(participantVoteQuery, [session.session_id, participantName], 
                      (pvErr, pvResults) => {
                        if (pvErr) {
                          console.error('Error checking participant vote:', pvErr);
                          return res.status(500).json({ error: 'Error checking participant vote' });
                        }
                        
                        const hasVoted = pvResults.length > 0;
                        completeResponse(replies, votesCounts, hasVoted);
                      });
                  } else {
                    completeResponse(replies, votesCounts, false);
                  }
                });
              } else {
                completeResponse(replies, { yes: 0, no: 0 }, false);
              }
              
              function completeResponse(replies, timeVotes, hasVoted) {
                const responseWithTimer = {
                  session,
                  participants,
                  questions,
                  activeQuestion: activeQuestions.length > 0 ? activeQuestions[0] : null,
                  finishedQuestions,
                  replies: replies || [],
                  timerInfo: {
                    remainingSeconds,
                    isTimeVoteActive,
                    timerDurationSeconds: session.timer_duration_seconds || 0
                  },
                  timeVoteInfo: {
                    votes: timeVotes,
                    hasVoted
                  },
                  grabAttentionTriggered: session.grab_attention_triggered, // Add this
                  reportGenerated: session.report_generated 
                };
                // console.log('Sending response:', responseWithTimer);
                res.status(200).json(responseWithTimer);
              }
            });
          });
        });
      });
    });
  });
});


// End a session
// meetup_qa_router.js
meetupQARouter.put('/meetupQA/:id/end', async (req, res) => {
  const { id } = req.params;
  // console.log(`Received request to end session ${id}`); // Log entry

  try {
    // Start transaction
    await promisePool.query('START TRANSACTION');
    // console.log('Transaction started');

    // Delete question_replies
    const [repliesResult] = await promisePool.query(
      'DELETE FROM question_replies WHERE session_id = ?',
      [id]
    );
    // console.log(`Deleted ${repliesResult.affectedRows} rows from question_replies`);

    // Delete question_votes
    const [votesResult] = await promisePool.query(
      'DELETE FROM question_votes WHERE question_id IN (SELECT question_id FROM session_questions WHERE session_id = ?)',
      [id]
    );
    // console.log(`Deleted ${votesResult.affectedRows} rows from question_votes`);

    // Delete session_questions
    const [questionsResult] = await promisePool.query(
      'DELETE FROM session_questions WHERE session_id = ?',
      [id]
    );
    // console.log(`Deleted ${questionsResult.affectedRows} rows from session_questions`);

    // Delete time_extension_votes
    const [timeVotesResult] = await promisePool.query(
      'DELETE FROM time_extension_votes WHERE session_id = ?',
      [id]
    );
    // console.log(`Deleted ${timeVotesResult.affectedRows} rows from time_extension_votes`);

    // Delete session_participants
    const [participantsResult] = await promisePool.query(
      'DELETE FROM session_participants WHERE session_id = ?',
      [id]
    );
    // console.log(`Deleted ${participantsResult.affectedRows} rows from session_participants`);

    // Delete meetupqa
    const [sessionResult] = await promisePool.query(
      'DELETE FROM meetupqa WHERE session_id = ?',
      [id]
    );
    // console.log(`Deleted ${sessionResult.affectedRows} rows from meetupqa`);

    if (sessionResult.affectedRows === 0) {
      await promisePool.query('ROLLBACK');
      // console.log('No session found, rolled back');
      return res.status(404).json({ error: 'Session not found' });
    }

    // Commit transaction
    await promisePool.query('COMMIT');
    // console.log(`Session ${id} and all related data deleted successfully`);
    return res.status(200).json({ message: 'Session and all data deleted successfully' });
  } catch (err) {
    await promisePool.query('ROLLBACK');
    console.error('Database error during session end:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Add a participant to a session
meetupQARouter.post('/meetupQA/:session_id/participants', (req, res) => {
  const { session_id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Check if session exists
  const sessionCheckQuery = `
    SELECT 1 FROM meetupqa WHERE session_id = ? AND is_active = TRUE
  `;
  pool.query(sessionCheckQuery, [session_id], (sessionErr, sessionResults) => {
    if (sessionErr) {
      console.error('Database query error (session check):', sessionErr);
      return res.status(500).json({ error: 'Database error', details: sessionErr });
    }
    if (sessionResults.length === 0) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    // Check for duplicate name
    const nameCheckQuery = `
      SELECT name FROM session_participants
      WHERE session_id = ? AND name = ?
    `;
    pool.query(nameCheckQuery, [session_id, name.trim()], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Database query error (name check):', checkErr);
        return res.status(500).json({ error: 'Database error', details: checkErr });
      }
      if (checkResults.length > 0) {
        // console.log(`Name "${name}" already taken in session ${session_id}`);
        return res.status(409).json({ error: 'Name already taken in this session' });
      }

      // Insert new participant
      const insertQuery = `
        INSERT INTO session_participants
        (session_id, name)
        VALUES (?, ?)
      `;
      pool.query(insertQuery, [session_id, name.trim()], (insertErr, result) => {
        if (insertErr) {
          console.error('Database query error (insert):', insertErr);
          return res.status(500).json({ error: 'Database error', details: insertErr });
        }
        // console.log(`Participant "${name}" added to session ${session_id}`);
        return res.status(201).json({ 
          message: 'Participant added successfully', 
          participant_id: result.insertId 
        });
      });
    });
  });
});

meetupQARouter.put('/meetupQA/:session_id/participants/:participant_id/moderator', (req, res) => {
  const { session_id, participant_id } = req.params;
  const { is_moderator } = req.body; // true to appoint, false to revoke
  const requesterName = req.query.participant_name; // Admin's name

  if (typeof is_moderator !== 'boolean') {
    return res.status(400).json({ error: 'is_moderator must be a boolean' });
  }

  // Verify requester is admin
  const adminCheckQuery = `
    SELECT is_admin FROM session_participants
    WHERE session_id = ? AND name = ? AND is_admin = TRUE
  `;
  pool.query(adminCheckQuery, [session_id, requesterName], (adminErr, adminResults) => {
    if (adminErr) {
      console.error('Database error (admin check):', adminErr);
      return res.status(500).json({ error: 'Database error', details: adminErr });
    }
    if (adminResults.length === 0) {
      return res.status(403).json({ error: 'Only admin can appoint moderators' });
    }

    // Update moderator status
    const updateQuery = `
      UPDATE session_participants
      SET is_moderator = ?
      WHERE session_id = ? AND participant_id = ?
    `;
    pool.query(updateQuery, [is_moderator ? 1 : 0, session_id, participant_id], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Database error (update moderator):', updateErr);
        return res.status(500).json({ error: 'Database error', details: updateErr });
      }
      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Participant not found' });
      }
      // console.log(`Moderator status updated for participant ${participant_id} in session ${session_id}`);
      return res.status(200).json({ message: `Moderator status ${is_moderator ? 'granted' : 'revoked'}` });
    });
  });
});

// Add a question to a session
meetupQARouter.post('/meetupQA/:session_id/questions', (req, res) => {
    const { session_id } = req.params;
    const { text, author } = req.body;
    
    const query = `
        INSERT INTO session_questions
        (session_id, text, author)
        VALUES (?, ?, ?)
    `;
    
    pool.query(query, [session_id, text, author], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: 'Database error', details: err });
        }
        
        // Get the newly created question with its ID
        const getQuestionQuery = `
            SELECT * FROM session_questions
            WHERE question_id = ?
        `;
        
        pool.query(getQuestionQuery, [result.insertId], (getErr, questions) => {
            if (getErr) {
                console.error('Error getting new question:', getErr);
                return res.status(500).json({ error: 'Error retrieving question' });
            }
            
            return res.status(201).json({
                message: 'Question added successfully',
                question: questions[0]
            });
        });
    });
});

// vote for a question
meetupQARouter.post('/questions/:question_id/vote', (req, res) => {
  const { question_id } = req.params;
  const { participant_name } = req.body;

  pool.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('Connection error:', connErr);
      return res.status(500).json({ error: 'Database connection error' });
    }

    connection.beginTransaction((transErr) => {
      if (transErr) {
        connection.release();
        console.error('Transaction error:', transErr);
        return res.status(500).json({ error: 'Transaction error' });
      }

      // Check remaining votes
      const updateVotesQuery = `
        UPDATE session_participants
        SET remaining_votes = remaining_votes - 1
        WHERE name = ? AND remaining_votes > 0
      `;

      connection.query(updateVotesQuery, [participant_name], (updateErr, updateResult) => {
        if (updateErr || updateResult.affectedRows === 0) {
          connection.rollback(() => {
            connection.release();
            console.error('Vote update error:', updateErr);
            return res.status(400).json({ error: 'No votes remaining or participant not found' });
          });
          return;
        }

        // Add the vote
        const addVoteQuery = `
          INSERT INTO question_votes (question_id, participant_name)
          VALUES (?, ?)
        `;

        connection.query(addVoteQuery, [question_id, participant_name], (voteErr) => {
          if (voteErr) {
            connection.rollback(() => {
              connection.release();
              if (voteErr.code === 'ER_DUP_ENTRY') { // MySQL duplicate entry error
                return res.status(400).json({ error: 'Already voted on this question' });
              }
              console.error('Add vote error:', voteErr);
              return res.status(500).json({ error: 'Error adding vote' });
            });
            return;
          }

          connection.commit((commitErr) => {
            if (commitErr) {
              connection.rollback(() => {
                connection.release();
                console.error('Commit error:', commitErr);
                return res.status(500).json({ error: 'Commit error' });
              });
              return;
            }

            connection.release();

            const getVotesQuery = `
              SELECT COUNT(*) as votes FROM question_votes
              WHERE question_id = ?
            `;

            pool.query(getVotesQuery, [question_id], (countErr, countResult) => {
              if (countErr) {
                console.error('Error counting votes:', countErr);
              }

              const votes = countResult?.[0]?.votes || 0;
              return res.status(200).json({
                message: 'Vote added successfully',
                votes,
              });
            });
          });
        });
      });
    });
  });
});

// Set a question as active
meetupQARouter.put('/questions/:question_id/activate', (req, res) => {
    const { question_id } = req.params;
    
    // Get session_id for this question
    const getSessionQuery = `
        SELECT session_id FROM session_questions
        WHERE question_id = ?
    `;
    
    pool.query(getSessionQuery, [question_id], (getErr, getResults) => {
        if (getErr || getResults.length === 0) {
            console.error('Error getting question:', getErr);
            return res.status(404).json({ error: 'Question not found' });
        }
        
        const session_id = getResults[0].session_id;
        
        // Begin transaction
        pool.getConnection((connErr, connection) => {
            if (connErr) {
                console.error('Connection error:', connErr);
                return res.status(500).json({ error: 'Database connection error' });
            }
            
            connection.beginTransaction((transErr) => {
                if (transErr) {
                    connection.release();
                    console.error('Transaction error:', transErr);
                    return res.status(500).json({ error: 'Transaction error' });
                }
                
                // First, reset any currently active questions
                const resetQuery = `
                    UPDATE session_questions
                    SET status = 'finished'
                    WHERE session_id = ? AND status = 'active'
                `;
                
                connection.query(resetQuery, [session_id], (resetErr) => {
                    if (resetErr) {
                        connection.rollback(() => {
                            connection.release();
                            console.error('Reset error:', resetErr);
                            return res.status(500).json({ error: 'Error resetting active questions' });
                        });
                        return;
                    }
                    
                    // Reset timer and time vote when activating a new question
                    const resetTimerQuery = `
                        UPDATE meetupqa
                        SET timer_end_timestamp = NULL,
                            timer_duration_seconds = 0,
                            time_vote_active = FALSE
                        WHERE session_id = ?
                    `;
                    
                    connection.query(resetTimerQuery, [session_id], (resetTimerErr) => {
                        if (resetTimerErr) {
                            connection.rollback(() => {
                                connection.release();
                                console.error('Reset timer error:', resetTimerErr);
                                return res.status(500).json({ error: 'Error resetting timer' });
                            });
                            return;
                        }
                        
                        // Set the new active question
                        const activateQuery = `
                            UPDATE session_questions
                            SET status = 'active'
                            WHERE question_id = ?
                        `;
                        
                        connection.query(activateQuery, [question_id], (activateErr, activateResult) => {
                            if (activateErr || activateResult.affectedRows === 0) {
                                connection.rollback(() => {
                                    connection.release();
                                    console.error('Activate error:', activateErr);
                                    return res.status(500).json({ error: 'Error activating question' });
                                });
                                return;
                            }
                            
                            // Commit the transaction
                            connection.commit((commitErr) => {
                                if (commitErr) {
                                    connection.rollback(() => {
                                        connection.release();
                                        console.error('Commit error:', commitErr);
                                        return res.status(500).json({ error: 'Commit error' });
                                    });
                                    return;
                                }
                                
                                connection.release();
                                
                                // Get the updated question
                                const getQuestionQuery = `
                                    SELECT * FROM session_questions
                                    WHERE question_id = ?
                                `;
                                
                                pool.query(getQuestionQuery, [question_id], (getQuestionErr, questions) => {
                                    if (getQuestionErr) {
                                        console.error('Error getting question:', getQuestionErr);
                                        return res.status(500).json({ error: 'Error retrieving question' });
                                    }
                                    
                                    return res.status(200).json({
                                        message: 'Question activated successfully',
                                        question: questions[0]
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Set active question as finished
meetupQARouter.put('/meetupQA/:session_id/finish-active', (req, res) => {
    const { session_id } = req.params;
    
    // Begin transaction
    pool.getConnection((connErr, connection) => {
        if (connErr) {
            console.error('Connection error:', connErr);
            return res.status(500).json({ error: 'Database connection error' });
        }
        
        connection.beginTransaction((transErr) => {
            if (transErr) {
                connection.release();
                console.error('Transaction error:', transErr);
                return res.status(500).json({ error: 'Transaction error' });
            }
            
            // First, mark the active question as finished
            const finishQuery = `
                UPDATE session_questions
                SET status = 'finished'
                WHERE session_id = ? AND status = 'active'
            `;
            
            connection.query(finishQuery, [session_id], (finishErr, finishResult) => {
                if (finishErr) {
                    connection.rollback(() => {
                        connection.release();
                        console.error('Finish error:', finishErr);
                        return res.status(500).json({ error: 'Error finishing question' });
                    });
                    return;
                }
                
                // Also reset the timer and time vote status
                const resetTimerQuery = `
                    UPDATE meetupqa
                    SET timer_end_timestamp = NULL,
                        timer_duration_seconds = 0,
                        time_vote_active = FALSE
                    WHERE session_id = ?
                `;
                
                connection.query(resetTimerQuery, [session_id], (resetErr) => {
                    if (resetErr) {
                        connection.rollback(() => {
                            connection.release();
                            console.error('Reset timer error:', resetErr);
                            return res.status(500).json({ error: 'Error resetting timer' });
                        });
                        return;
                    }
                    
                    // Commit the transaction
                    connection.commit((commitErr) => {
                        if (commitErr) {
                            connection.rollback(() => {
                                connection.release();
                                console.error('Commit error:', commitErr);
                                return res.status(500).json({ error: 'Commit error' });
                            });
                            return;
                        }
                        
                        connection.release();
                        
                        // Clear time votes for this session
                        const clearVotesQuery = `
                            DELETE FROM time_extension_votes
                            WHERE session_id = ?
                        `;
                        
                        pool.query(clearVotesQuery, [session_id], (clearErr) => {
                            if (clearErr) {
                                console.error('Error clearing votes:', clearErr);
                                // Continue anyway
                            }
                            
                            return res.status(200).json({
                                message: 'Active question finished',
                                updated: finishResult.affectedRows > 0
                            });
                        });
                    });
                });
            });
        });
    });
});



// Start time vote
meetupQARouter.post('/meetupQA/:session_id/time-vote/start', (req, res) => {
    const { session_id } = req.params;
    
    // Begin transaction
    pool.getConnection((connErr, connection) => {
        if (connErr) {
            console.error('Connection error:', connErr);
            return res.status(500).json({ error: 'Database connection error' });
        }
        
        connection.beginTransaction((transErr) => {
            if (transErr) {
                connection.release();
                console.error('Transaction error:', transErr);
                return res.status(500).json({ error: 'Transaction error' });
            }
            
            // First, clear any existing votes for this session
            const clearQuery = `
                DELETE FROM time_extension_votes
                WHERE session_id = ?
            `;
            
            connection.query(clearQuery, [session_id], (clearErr) => {
                if (clearErr) {
                    connection.rollback(() => {
                        connection.release();
                        console.error('Error clearing votes:', clearErr);
                        return res.status(500).json({ error: 'Error clearing previous votes' });
                    });
                    return;
                }
                
                // Then activate time voting
                const activateQuery = `
                    UPDATE meetupqa
                    SET time_vote_active = TRUE
                    WHERE session_id = ?
                `;
                
                connection.query(activateQuery, [session_id], (activateErr, activateResult) => {
                    if (activateErr || activateResult.affectedRows === 0) {
                        connection.rollback(() => {
                            connection.release();
                            console.error('Error activating time vote:', activateErr);
                            return res.status(500).json({ error: 'Error activating time vote' });
                        });
                        return;
                    }
                    
                    // Commit the transaction
                    connection.commit((commitErr) => {
                        if (commitErr) {
                            connection.rollback(() => {
                                connection.release();
                                console.error('Commit error:', commitErr);
                                return res.status(500).json({ error: 'Commit error' });
                            });
                            return;
                        }
                        
                        connection.release();
                        return res.status(200).json({ 
                            message: 'Time vote started successfully',
                            votes: { yes: 0, no: 0 }
                        });
                    });
                });
            });
        });
    });
});

// End time vote
// In meetup_qa_router.js
meetupQARouter.post('/meetupQA/:session_id/time-vote/end', (req, res) => {
  const { session_id } = req.params;

  const query = `
    UPDATE meetupqa
    SET time_vote_active = FALSE,
        timer_end_timestamp = NULL,
        timer_duration_seconds = 0
    WHERE session_id = ?
  `;

  pool.query(query, [session_id], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const clearVotesQuery = `
      DELETE FROM time_extension_votes
      WHERE session_id = ?
    `;
    
    pool.query(clearVotesQuery, [session_id], (clearErr) => {
      if (clearErr) console.error('Error clearing votes:', clearErr);
      return res.status(200).json({ message: 'Time vote ended successfully' });
    });
  });
});

// Register a vote for time extension
meetupQARouter.post('/meetupQA/:session_id/time-vote', (req, res) => {
    const { session_id } = req.params;
    const { participant_name, vote } = req.body;

    // console.log(`Received vote request: Session ${session_id}, Name ${participant_name}, Vote ${vote}`);
    // console.log("Full request body:", req.body);

    if (!participant_name || !vote) {
        console.error("Invalid request - missing participant_name or vote");
        return res.status(400).json({ error: "Missing participant name or vote value" });
    }

    // Check if time voting is active
    const checkQuery = 'SELECT time_vote_active FROM meetupqa WHERE session_id = ?';
    
    pool.query(checkQuery, [session_id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error("Database error (checkQuery):", checkErr);
            return res.status(500).json({ error: "Database error", details: checkErr });
        }

        if (checkResults.length === 0) {
            console.error(`Session ${session_id} not found`);
            return res.status(404).json({ error: "Session not found" });
        }

        if (!checkResults[0].time_vote_active) {
            console.error(`Time vote not active for session ${session_id}`);
            return res.status(400).json({ error: "Time voting is not active for this session" });
        }

        // Insert vote into database
        const voteQuery = `
            INSERT INTO time_extension_votes (session_id, participant_name, vote_value, created_at)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE vote_value = VALUES(vote_value)
        `;

        pool.query(voteQuery, [session_id, participant_name, vote], (voteErr, voteResult) => {
            if (voteErr) {
                console.error("Database error (voteQuery):", voteErr);
                return res.status(500).json({ error: "Database error", details: voteErr });
            }

            // console.log(`Vote recorded: ${participant_name} voted ${vote} in session ${session_id}`);

            // Fetch updated vote counts
            const countsQuery = `
                SELECT vote_value, COUNT(*) as count
                FROM time_extension_votes
                WHERE session_id = ?
                GROUP BY vote_value
            `;

            pool.query(countsQuery, [session_id], (countsErr, countsResults) => {
                if (countsErr) {
                    console.error("Error fetching vote counts:", countsErr);
                    return res.status(500).json({ error: "Error fetching vote counts" });
                }

                const votes = { yes: 0, no: 0 };
                for (const row of countsResults) {
                    if (row.vote_value === 'yes') votes.yes = row.count;
                    if (row.vote_value === 'no') votes.no = row.count;
                }

                // console.log(`Updated vote counts for session ${session_id}: Yes: ${votes.yes}, No: ${votes.no}`);
                return res.status(200).json({ message: "Vote registered successfully", votes });
            });
        });
    });
});

meetupQARouter.delete('/meetupQA/:session_id/participants/:participant_id', (req, res) => {
  const { session_id, participant_id } = req.params;
  const requesterName = req.query.participant_name;

  // Check if requester is admin or moderator
  const authQuery = `
    SELECT is_admin, is_moderator
    FROM session_participants
    WHERE session_id = ? AND name = ?
  `;
  pool.query(authQuery, [session_id, requesterName], (authErr, authResults) => {
    if (authErr) {
      console.error('Database error (auth check):', authErr);
      return res.status(500).json({ error: 'Database error', details: authErr });
    }
    if (authResults.length === 0 || (!authResults[0].is_admin && !authResults[0].is_moderator)) {
      return res.status(403).json({ error: 'Only admin or moderator can remove participants' });
    }

    // Prevent removing self or admin
    const targetCheckQuery = `
      SELECT is_admin, name FROM session_participants
      WHERE session_id = ? AND participant_id = ?
    `;
    pool.query(targetCheckQuery, [session_id, participant_id], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Database error (target check):', checkErr);
        return res.status(500).json({ error: 'Database error', details: checkErr });
      }
      if (checkResults.length === 0) {
        return res.status(404).json({ error: 'Participant not found' });
      }
      if (checkResults[0].is_admin) {
        return res.status(403).json({ error: 'Cannot remove the admin' });
      }
      if (checkResults[0].name === requesterName) {
        return res.status(400).json({ error: 'Cannot remove yourself' });
      }

      const deleteQuery = `
        DELETE FROM session_participants
        WHERE session_id = ? AND participant_id = ?
      `;
      pool.query(deleteQuery, [session_id, participant_id], (deleteErr, deleteResult) => {
        if (deleteErr) {
          console.error('Database error (delete):', deleteErr);
          return res.status(500).json({ error: 'Database error', details: deleteErr });
        }
        res.status(200).json({ message: 'Participant removed successfully' });
      });
    });
  });
});

// Delete question endpoint
meetupQARouter.delete('/meetupQA/:session_id/questions/:question_id', (req, res) => {
  const { session_id, question_id } = req.params;
  const participant_name = req.query.participant_name;

  if (!participant_name) {
    return res.status(400).json({ error: 'Participant name required' });
  }

  // Check if requester is admin, moderator, or question author
  const authQuery = `
    SELECT q.author, p.is_admin, p.is_moderator
    FROM session_questions q
    LEFT JOIN session_participants p ON p.session_id = q.session_id AND p.name = ?
    WHERE q.session_id = ? AND q.question_id = ?
  `;
  pool.query(authQuery, [participant_name, session_id, question_id], (authErr, authResults) => {
    if (authErr) {
      console.error('Error checking authorization:', authErr);
      return res.status(500).json({ error: 'Database error', details: authErr });
    }
    if (authResults.length === 0) {
      return res.status(404).json({ error: 'Question or session not found' });
    }

    const { author, is_admin, is_moderator } = authResults[0];
    if (!is_admin && !is_moderator && author !== participant_name) {
      return res.status(403).json({ error: 'Only the author, admin, or moderator can delete this question' });
    }

    const deleteQuery = `
      DELETE FROM session_questions
      WHERE session_id = ? AND question_id = ?
    `;
    pool.query(deleteQuery, [session_id, question_id], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error('Error deleting question:', deleteErr);
        return res.status(500).json({ error: 'Database error', details: deleteErr });
      }
      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }
      res.status(204).send();
    });
  });
});

// Edit question endpoint
meetupQARouter.put('/meetupQA/:session_id/questions/:question_id', (req, res) => {
    const { session_id, question_id } = req.params;
    const { text, participant_name } = req.body;
  
    if (!text || !participant_name) {
      return res.status(400).json({ error: 'Text and participant name required' });
    }
  
    // Check if the participant is admin or the question author
    const authQuery = `
      SELECT q.author, p.is_admin
      FROM session_questions q
      LEFT JOIN session_participants p ON p.session_id = q.session_id AND p.name = ?
      WHERE q.session_id = ? AND q.question_id = ?
    `;
  
    pool.query(authQuery, [participant_name, session_id, question_id], (authErr, authResults) => {
      if (authErr) {
        console.error('Error checking authorization:', authErr);
        return res.status(500).json({ error: 'Database error', details: authErr });
      }
  
      if (authResults.length === 0) {
        return res.status(404).json({ error: 'Question or session not found' });
      }
  
      const { author, is_admin } = authResults[0];
      if (!is_admin && author !== participant_name) {
        return res.status(403).json({ error: 'Only the author or an admin can edit this question' });
      }
  
      // Update the question
      const updateQuery = `
        UPDATE session_questions
        SET text = ?, updated_at = NOW()
        WHERE session_id = ? AND question_id = ?
      `;
  
      pool.query(updateQuery, [text, session_id, question_id], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error updating question:', updateErr);
          return res.status(500).json({ error: 'Database error', details: updateErr });
        }
  
        if (updateResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Question not found' });
        }
  
        // Return the updated question
        const getQuestionQuery = `
          SELECT * FROM session_questions
          WHERE question_id = ?
        `;
        pool.query(getQuestionQuery, [question_id], (getErr, questions) => {
          if (getErr) {
            console.error('Error retrieving updated question:', getErr);
            return res.status(500).json({ error: 'Error retrieving question' });
          }
          res.status(200).json({ message: 'Question updated successfully', question: questions[0] });
        });
      });
    });
});

// Add a reply to a question
meetupQARouter.post('/meetupQA/:session_id/questions/:question_id/replies', (req, res) => {
    const { session_id, question_id } = req.params;
    const { text, author } = req.body;
  
    // console.log('Adding reply:', { session_id, question_id, text, author });
  
    if (!text || !author || text.length > 200) {
      return res.status(400).json({ error: 'Text (max 200 chars) and author required' });
    }
  
    const checkQuery = `
      SELECT status FROM session_questions
      WHERE session_id = ? AND question_id = ? AND status = 'active'
    `;
    pool.query(checkQuery, [session_id, question_id], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Error checking question status:', checkErr);
        return res.status(500).json({ error: 'Database error', details: checkErr });
      }
      if (checkResults.length === 0) {
        return res.status(400).json({ error: 'Question is not active or not found' });
      }
  
      const insertQuery = `
        INSERT INTO question_replies (session_id, question_id, author, text)
        VALUES (?, ?, ?, ?)
      `;
      pool.query(insertQuery, [session_id, question_id, author, text], (insertErr, insertResult) => {
        if (insertErr) {
          console.error('Error adding reply:', insertErr);
          return res.status(500).json({ error: 'Database error', details: insertErr });
        }
  
        const fetchQuery = `
          SELECT * FROM question_replies
          WHERE reply_id = ?
        `;
        pool.query(fetchQuery, [insertResult.insertId], (fetchErr, fetchResults) => {
          if (fetchErr) {
            console.error('Error fetching new reply:', fetchErr);
            return res.status(500).json({ error: 'Error retrieving reply' });
          }
          // console.log('Reply added to DB:', fetchResults[0]);
          res.status(201).json({
            message: 'Reply added successfully',
            reply: fetchResults[0]
          });
        });
      });
    });
});

// Pin/Unpin a reply
meetupQARouter.put('/meetupQA/:session_id/questions/:question_id/replies/:reply_id/pin', (req, res) => {
    const { session_id, question_id, reply_id } = req.params;
  
    // Check if the question is active and exists
    const checkQuery = `
      SELECT status FROM session_questions
      WHERE session_id = ? AND question_id = ? AND status = 'active'
    `;
    pool.query(checkQuery, [session_id, question_id], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Error checking question status:', checkErr);
        return res.status(500).json({ error: 'Database error', details: checkErr });
      }
      if (checkResults.length === 0) {
        return res.status(400).json({ error: 'Question is not active or not found' });
      }
  
      // Toggle the is_pinned field
      const toggleQuery = `
        UPDATE question_replies
        SET is_pinned = NOT is_pinned
        WHERE reply_id = ? AND session_id = ? AND question_id = ?
      `;
      pool.query(toggleQuery, [reply_id, session_id, question_id], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error toggling pin status:', updateErr);
          return res.status(500).json({ error: 'Database error', details: updateErr });
        }
        if (updateResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Reply not found' });
        }
  
        // Fetch the updated reply
        const fetchQuery = `
          SELECT * FROM question_replies
          WHERE reply_id = ?
        `;
        pool.query(fetchQuery, [reply_id], (fetchErr, fetchResults) => {
          if (fetchErr) {
            console.error('Error fetching updated reply:', fetchErr);
            return res.status(500).json({ error: 'Error retrieving updated reply' });
          }
          res.status(200).json({
            message: 'Reply pin status updated',
            reply: fetchResults[0],
          });
        });
      });
    });
});

// Delete a reply
meetupQARouter.delete('/meetupQA/:session_id/questions/:question_id/replies/:reply_id', (req, res) => {
  const { session_id, question_id, reply_id } = req.params;
  const participant_name = req.query.participant_name; // Optional, for auth

  const checkQuery = `
    SELECT status FROM session_questions
    WHERE session_id = ? AND question_id = ? AND status = 'active'
  `;
  pool.query(checkQuery, [session_id, question_id], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking question status:', checkErr);
      return res.status(500).json({ error: 'Database error', details: checkErr });
    }
    if (checkResults.length === 0) {
      return res.status(400).json({ error: 'Question is not active or not found' });
    }

    // Check if requester is admin or moderator
    const authQuery = `
      SELECT is_admin, is_moderator
      FROM session_participants
      WHERE session_id = ? AND name = ?
    `;
    pool.query(authQuery, [session_id, participant_name], (authErr, authResults) => {
      if (authErr) {
        console.error('Error checking authorization:', authErr);
        return res.status(500).json({ error: 'Database error', details: authErr });
      }
      if (authResults.length === 0 || (!authResults[0].is_admin && !authResults[0].is_moderator)) {
        return res.status(403).json({ error: 'Only admin or moderator can delete replies' });
      }

      const deleteQuery = `
        DELETE FROM question_replies
        WHERE reply_id = ? AND session_id = ? AND question_id = ?
      `;
      pool.query(deleteQuery, [reply_id, session_id, question_id], (deleteErr, deleteResult) => {
        if (deleteErr) {
          console.error('Error deleting reply:', deleteErr);
          return res.status(500).json({ error: 'Database error', details: deleteErr });
        }
        if (deleteResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Reply not found' });
        }
        res.status(200).json({ message: 'Reply deleted successfully' });
      });
    });
  });
});

export default meetupQARouter;