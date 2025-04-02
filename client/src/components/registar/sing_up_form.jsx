import React, { useState, useEffect, useRef } from 'react';



function SignUpForm({ onSignUp }) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        agreedGDPR: false,
        agreedTnC: false,
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [captchaToken, setCaptchaToken] = useState('');

    const captchaRenderedRef = useRef(false);

    useEffect(() => {
        // Log when SignUpForm is mounted
      

        // Render CAPTCHA if not already rendered
        if (!captchaRenderedRef.current && window.turnstile) {
            try {
                window.turnstile.render('.cf-turnstile', {
                    sitekey: '0x4AAAAAAAyTlqCXTIWAluQM',
                    callback: (token) => {
                        
                        setCaptchaToken(token);
                    },
                });
                captchaRenderedRef.current = true; // Mark CAPTCHA as rendered
            } catch (error) {
                console.error('Error rendering CAPTCHA:', error);
            }
        } else {
            console.warn('CAPTCHA is not available or already rendered.');
        }
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const validate = () => {
        const formErrors = {};
        if (!formData.first_name) formErrors.first_name = 'First name is required';
        if (!formData.last_name) formErrors.last_name = 'Last name is required';
        if (!formData.email) formErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) formErrors.email = 'Email is invalid';
        if (!formData.password) formErrors.password = 'Password is required';
        else if (formData.password.length < 8) formErrors.password = 'Password must be at least 8 characters';
        if (!formData.agreedGDPR) formErrors.agreedGDPR = 'You must agree to the GDPR';
        if (!formData.agreedTnC) formErrors.agreedTnC = 'You must agree to the Terms & Conditions';
        return formErrors;
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
        } else {
            setErrors({});
            try {
                const response = await fetch(`${API_BASE_URL}/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ...formData, captchaToken }),
                });
                const data = await response.json();
                if (response.ok) {
                    setMessage('User registered successfully! Redirecting to sign in...');
                    onSignUp(); // Trigger view change in SignInMainBody
                } else {
                    setMessage(data.error || 'An error occurred during sign-up');
                }
            } catch (error) {
                setMessage('An error occurred. Please try again.');
            }
        }
    };

    return (
        <form className="registerForm" onSubmit={handleSubmit}>
            <h2>Sign Up</h2>

            <div>
                <label htmlFor="first_name">First Name</label>
                <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                />
                {errors.first_name && <span className="error">{errors.first_name}</span>}
            </div>

            <div>
                <label htmlFor="last_name">Last Name</label>
                <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                />
                {errors.last_name && <span className="error">{errors.last_name}</span>}
            </div>

            <div>
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div>
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />
                {errors.password && <span className="error">{errors.password}</span>}
            </div>

            <div>
                <label>
                    <input
                        type="checkbox"
                        name="agreedGDPR"
                        checked={formData.agreedGDPR}
                        onChange={handleChange}
                        required
                    />
                    I agree to the GDPR terms
                </label>
                {errors.agreedGDPR && <span className="error">{errors.agreedGDPR}</span>}
            </div>

            <div>
                <label>
                    <input
                        type="checkbox"
                        name="agreedTnC"
                        checked={formData.agreedTnC}
                        onChange={handleChange}
                        required
                    />
                    I agree to the Terms & Conditions
                </label>
                {errors.agreedTnC && <span className="error">{errors.agreedTnC}</span>}
            </div>

            <div className="cf-turnstile" data-sitekey="0x4AAAAAAAyTlqCXTIWAluQM" />

            <button type="submit">Sign Up</button>
            {message && <p>{message}</p>}
        </form>
    );
}

export default SignUpForm;
