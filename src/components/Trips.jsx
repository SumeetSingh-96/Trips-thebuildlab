import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../contexts/FriendsContext';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

function Trips() {
  const { currentUser, logout } = useAuth();
  const { friends, sendFriendRequest } = useFriends();
  const navigate = useNavigate();

  const [tripName, setTripName] = useState('');
  const [participantsInput, setParticipantsInput] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [trips, setTrips] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [nonFriends, setNonFriends] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNonFriends, setShowNonFriends] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingTrip, setEditingTrip] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch current user data and all users
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user details
        const userQuery = query(
          collection(db, 'users'), 
          where('email', '==', currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          setCurrentUserData(userData);
        }

        // Fetch all users for auto-complete
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllUsers(usersList);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Filter users based on input - SEPARATE FRIENDS AND NON-FRIENDS
  useEffect(() => {
    if (participantsInput.trim() === '') {
      setFilteredUsers([]);
      setNonFriends([]);
      setShowSuggestions(false);
      setShowNonFriends(false);
      return;
    }

    // Get friend IDs for filtering
    const friendIds = friends.map(friend => friend.friendId);

    // Filter friends
    const friendUsers = allUsers.filter(user =>
      user.userName.toLowerCase().includes(participantsInput.toLowerCase()) &&
      !selectedParticipants.find(p => p.id === user.id) &&
      user.id !== currentUser?.uid &&
      friendIds.includes(user.id)
    );

    // Filter non-friends
    const nonFriendUsers = allUsers.filter(user =>
      user.userName.toLowerCase().includes(participantsInput.toLowerCase()) &&
      !selectedParticipants.find(p => p.id === user.id) &&
      user.id !== currentUser?.uid &&
      !friendIds.includes(user.id)
    );

    setFilteredUsers(friendUsers);
    setNonFriends(nonFriendUsers);
    setShowSuggestions(friendUsers.length > 0);
    setShowNonFriends(nonFriendUsers.length > 0);
  }, [participantsInput, allUsers, selectedParticipants, currentUser, friends]);

  // Fetch trips in real-time
  useEffect(() => {
    if (!currentUser) return;

    const tripsQuery = query(
      collection(db, 'trips'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(tripsQuery, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrips(tripsData);
    });

    return unsubscribe;
  }, [currentUser]);

  // Check if user can edit/delete trip
  const canEditTrip = (trip) => {
    return trip.createdBy === currentUser.uid;
  };

  // Edit Trip
  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setIsEditMode(true);
    setTripName(trip.tripName);
    
    // Set selected participants (excluding current user)
    const participantUsers = trip.participantUsernames
      .filter((username, index) => trip.participants[index] !== currentUser.uid)
      .map((username, index) => {
        const userId = trip.participants[index];
        return allUsers.find(user => user.id === userId) || {
          id: userId,
          userName: username,
          fullName: username
        };
      })
      .filter(user => user); // Remove undefined

    setSelectedParticipants(participantUsers);
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingTrip(null);
    setIsEditMode(false);
    setTripName('');
    setSelectedParticipants([]);
    setParticipantsInput('');
    setMessage('');
    setError('');
  };

  // Update Trip
  const handleUpdateTrip = async () => {
    setMessage('');
    setError('');

    if (!tripName.trim()) {
      setError('Trip name is required');
      return;
    }

    try {
      // Include current user as participant
      const allParticipantIds = [
        currentUser.uid,
        ...selectedParticipants.map(p => p.id)
      ];

      const allParticipantUsernames = [
        currentUserData.userName,
        ...selectedParticipants.map(p => p.userName)
      ];

      await updateDoc(doc(db, 'trips', editingTrip.id), {
        tripName: tripName.trim(),
        participants: allParticipantIds,
        participantUsernames: allParticipantUsernames,
        updatedAt: new Date()
      });

      // Reset form
      handleCancelEdit();
      setMessage('Trip updated successfully!');

    } catch (error) {
      console.error('Error updating trip:', error);
      setError('Failed to update trip');
    }
  };

  // Delete Trip
  const handleDeleteTrip = async (tripId, tripName) => {
    if (!window.confirm(`Are you sure you want to delete trip "${tripName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // First, delete all expenses associated with this trip
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('tripId', '==', tripId)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      
      const deleteExpensePromises = expensesSnapshot.docs.map(expenseDoc =>
        deleteDoc(doc(db, 'expenses', expenseDoc.id))
      );

      await Promise.all(deleteExpensePromises);

      // Then delete the trip
      await deleteDoc(doc(db, 'trips', tripId));
      
      setMessage('Trip deleted successfully!');
    } catch (error) {
      console.error('Error deleting trip:', error);
      setError('Failed to delete trip');
    }
  };

  // Rest of the existing functions (handleAddParticipant, handleSendFriendRequest, etc.)
  const handleAddParticipant = (user = null) => {
    setMessage('');
    setError('');

    if (user) {
      if (!selectedParticipants.find(p => p.id === user.id)) {
        setSelectedParticipants(prev => [...prev, user]);
      }
    } else {
      const foundUser = allUsers.find(u => 
        u.userName.toLowerCase() === participantsInput.toLowerCase()
      );
      
      if (foundUser) {
        if (!selectedParticipants.find(p => p.id === foundUser.id)) {
          setSelectedParticipants(prev => [...prev, foundUser]);
        }
      } else {
        setError('User not found. Please select from suggestions.');
        return;
      }
    }

    setParticipantsInput('');
    setShowSuggestions(false);
    setShowNonFriends(false);
  };

  const handleSendFriendRequest = async (user) => {
    try {
      setMessage('');
      setError('');
      await sendFriendRequest(user.id, user);
      setMessage(`Friend request sent to @${user.userName}! Once they accept, you can add them to trips.`);
      setParticipantsInput('');
      setShowSuggestions(false);
      setShowNonFriends(false);
    } catch (error) {
      setError('Failed to send friend request: ' + error.message);
    }
  };

  const handleRemoveParticipant = (userId) => {
    setSelectedParticipants(prev => prev.filter(p => p.id !== userId));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddParticipant();
    }
  };

  const handleCreateTrip = async () => {
    setMessage('');
    setError('');

    if (!tripName.trim()) {
      setError('Trip name is required');
      return;
    }

    try {
      const allParticipantIds = [
        currentUser.uid,
        ...selectedParticipants.map(p => p.id)
      ];

      const allParticipantUsernames = [
        currentUserData.userName,
        ...selectedParticipants.map(p => p.userName)
      ];

      await addDoc(collection(db, 'trips'), {
        tripName: tripName.trim(),
        createdBy: currentUser.uid,
        createdByUsername: currentUserData.userName,
        participants: allParticipantIds,
        participantUsernames: allParticipantUsernames,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Reset form
      setTripName('');
      setSelectedParticipants([]);
      setParticipantsInput('');

      setMessage('Trip created successfully!');

    } catch (error) {
      console.error('Error creating trip:', error);
      setError('Failed to create trip');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out');
    }
  };

  if (!currentUserData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="trips-container">
      {/* Header */}
      <div className="trips-header">
        <div className="user-info">
          Logged as: <strong>{currentUserData.userName}</strong>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            View Dashboard
          </button>
          <button 
            onClick={() => navigate('/expenses')}
            className="btn-primary"
          >
            Expenses
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="trips-content">
        {/* Create/Edit Trip Form */}
        <div className="create-trip-section">
          <h2>{isEditMode ? 'Edit Trip' : 'Create New Trip'}</h2>
          
          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label>Created By (You)</label>
            <input
              type="text"
              value={currentUserData.userName}
              readOnly
              className="readonly-input"
            />
          </div>

          <div className="form-group">
            <label>Trip Name *</label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Enter trip name"
              required
            />
          </div>

          <div className="form-group">
            <label>Add Participants (Friends Only)</label>
            <div className="participant-input-group">
              <input
                type="text"
                value={participantsInput}
                onChange={(e) => setParticipantsInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search your friends by username..."
              />
              <button 
                type="button" 
                onClick={() => handleAddParticipant()}
                className="btn-add"
              >
                Add
              </button>
            </div>
            
            {/* Friends Suggestions */}
            {showSuggestions && (
              <div className="suggestions-section">
                <h5>Your Friends</h5>
                <div className="suggestions-dropdown">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="suggestion-item friend-suggestion"
                      onClick={() => handleAddParticipant(user)}
                    >
                      <div className="suggestion-content">
                        <div className="user-avatar-small">
                          {user.userName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <strong>@{user.userName}</strong>
                          <span>{user.fullName}</span>
                        </div>
                        <small className="friend-badge">Friend</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Non-Friends Suggestions */}
            {showNonFriends && (
              <div className="suggestions-section">
                <h5>Send Friend Request</h5>
                <div className="non-friends-dropdown">
                  {nonFriends.map(user => (
                    <div key={user.id} className="non-friend-card">
                      <div className="suggestion-content">
                        <div className="user-avatar-small">
                          {user.userName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <strong>@{user.userName}</strong>
                          <span>{user.fullName}</span>
                        </div>
                        <button
                          onClick={() => handleSendFriendRequest(user)}
                          className="btn-send-request"
                        >
                          Send Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected participants */}
            {selectedParticipants.length > 0 && (
              <div className="selected-participants">
                <h4>Participants ({selectedParticipants.length + 1}):</h4>
                <div className="participant-tag current-user">
                  {currentUserData.userName} (you)
                </div>
                {selectedParticipants.map(user => (
                  <div key={user.id} className="participant-tag">
                    {user.userName}
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(user.id)}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            {isEditMode ? (
              <>
                <button 
                  onClick={handleUpdateTrip}
                  className="btn-primary"
                  disabled={selectedParticipants.length === 0}
                >
                  Update Trip
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={handleCreateTrip}
                className="btn-primary"
                disabled={selectedParticipants.length === 0}
              >
                Create Trip
              </button>
            )}
          </div>
        </div>

        {/* Trips List */}
        <div className="trips-list-section">
          <h2>Your Trips ({trips.length})</h2>
          
          {trips.length === 0 ? (
            <p>No trips found. Create your first trip!</p>
          ) : (
            <div className="trips-grid">
              {trips.map(trip => (
                <div key={trip.id} className="trip-card">
                  <div className="trip-header">
                    <h3>{trip.tripName}</h3>
                    {canEditTrip(trip) && (
                      <div className="trip-actions">
                        <button
                          onClick={() => handleEditTrip(trip)}
                          className="btn-edit"
                          title="Edit trip"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTrip(trip.id, trip.tripName)}
                          className="btn-delete"
                          title="Delete trip"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="trip-meta">
                    <small>Created by: {trip.createdByUsername}</small>
                    <small>
                      Participants: {trip.participantUsernames?.join(', ') || 'None'}
                    </small>
                    {trip.updatedAt && (
                      <small>Updated: {trip.updatedAt.toDate().toLocaleDateString()}</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Trips;