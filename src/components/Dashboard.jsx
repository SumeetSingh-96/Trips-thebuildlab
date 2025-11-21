import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import FriendsList from './FriendsList';

function Dashboard() {
  const { currentUser, logout, deleteUser } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.log('Failed to log out');
    }
  }

  async function handleDeleteAccount() {
    if (!password) {
      setError('Please enter your password to confirm deletion');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      await deleteUser(password);
      // User will be automatically redirected after deletion
    } catch (error) {
      setError('Failed to delete account: ' + error.message);
      console.error('Delete account error:', error);
    } finally {
      setIsDeleting(false);
    }
  }

  function goToTrips() {
    navigate('/trips');
  }

  function goToExpenses() {
    navigate('/expenses');
  }

  function goToCalculations() {
    navigate('/calculations');
  }

  function goToAddFriends() {
    navigate('/add-friends');
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <h2>Welcome to Trip Calculator!</h2>
        <p>Hello, {currentUser?.email}!</p>
        
        <div className="dashboard-actions">
          <button onClick={goToTrips} className="btn-primary">
            Manage Trips
          </button>
          
          <button onClick={goToExpenses} className="btn-primary">
            Manage Expenses
          </button>

          <button onClick={goToCalculations} className="btn-primary">
            Calculate Settlements
          </button>

          <button onClick={goToAddFriends} className="btn-primary">
            Add Friends
          </button>
          
          <button onClick={handleLogout} className="btn-secondary">
            Log Out
          </button>

          {/* Delete Account Button */}
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            className="btn-danger"
            style={{backgroundColor: '#dc3545', color: 'white'}}
          >
            Delete Account
          </button>
        </div>

        <div className="dashboard-sections">
          <div className="dashboard-info">
            <h3>How to use:</h3>
            <ul>
              <li><strong>Manage Trips:</strong> Create trips and add friends as participants</li>
              <li><strong>Manage Expenses:</strong> Add expenses to your trips and track spending</li>
              <li><strong>Calculate Settlements:</strong> See who owes whom and get settlement suggestions</li>
              <li><strong>Add Friends:</strong> Connect with friends to add them to your trips</li>
              <li>All your data is saved securely in the cloud</li>
            </ul>
          </div>

          <FriendsList />
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Your Account</h3>
            
            <div className="warning-message">
              <p style={{color: '#dc3545', fontWeight: 'bold'}}>
                ⚠️ This action cannot be undone!
              </p>
              <p>All your data including trips, expenses, and friend connections will be permanently deleted.</p>
            </div>

            {error && (
              <div className="error-message" style={{color: '#dc3545', margin: '10px 0'}}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Enter your password to confirm:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="form-input"
              />
            </div>

            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPassword('');
                  setError('');
                }}
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn-danger"
                disabled={isDeleting}
                style={{backgroundColor: '#dc3545', color: 'white'}}
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;