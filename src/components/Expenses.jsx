import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

function Expenses() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [currentUserData, setCurrentUserData] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  
  // State for new expense form
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // State for edit expense
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch current user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;
      
      try {
        const userQuery = query(
          collection(db, 'users'), 
          where('email', '==', currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          setCurrentUserData(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [currentUser]);

  // Fetch trips where user is involved
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

  // Fetch expenses when trip is selected
  useEffect(() => {
    if (!selectedTrip) return;

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('tripId', '==', selectedTrip.id)
    );

    const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(expensesData);
    });

    return unsubscribe;
  }, [selectedTrip]);

  // Set paidBy to current user when trip is selected
  useEffect(() => {
    if (selectedTrip && currentUser) {
      setPaidBy(currentUser.uid);
      
      // Select all participants by default
      setSelectedParticipants(selectedTrip.participants || []);
    }
  }, [selectedTrip, currentUser]);

  // Check if user can edit/delete expense
  const canEditExpense = (expense) => {
    return expense.createdBy === currentUser.uid;
  };

  // Edit Expense
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setIsEditMode(true);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setPaidBy(expense.paidBy);
    setSelectedParticipants(expense.participants || []);
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingExpense(null);
    setIsEditMode(false);
    setDescription('');
    setAmount('');
    setPaidBy(currentUser?.uid || '');
    setSelectedParticipants(selectedTrip?.participants || []);
    setMessage('');
    setError('');
  };

  // Update Expense
  const handleUpdateExpense = async (e) => {
    e.preventDefault();

    if (!description.trim() || !amount || selectedParticipants.length === 0) {
      setError('Please fill all fields and select at least one participant');
      return;
    }

    try {
      setMessage('');
      setError('');

      await updateDoc(doc(db, 'expenses', editingExpense.id), {
        description: description.trim(),
        amount: parseFloat(amount),
        paidBy: paidBy,
        participants: selectedParticipants,
        updatedAt: new Date()
      });

      // Reset form
      handleCancelEdit();
      setMessage('Expense updated successfully!');
      
    } catch (error) {
      console.error('Error updating expense:', error);
      setError('Failed to update expense');
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId, expenseDescription) => {
    if (!window.confirm(`Are you sure you want to delete expense "${expenseDescription}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
      setMessage('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError('Failed to delete expense');
    }
  };

  // Handle participant selection
  const handleParticipantToggle = (participantId) => {
    setSelectedParticipants(prev => {
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      } else {
        return [...prev, participantId];
      }
    });
  };

  // Add new expense
  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!description.trim() || !amount || selectedParticipants.length === 0) {
      setError('Please fill all fields and select at least one participant');
      return;
    }

    try {
      setMessage('');
      setError('');

      await addDoc(collection(db, 'expenses'), {
        tripId: selectedTrip.id,
        description: description.trim(),
        amount: parseFloat(amount),
        paidBy: paidBy,
        participants: selectedParticipants,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Reset form
      setDescription('');
      setAmount('');
      setPaidBy(currentUser.uid);
      
      setMessage('Expense added successfully!');
      
    } catch (error) {
      console.error('Error adding expense:', error);
      setError('Failed to add expense');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out');
    }
  };

  // Calculate total expenses
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);

  if (!currentUserData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="expenses-container">
      {/* Header */}
      <div className="expenses-header">
        <h2>💰 Expense Manager</h2>
        <p>Logged as: <strong>{currentUserData.userName}</strong></p>
        
        <div className="header-actions">
          <button 
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/trips')}
            className="btn-primary"
          >
            Trips
          </button>
          <button 
            onClick={handleLogout}
            className="btn-secondary"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Trip Selection */}
      <div className="trip-selection-section">
        <h3>Select Trip</h3>
        {trips.length === 0 ? (
          <p>No trips found. Create a trip first!</p>
        ) : (
          <div className="trips-list">
            {trips.map(trip => (
              <div 
                key={trip.id}
                className={`trip-item ${selectedTrip?.id === trip.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTrip(trip);
                  handleCancelEdit(); // Reset form when switching trips
                }}
              >
                <strong>{trip.tripName}</strong>
                <small>Participants: {trip.participantUsernames?.join(', ')}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTrip && (
        <>
          {/* Expense Form */}
          <div className="expense-form-section">
            <h3>{isEditMode ? 'Edit Expense' : 'Add New Expense'}</h3>
            
            {message && <div className="success">{message}</div>}
            {error && <div className="error">{error}</div>}

            <form onSubmit={isEditMode ? handleUpdateExpense : handleAddExpense} className="expense-form">
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dinner, Fuel, Hotel, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Paid By *</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  required
                >
                  {selectedTrip.participants.map(participantId => {
                    const participant = selectedTrip.participantUsernames?.find(
                      (username, index) => selectedTrip.participants[index] === participantId
                    );
                    return (
                      <option key={participantId} value={participantId}>
                        {participant || participantId}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Split Between *</label>
                <div className="participants-checkboxes">
                  {selectedTrip.participants.map(participantId => {
                    const participant = selectedTrip.participantUsernames?.find(
                      (username, index) => selectedTrip.participants[index] === participantId
                    );
                    return (
                      <label key={participantId} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(participantId)}
                          onChange={() => handleParticipantToggle(participantId)}
                        />
                        {participant || participantId}
                        {participantId === currentUser.uid && ' (You)'}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-actions">
                {isEditMode ? (
                  <>
                    <button type="submit" className="btn-primary">
                      Update Expense
                    </button>
                    <button 
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="submit" className="btn-primary">
                    Add Expense
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Expenses Summary */}
          <div className="expenses-summary-section">
            <h3>Expenses Summary</h3>
            <div className="total-expenses">
              <strong>Total Expenses: ₹{totalExpenses.toFixed(2)}</strong>
            </div>

            {expenses.length === 0 ? (
              <p>No expenses added yet.</p>
            ) : (
              <div className="expenses-list">
                {expenses.map(expense => (
                  <div key={expense.id} className="expense-item">
                    <div className="expense-header">
                      <div className="expense-details">
                        <strong>{expense.description}</strong>
                        <span>₹{expense.amount.toFixed(2)}</span>
                      </div>
                      {canEditExpense(expense) && (
                        <div className="expense-actions">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="btn-edit"
                            title="Edit expense"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id, expense.description)}
                            className="btn-delete"
                            title="Delete expense"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="expense-meta">
                      <small>
                        Paid by: {expense.paidBy === currentUser.uid ? 'You' : 
                        selectedTrip.participantUsernames?.find(
                          (username, index) => selectedTrip.participants[index] === expense.paidBy
                        ) || 'Someone'}
                      </small>
                      <small>Split between: {expense.participants?.length} people</small>
                      {expense.updatedAt && expense.updatedAt !== expense.createdAt && (
                        <small>Updated: {expense.updatedAt.toDate().toLocaleDateString()}</small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Expenses;