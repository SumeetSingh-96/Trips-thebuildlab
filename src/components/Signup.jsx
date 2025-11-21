import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    userName: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  
  const { signup, verifyEmail } = useAuth();
  const navigate = useNavigate();

  // Allowed characters: uppercase, lowercase, numbers, hyphen, underscore, dot
  const isValidUsername = (username) => {
    const validRegex = /^[a-zA-Z0-9._-]*$/;
    return validRegex.test(username);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });

    // Real-time username validation
    if (name === 'userName') {
      if (value.length === 0) {
        setUsernameError('');
      } else if (!isValidUsername(value)) {
        setUsernameError('Only letters, numbers, hyphens (-), underscores (_), and dots (.) are allowed.');
      } else {
        setUsernameError('');
      }
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setMessage('');
    setUsernameError('');

    // Validation checks
    if (formData.password !== formData.passwordConfirm) {
      return setError('Passwords do not match');
    }
    
    if (formData.userName.length < 3) {
      return setError('Username must be at least 3 characters');
    }

    if (!isValidUsername(formData.userName)) {
      return setUsernameError('Only letters, numbers, hyphens (-), underscores (_), and dots (.) are allowed.');
    }
    
    try {
      setLoading(true);

      // STEP 1: Check if username already exists
      const usernameQuery = query(
        collection(db, 'users'),
        where('userName', '==', formData.userName)
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setError('Username already taken. Please choose another one.');
        setLoading(false);
        return;
      }

      // STEP 2: Create user (Firebase handles email uniqueness)
      const userCredential = await signup(formData.email, formData.password);
      const user = userCredential.user;

      // STEP 3: Send email verification
      await verifyEmail();
      
      // STEP 4: Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: formData.fullName,
        userName: formData.userName,
        email: formData.email,
        emailVerified: false,
        createdAt: new Date()
      });

      // Show success message instead of navigating
      setMessage('Account created successfully! Verification email sent. Please check your inbox and verify your email address.');
      
      // Reset form
      setFormData({
        fullName: '',
        userName: '',
        email: '',
        password: '',
        passwordConfirm: ''
      });

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Email is already registered.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Failed to create account: ' + error.message);
      }
    }
    
    setLoading(false);
  }

  // Check if form can be submitted
  const canSubmit = !loading && 
                    formData.userName.length >= 3 && 
                    isValidUsername(formData.userName) && 
                    formData.password === formData.passwordConfirm && 
                    formData.password.length >= 6;

  return (
    <div className="signup-container">
      <div className="signup-form">
        <h2>Sign Up</h2>
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <label>Username *</label>
            <input 
              type="text" 
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              required 
              placeholder="Username"
              className={usernameError ? 'input-error' : ''}
            />
            {usernameError && <div className="username-error">{usernameError}</div>}
            <div className="username-hint">
              Must be at least 3 characters. Allowed: A-Z, a-z, 0-9, - _ .
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              required 
              minLength="6"
            />
          </div>
          <div className="form-group">
            <label>Password Confirmation</label>
            <input 
              type="password" 
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required 
              minLength="6"
            />
          </div>
          <button 
            disabled={!canSubmit} 
            type="submit"
            className={!canSubmit ? 'btn-disabled' : ''}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <div className="signup-links">
          <Link to="/login">Already have an account? Log In</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;