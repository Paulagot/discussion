// SetPasswordForm.js
import React, { useState } from 'react';

/**
 * Component for setting a new password with a provided reset token.
 * Validates the password fields and submits the new password to the backend.
 *
 * @param {Object} props - Component properties.
 * @param {string} props.token - The reset token used for verifying the password reset request.
 */
function SetPasswordForm({ token }) {
    const [password, setPassword] = useState(''); // Holds the new password
    const [confirmPassword, setConfirmPassword] = useState(''); // Holds the confirmed password
    const [errors, setErrors] = useState({}); // Stores any validation errors
    const [message, setMessage] = useState(''); // Holds success/error message for the user
    

    // Handles input changes for password and confirm password fields
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'password') setPassword(value);
        if (name === 'confirmPassword') setConfirmPassword(value);
    };

    // Validates password inputs and ensures they match
    const validate = () => {
        const formErrors = {};
        if (!password) formErrors.password = 'Password is required';
        else if (password.length < 8) formErrors.password = 'Password must be at least 8 characters';

        if (!confirmPassword) formErrors.confirmPassword = 'Please confirm your password';
        else if (confirmPassword !== password) formErrors.confirmPassword = 'Passwords do not match';

        return formErrors;
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Handles form submission to set a new password
    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
        } else {
            setErrors({});
            setMessage(''); // Clear any previous messages

            try {
                // Send the new password to the backend with the reset token
                const response = await fetch(`${API_BASE_URL}/register/password-reset/${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });

                if (response.ok) {
                    setMessage('Password successfully reset! You can now log in with your new password.');
                    setPassword(''); // Clear password fields after successful reset
                    setConfirmPassword('');
                } else {
                    const data = await response.json();
                    setMessage(data.error || 'Error resetting password. Please try again.');
                }
            } catch (error) {
                console.error('Password reset error:', error);
                setMessage('Error resetting password. Please try again.');
            }
        }
    };

    return (
        <form className="registerForm" onSubmit={handleSubmit}>
            <h2>Set New Password</h2>

            {/* Input for new password */}
            <div>
                <label htmlFor="new-password">New Password</label>
                <input
                    type="password"
                    id="new-password"
                    name="password"
                    value={password}
                    onChange={handleChange}
                    required
                />
                {errors.password && <span className="error">{errors.password}</span>}
            </div>

            {/* Input to confirm new password */}
            <div>
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input
                    type="password"
                    id="confirm-password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={handleChange}
                    required
                />
                {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
            </div>

            {/* Submission button */}
            <button type="submit">Set Password</button>

            {/* Display message for success or error */}
            {message && <p>{message}</p>}
        </form>
    );
}

export default SetPasswordForm;


