import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../contexts/FriendsContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

function AddFriends() {
  const { currentUser } = useAuth();
  const { sendFriendRequest, friends, sentRequests, hasSentRequest } = useFriends();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Search users in real-time
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('userName', '>=', searchTerm.toLowerCase()),
          where('userName', '<=', searchTerm.toLowerCase() + '\uf8ff')
        );

        const usersSnapshot = await getDocs(usersQuery);
        const users = usersSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(user => user.id !== currentUser.uid); // Exclude current user

        setSearchResults(users);
      } catch (error) {
        console.error('Error searching users:', error);
      }
      setLoading(false);
    };

    const timeoutId = setTimeout(searchUsers, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentUser]);

  const handleSendRequest = async (user) => {
    try {
      setError('');
      setMessage('');
      await sendFriendRequest(user.id, user);
      setMessage(`Friend request sent to @${user.userName}!`);
      setSearchTerm(''); // Clear search
    } catch (error) {
      setError(error.message);
    }
  };

  const getFriendStatus = (userId) => {
    // Check if already friends
    const isFriend = friends.some(friend => 
      friend.friendId === userId || friend.userId === userId
    );
    if (isFriend) return 'friends';

    // Check if request already sent
    const requestSent = hasSentRequest(userId);
    if (requestSent) return 'request-sent';

    return 'not-friends';
  };

  return (
    <div className="add-friends-container">
      <div className="add-friends-header">
        <button 
          onClick={() => navigate(-1)}
          className="btn-back"
        >
          ← Back
        </button>
        <h2>👥 Add Friends</h2>
      </div>

      <div className="search-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {loading && <div className="search-loading">Searching...</div>}
        </div>

        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
      </div>

      <div className="search-results">
        {searchResults.length === 0 && searchTerm.length >= 2 && !loading && (
          <div className="no-results">
            <p>No users found matching "{searchTerm}"</p>
          </div>
        )}

        {searchResults.map(user => {
          const status = getFriendStatus(user.id);
          
          return (
            <div key={user.id} className="user-card">
              <div className="user-avatar">
                {user.userName?.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <strong>@{user.userName}</strong>
                <span>{user.fullName}</span>
              </div>
              <div className="user-actions">
                {status === 'friends' && (
                  <span className="status-badge friends">Friends</span>
                )}
                {status === 'request-sent' && (
                  <span className="status-badge pending">Request Sent</span>
                )}
                {status === 'not-friends' && (
                  <button
                    onClick={() => handleSendRequest(user)}
                    className="btn-add-friend"
                  >
                    Add Friend
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="add-friends-info">
        <h4>How to add friends:</h4>
        <ul>
          <li>Search for users by their username</li>
          <li>Send a friend request to connect</li>
          <li>They'll need to accept your request</li>
          <li>Once accepted, you can add them to your trips</li>
        </ul>
      </div>
    </div>
  );
}

export default AddFriends;