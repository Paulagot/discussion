// reset_password_form.js
import React, { useState, useEffect, useRef } from 'react';

/**
 * Component to handle requesting a password reset. 
 * Includes CAPTCHA verification and sends a reset email if inputs are valid.
 *
 * @param {Object} props - Component properties.
 * @param {function} props.onReset - Callback function to handle the password reset process.
 */

// Add these console logs at the top of your component function



function ResetPasswordForm({ onReset }) {
    const [email, setEmail] = useState(''); // Holds user's email input
    const [errors, setErrors] = useState({}); // Stores any validation errors
    const [captchaToken, setCaptchaToken] = useState(''); // CAPTCHA verification token
    const [isLoading, setIsLoading] = useState(false); // Loading state during email send
    const [message, setMessage] = useState(''); // Message displayed to the user
    const captchaRenderedRef = useRef(false); // Ref to track if CAPTCHA has already been rendered

    // Updates email state on input change
    const handleChange = (e) => {
        setEmail(e.target.value);
    };

    // Validates email input for proper format and non-emptiness
    const validate = () => {
        const formErrors = {};
        if (!email) {
            formErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            formErrors.email = 'Email address is invalid';
        }
        return formErrors;
    };

    // Handles form submission to request a password reset email
    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
        } else if (!captchaToken) {
            setErrors({ captcha: 'Please complete the CAPTCHA' });
        } else {
            setErrors({});
            setIsLoading(true); // Shows loading message while sending email
            setMessage(''); // Clears previous messages

            // Send email and CAPTCHA token to backend
            const success = await onReset(email, captchaToken); // Triggers parent function for backend interaction
            if (success) {
                setMessage('An email has been sent with instructions to reset your password.');
            } else {
                setMessage('There was an issue sending the reset email. Please try again.');
            }
            setIsLoading(false); // Stops loading message after email send
        }
    };

    // Ensures CAPTCHA renders only once
    useEffect(() => {
        if (!captchaRenderedRef.current && window.turnstile) {
            window.turnstile.render('.cf-turnstile', {
                sitekey: '0x4AAAAAAAyTlqCXTIWAluQM', // Replace with actual CAPTCHA site key
                callback: (token) => setCaptchaToken(token), // Sets CAPTCHA token on success
            });
            captchaRenderedRef.current = true; // Marks CAPTCHA as rendered
        }
    }, []);

    return (
        <form className="registerForm" onSubmit={handleSubmit}>
            <h2>Reset Password</h2>

            {/* Shows loading message during form submission */}
            {isLoading ? (
                <p>Hold tight while we prepare the email...</p>
            ) : message ? (
                // Shows confirmation message upon email send success
                <p>{message}</p>
            ) : (
                // Shows form if not loading and no success message
                <>
                    <div>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={handleChange}
                            required
                        />
                        {errors.email && <span className="error">{errors.email}</span>}
                    </div>

                    {/* CAPTCHA Widget */}
                    <div className="cf-turnstile" data-sitekey="0x4AAAAAAAyTlqCXTIWAluQM"/>
                    {errors.captcha && <span className="error">{errors.captcha}</span>}

                    <button type="submit">Reset Password</button>
                </>
            )}
        </form>
    );
}

export default ResetPasswordForm;



