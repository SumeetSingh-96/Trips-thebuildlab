import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import { deleteDoc } from 'firebase/firestore';
import { getDoc } from 'firebase/firestore';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  getDocs
} from 'firebase/firestore';

const FriendsContext = createContext();

export function useFriends() {
  return useContext(FriendsContext);
}

export function FriendsProvider({ children }) {
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  // Get user's friends and requests
  useEffect(() => {
    if (!currentUser) return;

    // Friends where status is 'accepted'
    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', currentUser.uid),
      where('status', '==', 'accepted')
    );

    // Pending requests (received)
    const pendingQuery = query(
      collection(db, 'friends'),
      where('friendId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    // Sent requests
    const sentQuery = query(
      collection(db, 'friends'),
      where('userId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFriends(friendsData);
    });

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const pendingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingRequests(pendingData);
    });

    const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
      const sentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSentRequests(sentData);
    });

    return () => {
      unsubscribeFriends();
      unsubscribePending();
      unsubscribeSent();
    };
  }, [currentUser]);

  // Send friend request
const sendFriendRequest = async (friendId, friendData) => {
  try {
    // Get current user data from Firestore for accurate information
    const currentUserQuery = query(
      collection(db, 'users'),
      where('email', '==', currentUser.email)
    );
    const currentUserSnapshot = await getDocs(currentUserQuery);
    const currentUserData = currentUserSnapshot.docs[0]?.data();

    // Create friend request document (User A → User B)
    await addDoc(collection(db, 'friends'), {
      userId: currentUser.uid,
      friendId: friendId,
      status: 'pending',
      requestedBy: currentUser.uid,
      
      // Current user info (the one sending request)
      userFullName: currentUserData?.fullName || currentUser.displayName,
      userUserName: currentUserData?.userName || 'Unknown',
      userEmail: currentUser.email,
      
      // Friend info (the one receiving request)
      friendFullName: friendData.fullName,
      friendUserName: friendData.userName,
      friendEmail: friendData.email,
      
      createdAt: new Date(),
      updatedAt: new Date()
    });

  } catch (error) {
    throw new Error('Failed to send friend request: ' + error.message);
  }
};

  // Accept friend request
// Update acceptFriendRequest function - SIMPLIFIED VERSION
const acceptFriendRequest = async (requestId) => {
  try {
    // Simply update the existing request to 'accepted'
    await updateDoc(doc(db, 'friends', requestId), {
      status: 'accepted',
      updatedAt: new Date()
    });

    // DON'T create a reverse friendship document
    // Both users will see the same friendship document

  } catch (error) {
    throw new Error('Failed to accept friend request: ' + error.message);
  }
};

  // Reject friend request
  const rejectFriendRequest = async (requestId) => {
    try {
      await updateDoc(doc(db, 'friends', requestId), {
        status: 'rejected',
        updatedAt: new Date()
      });
    } catch (error) {
      throw new Error('Failed to reject friend request: ' + error.message);
    }
  };

  // Check if users are friends
  const areFriends = (userId1, userId2) => {
    return friends.some(friend => 
      (friend.userId === userId1 && friend.friendId === userId2) ||
      (friend.userId === userId2 && friend.friendId === userId1)
    );
  };

  // Check if friend request already sent
  const hasSentRequest = (friendId) => {
    return sentRequests.some(request => request.friendId === friendId);
  };

  // Add this function to your FriendsContext
const removeFriend = async (friendId) => {
  try {
    // Find both friendship documents
    const friendshipQuery = query(
      collection(db, 'friends'),
      where('status', '==', 'accepted')
    );
    
    const friendshipSnapshot = await getDocs(friendshipQuery);
    
    // Find both friendship documents
    const friendshipsToDelete = friendshipSnapshot.docs.filter(doc => {
      const data = doc.data();
      return (
        (data.userId === currentUser.uid && data.friendId === friendId) ||
        (data.userId === friendId && data.friendId === currentUser.uid)
      );
    });

    // Delete both friendship documents
    const deletePromises = friendshipsToDelete.map(friendshipDoc => 
      deleteDoc(doc(db, 'friends', friendshipDoc.id))
    );

    await Promise.all(deletePromises);

  } catch (error) {
    throw new Error('Failed to remove friend: ' + error.message);
  }
};
  const value = {
  friends,
  pendingRequests,
  sentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend, // ADD THIS
  areFriends,
  hasSentRequest
};

  return (
    <FriendsContext.Provider value={value}>
      {children}
    </FriendsContext.Provider>
  );
}