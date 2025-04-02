import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import MeetupQA from './components/MeetupQA/index.jsx'
import SignInMainBody from './components/registar/sign_in_main.jsx'
import { AuthProvider } from './context/auth_context.jsx'

function App() {
  return (
    <div className="app-container">
      <AuthProvider>
        <Routes>
          {/* Sign In page */}
          <Route path="/signin" element={<SignInMainBody />} />
          
          {/* Add this new route for password reset */}
          <Route path="/register" element={<SignInMainBody />} />
          
          {/* MeetupQA page */}
          <Route path="/chat" element={<MeetupQA />} />
          
          {/* Redirect root to signin by default */}
          <Route path="/" element={<Navigate to="/signin" replace />} />
          
          {/* You can add more routes as needed */}
        </Routes>
      </AuthProvider>
    </div>
  )
}

export default App
