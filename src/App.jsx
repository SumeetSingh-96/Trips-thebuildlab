import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FriendsProvider } from './contexts/FriendsContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Trips from './components/Trips';
import Expenses from './components/Expenses';
import CalculationDashboard from './components/CalculationDashboard';
import ForgotPassword from './components/ForgotPassword';
import VerifyEmail from './components/VerifyEmail';
import AddFriends from './components/AddFriends';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <FriendsProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/trips" element={
                <PrivateRoute>
                  <Trips />
                </PrivateRoute>
              } />
              <Route path="/expenses" element={
                <PrivateRoute>
                  <Expenses />
                </PrivateRoute>
              } />
              <Route path="/calculations" element={
                <PrivateRoute>
                  <CalculationDashboard />
                </PrivateRoute>
              } />
              <Route path="/add-friends" element={
                <PrivateRoute>
                  <AddFriends />
                </PrivateRoute>
              } />
            </Routes>
          </div>
        </FriendsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;