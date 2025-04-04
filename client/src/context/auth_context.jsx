import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);   
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Use relative URLs - these will be automatically proxied by Vite's dev server
    const refreshSession = async () => {
        try {
            // Use a relative URL that will be proxied
            const url = '/session/check-session';
            // console.log('Fetching session from:', url);
            
            const response = await fetch(url, {
                credentials: 'include',
            });
            
            // console.log('Response status:', response.status);
            
            if (!response.ok) {
                // console.log('Session check failed with status:', response.status);
                setIsAuthenticated(false);
                setUser(null);
                return null;
            }
            
            // Check if the response is JSON
            const contentType = response.headers.get('Content-Type');
            // console.log('Content-Type:', contentType);
            
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Received content type:', contentType);
                throw new Error(`Unexpected response format: Expected JSON but got ${contentType}`);
            }
            
            const data = await response.json();
            // console.log('Session data:', data);
            setIsAuthenticated(data.isAuthenticated);
            setUser(data.user || null);
            return data;
        } catch (err) {
            console.error('Session refresh error:', err);
            setError(err.message);
            setIsAuthenticated(false);
            setUser(null);
            return null;
        } finally {
            setLoading(false);
        }
    };
    
    const login = async (formData) => {
        try {
            // Change to use the register/login endpoint
            const url = '/register/login';
            // console.log('Login URL:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include',
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }
            
            const data = await response.json();
            // After successful login, refresh the session to get all necessary data
            await refreshSession();
            return data;
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message);
            throw err;
        }
    };
    const logout = async () => {
        try {
            // Use a relative URL that will be proxied
            const url = '/session/logout';
            
            await fetch(url, {
                method: 'POST',
                credentials: 'include',
            });
            setIsAuthenticated(false);
            setUser(null);
            
        } catch (err) {
            console.error('Logout error:', err);
            setError(err.message);
        }
    };
    
    // Check session status on mount
    useEffect(() => {
        refreshSession();
    }, []);
    
    const value = {
        user,        
        loading,
        error,
        login,
        logout,
        refreshSession,
        isAuthenticated
    };
    
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};





