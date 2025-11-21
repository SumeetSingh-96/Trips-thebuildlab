import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function VerifyEmail() {
  const { currentUser, verifyEmail, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResendVerification = async () => {
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await verifyEmail();
      setMessage('Verification email sent! Please check your inbox.');
    } catch (error) {
      setError('Failed to send verification email: ' + error.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out');
    }
  };

  return (
    <div className="verify-email-container">
      <div className="verify-email-form">
        <h2>Verify Your Email</h2>
        <div className="verification-info">
          <p>Hello <strong>{currentUser?.email}</strong>,</p>
          <p>Please verify your email address to access the application.</p>
          <p>A verification email has been sent to your registered email address.</p>
        </div>
        
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        
        <div className="verification-actions">
          <button 
            onClick={handleResendVerification} 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>
          
          <button 
            onClick={handleLogout}
            className="btn-secondary"
          >
            Logout
          </button>
        </div>
        
        <div className="verification-help">
          <p><strong>Didn't receive the email?</strong></p>
          <ul>
            <li>Check your spam folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>Wait a few minutes and try again</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;