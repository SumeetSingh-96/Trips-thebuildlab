import React, { useState, useMemo, useEffect } from 'react';
import { useFriends } from '../contexts/FriendsContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function FriendsList() {
  const { pendingRequests, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriends();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const [removingFriend, setRemovingFriend] = useState(null);
  const [friends, setFriends] = useState([]);

  // Get friends where current user is involved (either as userId OR friendId)
  useEffect(() => {
    if (!currentUser) return;

    // Get ALL accepted friendships
    const friendsQuery = query(
      collection(db, 'friends'),
      where('status', '==', 'accepted')
    );

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const allFriendships = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter to get only friendships involving current user
      const userFriendships = allFriendships.filter(friendship => 
        friendship.userId === currentUser.uid || friendship.friendId === currentUser.uid
      );

      // Transform to show friend data correctly
      const friendsData = userFriendships.map(friendship => {
        const isCurrentUserTheSender = friendship.userId === currentUser.uid;
        
        if (isCurrentUserTheSender) {
          // Current user sent the request - friend is the receiver
          return {
            id: friendship.id,
            friendId: friendship.friendId,
            friendUserName: friendship.friendUserName,
            friendFullName: friendship.friendFullName,
            createdAt: friendship.createdAt
          };
        } else {
          // Current user received the request - friend is the sender
          return {
            id: friendship.id,
            friendId: friendship.userId,
            friendUserName: friendship.userUserName,
            friendFullName: friendship.userFullName,
            createdAt: friendship.createdAt
          };
        }
      });

      setFriends(friendsData);
    });

    return unsubscribeFriends;
  }, [currentUser]);

  // Sort pending requests by creation date (newest first)
  const sortedPendingRequests = useMemo(() => {
    return [...pendingRequests].sort((a, b) => 
      new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate())
    );
  }, [pendingRequests]);

  // Sort friends by username alphabetically
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => 
      a.friendUserName?.localeCompare(b.friendUserName)
    );
  }, [friends]);

  const handleRemoveFriend = async (friendId, friendUserName) => {
    if (!window.confirm(`Are you sure you want to remove @${friendUserName} from your friends?`)) {
      return;
    }

    try {
      setRemovingFriend(friendId);
      await removeFriend(friendId);
    } catch (error) {
      alert('Failed to remove friend: ' + error.message);
    } finally {
      setRemovingFriend(null);
    }
  };

  return (
    <div className="friends-list-container">
      <div className="friends-header">
        <h2>👥 Friends</h2>
      </div>

      {/* Tabs */}
      <div className="friends-tabs">
        <button 
          className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends ({sortedFriends.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({sortedPendingRequests.length})
        </button>
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="friends-content">
          <h3>My Friends</h3>
          {sortedFriends.length === 0 ? (
            <div className="empty-state">
              <p>No friends yet. Start adding friends to create trips together!</p>
            </div>
          ) : (
            <div className="friends-grid">
              {sortedFriends.map(friend => (
                <div key={friend.id} className="friend-card">
                  <div className="friend-avatar">
                    {friend.friendUserName?.charAt(0).toUpperCase() || 'F'}
                  </div>
                  <div className="friend-info">
                    <strong>@{friend.friendUserName}</strong>
                    <span>{friend.friendFullName}</span>
                    <div className="friend-actions">
                      <span className="status-badge accepted">Friends</span>
                      <button 
                        onClick={() => handleRemoveFriend(friend.friendId, friend.friendUserName)}
                        disabled={removingFriend === friend.friendId}
                        className="btn-remove-friend"
                        title="Remove friend"
                      >
                        {removingFriend === friend.friendId ? 'Removing...' : '✕'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="requests-content">
          <h3>Friend Requests</h3>
          {sortedPendingRequests.length === 0 ? (
            <div className="empty-state">
              <p>No pending friend requests.</p>
            </div>
          ) : (
            <div className="requests-list">
              {sortedPendingRequests.map(request => (
                <div key={request.id} className="request-card">
                  <div className="request-avatar">
                    {request.userUserName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="request-info">
                    <strong>@{request.userUserName}</strong>
                    <span>{request.userFullName}</span>
                    <small>Sent {request.createdAt?.toDate().toLocaleDateString()}</small>
                    <div className="request-actions">
                      <button 
                        onClick={() => acceptFriendRequest(request.id)}
                        className="btn-accept"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => rejectFriendRequest(request.id)}
                        className="btn-reject"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FriendsList;