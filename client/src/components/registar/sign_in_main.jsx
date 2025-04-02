// sign_in_main_body.js
import React, { useState, useEffect } from 'react';
// import SignUpForm from './sing_up_form';
import SignInForm from './sign_in_form';
import ResetPasswordForm from './reset_password';
import SetPasswordForm from './set_password';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth_context';

/**
 * Main container component for handling sign-in, sign-up, reset password, and set password views.
 * Dynamically renders the appropriate form based on the 'view' state and URL parameters.
 * Integrates with auth context to ensure proper session management.
 */
function SignInMainBody() {
    const [view, setView] = useState('signIn');
    const [resetToken, setResetToken] = useState(null);
    const location = useLocation();
    const { refreshSession } = useAuth();

    // Effect to handle URL parameters for different views
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlView = params.get('view');
        const urlToken = params.get('token');

        if (urlView) setView(urlView);
        if (urlView === 'setPassword' && urlToken) setResetToken(urlToken);
    }, [location]);

    /**
     * Handler for successful sign-up
     * Switches view back to sign-in form
     */
    const handleSignUp = () => {
        setView('signIn');
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const APP_URL = import.meta.env.VITE_APP_URL;

    /**
     * Handles the sign-in process
     * Attempts to log in the user and redirects on success
     * @param {Object} formData - Contains email and password
     */
    const handleSignIn = async (formData) => {
        try {
            await login(formData); // Use auth context's login
            await refreshSession();
                   } catch (error) {
            console.error('Sign-in error:', error);
        }
    };

    /**
     * Handles password reset requests
     * Sends reset email if successful
     * @param {string} email - User's email address
     * @param {string} captchaToken - ReCAPTCHA token for verification
     * @returns {boolean} Success status of the request
     */
    const handlePasswordReset = async (email, captchaToken) => {
        try {
            const response = await fetch(`${API_BASE_URL}/register/password-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, captchaToken }),
            });
            return response.ok;
        } catch (error) {
            console.error('Password reset error:', error);
            return false;
        }
    };

    const handlePasswordResetSuccess = () => {
        setView('signIn');
    };

    return (
        <main className="container__right" id="main">
            {/* Render appropriate form based on current view */}
            {view === 'signIn' && <SignInForm onSignIn={handleSignIn} />}
            {/* {view === 'signUp' && <SignUpForm onSignUp={handleSignUp} />} */}
            {view === 'resetPassword' && <ResetPasswordForm onReset={handlePasswordReset} />}
            {view === 'setPassword' && <SetPasswordForm token={resetToken} onSuccess={handlePasswordResetSuccess}/>}

            {/* Toggle links for switching between different forms */}
            <div className="toggle-links">
                {view !== 'signIn' && (
                    <button type="button" onClick={() => setView('signIn')}>Sign In</button>
                )}
                {/* {view !== 'signUp' && (
                    <button type="button" onClick={() => setView('signUp')}>Sign Up</button>
                )} */}
                {view !== 'resetPassword' && (
                    <button type="button" onClick={() => setView('resetPassword')}>Forgot Password?</button>
                )}

            </div>
        </main>
    );
}

export default SignInMainBody;
