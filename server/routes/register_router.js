import express from 'express';
import bcrypt from 'bcrypt';
import pool from './config_db.js';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';


// Load environment variables
dotenv.config()
const appUrl = process.env.APP_URL ;


const registerRouter = express.Router();
const saltRounds = 10; // Complexity for bcrypt password hashing

// Extract specific environment variables
const {
    TURNSTILE_SECRET_KEY,
    CAPTCHA_VERIFY_URL,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASSWORD
} = process.env;


// Set up your email transporter using Nodemailer
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number.parseInt(SMTP_PORT, 10),
    secure: SMTP_SECURE === "true",
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
    },
});

// CAPTCHA Validation Function
async function validateCaptcha(captchaToken, ip) {
    try {
        const formData = new URLSearchParams();
        formData.append("secret", TURNSTILE_SECRET_KEY);
        formData.append("response", captchaToken);
        formData.append("remoteip", ip);

        const response = await fetch(CAPTCHA_VERIFY_URL, {
            body: formData,
            method: "POST",
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const outcome = await response.json();
        return outcome.success;
    } catch (error) {
        console.error("CAPTCHA verification error:", error);
        return false;
    }
}

// SIGNUP ROUTE
registerRouter.post('/signup', async (req, res) => {
    const { first_name, last_name, email, password, captchaToken } = req.body;

    // Validate CAPTCHA
    const isCaptchaValid = await validateCaptcha(captchaToken, req.ip);
    if (!isCaptchaValid) {
        return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    // Check if user exists in local database
    const checkUserSql = 'SELECT * FROM users WHERE email = ?';
    pool.query(checkUserSql, [email], (err, result) => {
        if (err) {
            console.error('Database error during user lookup:', err);
            return res.status(500).json({ error: 'Database error during sign-up' });
        }
        if (result.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        bcrypt.hash(password, saltRounds, (hashErr, hash) => {
            if (hashErr) {
                console.error('Password hashing error:', hashErr);
                return res.status(500).json({ error: 'Password hashing error' });
            }

            // Insert user into local database
            const insertUserSql = 'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)';
            pool.query(insertUserSql, [first_name, last_name, email, hash, 'student'], (dbErr) => {
                if (dbErr) {
                    console.error('Database insertion error:', dbErr);
                    return res.status(500).json({ error: 'User registration failed' });
                }

                return res.status(201).json({ 
                    message: 'User registered successfully!' 
                });
            });
        });
    });
});


// POST /login: Login route that authenticates a user, and stores session data
registerRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // SQL query to retrieve user data by email from the database
    const getUserSql = 'SELECT * FROM users WHERE email = ?';
    pool.query(getUserSql, [email], async (err, result) => {
        if (err) {
            console.error('Database error during user lookup:', err);
            return res.status(500).json({ error: 'Database error during login' });
        }
        if (result.length === 0) {
            console.warn('User not found for email:', email);
            return res.status(401).json({ error: 'User not found' });
        }

        const user = result[0];

        // Compare entered password with hashed password in the database
        bcrypt.compare(password, user.password, async (bcryptErr, match) => {
            if (bcryptErr || !match) {
                console.warn('Invalid password for email:', email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Set session data for the authenticated user
            req.session.user = {
                user_id: user.user_id,
                first_name: user.first_name,
                role: user.role,
            };
            
            // Send successful login response
            return res.status(200).json({
                message: 'Login successful',
                user: {
                    user_id: user.user_id,
                    first_name: user.first_name,
                    role: user.role
                }
            });
        });
    });
});


// ---------------------------------
// PASSWORD RESET ROUTE - Generate Reset Token and Send Email
// ---------------------------------
registerRouter.post('/password-reset', async (req, res) => {
    const { email, captchaToken } = req.body;

    async function handleCap() {
        try {
            const formData = new URLSearchParams();
            formData.append("secret", TURNSTILE_SECRET_KEY);
            formData.append("response", captchaToken);
            formData.append("remoteip", req.ip);
            const idempotencyKey = crypto.randomUUID();
            formData.append("idempotency_key", idempotencyKey);

            const url = process.env.CAPTCHA_VERIFY_URL;

            // First verification attempt
            const firstResponse = await fetch(url, {
                body: formData,
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            const firstOutcome = await firstResponse.json();
           
            if (firstOutcome.success) {
               // Success case
            } else {
                console.error("First CAPTCHA verification failed:", firstOutcome['error-codes']);
                return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
            }

            // Optional second verification request with idempotency key
            const subsequentResponse = await fetch(url, {
                body: formData,
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            const subsequentOutcome = await subsequentResponse.json();
           
            if (subsequentOutcome.success) {
                // Success case
            }

        } catch (error) {
            console.error("Error during CAPTCHA verification:", error);
            return res.status(500).json({ error: "Error verifying CAPTCHA. Please try again later." });
        }
    }

    // Run the CAPTCHA validation function
    await handleCap();

    // Step 2: Check if the user exists
    const checkUserSql = 'SELECT * FROM users WHERE email = ?';
    pool.query(checkUserSql, [email], (err, result) => {
        if (err) {
            console.error('Database error during user lookup:', err);
            return res.status(500).json({ error: 'Database error during password reset request' });
        }
        if (result.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Step 3: Generate reset token and expiration
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiration = Date.now() + 3600000; // 1 hour expiration

        // Step 4: Update the user record with reset token and expiration
        const updateSql = 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE user_id = ?';
        pool.query(updateSql, [resetToken, resetTokenExpiration, result[0].user_id], (dbErr) => {
            if (dbErr) {
                console.error('Database error while updating reset token:', dbErr);
                return res.status(500).json({ error: 'Database error while generating reset token' });
            }

            // Log reset link for testing (replace with actual email sending in production)
            const resetUrl = `${appUrl}/register?view=setPassword&token=${resetToken}`;
            console.log(resetUrl);

            // Placeholder email sending (log for now)
            const mailOptions = {
                from: 'donotreply@ablockofcrypto.com',
                to: email,
                subject: 'Password Reset Request',
                html: `
                    <p>Hello,</p>
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <a href="${resetUrl}">Reset Password</a>
                    <p>If you did not request this, please ignore this email.</p>
                `,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending password reset email:', error);
                    return res.status(500).json({ error: 'Failed to send password reset email.' });
                }
                
                res.status(200).json({ message: 'Password reset token generated and email sent.' });
            });
        });
    });
});



// ---------------------------------
// PASSWORD RESET CONFIRMATION - Update Password
// ---------------------------------
registerRouter.post('/password-reset/:token', (req, res) => {
    const { password } = req.body;
    const { token } = req.params;

    // Step 1: Validate the reset token and check expiration
    const sql = 'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?';
    pool.query(sql, [token, Date.now()], (err, result) => {
        if (err) {
            console.error('Database error during token validation:', err);
            return res.status(500).json({ error: 'Database error while validating token.' });
        }
        if (result.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const user = result[0];

        // Step 2: Hash the new password and update the database
        bcrypt.hash(password, saltRounds, (hashErr, hash) => {
            if (hashErr) {
                console.error('Error hashing new password:', hashErr);
                return res.status(500).json({ error: 'Error hashing new password' });
            }

            // Clear reset token and update with the new password
            const updateSql = 'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?';
            pool.query(updateSql, [hash, user.user_id], (dbErr) => {
                if (dbErr) {
                    console.error('Database error while updating password:', dbErr);
                    return res.status(500).json({ error: 'Database error while updating password.' });
                }

                res.status(200).json({ message: 'Password successfully reset! You can now log in with your new password.' });
            });
        });
    });
});


export default registerRouter;
