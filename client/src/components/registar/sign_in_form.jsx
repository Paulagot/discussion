import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth_context';

function SignInForm() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const { login, loading } = useAuth();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const validate = () => {
        const formErrors = {};
        if (!formData.email) {
            formErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            formErrors.email = 'Email address is invalid';
        }
        if (!formData.password) {
            formErrors.password = 'Password is required';
        }
        return formErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        try {
            await login(formData);
            setMessage('Logged in successfully!');
            navigate('/discuss');
        } catch (error) {
            setMessage(error.message || 'An error occurred during sign-in');
        }
    };

    return (
        <form className="registerForm" onSubmit={handleSubmit}>
            <h2>Sign In</h2>
            <div>
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    id="email"
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
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />
                {errors.password && <span className="error">{errors.password}</span>}
            </div>
            <button type="submit">Sign In</button>
            {message && <p>{message}</p>}
        </form>
    );
}

export default SignInForm;