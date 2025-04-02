import express from 'express';


const sessionRouter = express.Router();

// -----------------------------------------------
// Route: GET /session/check-session
// Description: This route checks if the user is authenticated by looking at the session.
//              If a session exists and a user is logged in, it responds with isAuthenticated: true 
//              and sends back user details. If not, it returns isAuthenticated: false.
// -----------------------------------------------
sessionRouter.get('/check-session', (req, res) => {
    // console.log('Session in check-session route:', req.session);  // Log the session data
    
    // Check if there is a session object and a user logged in within that session.
    if (req.session?.user) {
        // If session and user data exist, the user is authenticated
        // Send back the authenticated status and the user data stored in the session
        res.json({ isAuthenticated: true, user: req.session.user || null });
    } else {
        // If no session or user data is found, the user is not authenticated
        res.json({ isAuthenticated: false });
    }
});



export default sessionRouter;



