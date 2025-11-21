import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  
  // If no user, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // If user exists but email not verified, redirect to verification page
  if (!currentUser.emailVerified) {
    return <Navigate to="/verify-email" />;
  }
  
  // If user exists and email verified, show the protected content
  return children;
}

export default PrivateRoute;