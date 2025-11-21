import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase/config';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function verifyEmail() {
    return sendEmailVerification(auth.currentUser);
  }

  function updateUserProfile(profile) {
    return updateProfile(auth.currentUser, profile);
  }

  // Delete user account with verification
  async function deleteUser(password) {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user logged in');
    }

    if (!user.email) {
      throw new Error('User email not available');
    }

    try {
      // 1. Re-authenticate user for security
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // 2. Delete user data from Firestore
      await deleteUserData(user.uid);

      // 3. Delete the user account from Firebase Auth
      await firebaseDeleteUser(user);

      // 4. Logout and clear state
      await logout();
      
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Helper function to delete all user data from Firestore
  async function deleteUserData(userId) {
    try {
      // Delete user document
      const userDocRef = doc(db, 'users', userId);
      await deleteDoc(userDocRef);

      // Delete user's trips
      const tripsQuery = query(
        collection(db, 'trips'), 
        where('createdBy', '==', userId)
      );
      const tripsSnapshot = await getDocs(tripsQuery);
      const tripDeletions = tripsSnapshot.docs.map(tripDoc => 
        deleteDoc(tripDoc.ref)
      );

      // Delete user's expenses
      const expensesQuery = query(
        collection(db, 'expenses'), 
        where('paidBy', '==', userId)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenseDeletions = expensesSnapshot.docs.map(expenseDoc => 
        deleteDoc(expenseDoc.ref)
      );

      // Delete user from friends lists
      const friendsQuery = query(
        collection(db, 'users'),
        where('friends', 'array-contains', userId)
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      const friendUpdates = friendsSnapshot.docs.map(async (friendDoc) => {
        const friendData = friendDoc.data();
        const updatedFriends = friendData.friends.filter(friendId => friendId !== userId);
        await updateDoc(friendDoc.ref, { friends: updatedFriends });
      });

      // Wait for all deletions to complete
      await Promise.all([
        ...tripDeletions,
        ...expenseDeletions,
        ...friendUpdates
      ]);

      console.log('User data deleted successfully');
    } catch (error) {
      console.error('Error deleting user data:', error);
      // Don't throw here - we still want to delete the auth account
      // even if some data cleanup fails
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    verifyEmail,
    updateUserProfile,
    deleteUser // Make sure this is included
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}