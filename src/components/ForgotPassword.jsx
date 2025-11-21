import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setMessage('');
      setError('');
      setLoading(true);

      // STEP 1: Check if user exists in Firestore
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setError('User is not registered with this email.');
        setLoading(false);
        return;
      }

      // STEP 2: If user exists, send password reset email
      await resetPassword(email);
      setMessage('Password reset email sent! Check your inbox for instructions.');
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('User is not registered with this email.');
      } else {
        setError('Failed to reset password: ' + error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-form">
        <h2>Reset Password</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your registered email"
            />
          </div>
          <button disabled={loading} type="submit">
            {loading ? 'Checking...' : 'Reset Password'}
          </button>
        </form>
        <div className="forgot-password-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;