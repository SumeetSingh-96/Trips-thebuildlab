import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';

function CalculationDashboard() {
  const { currentUser } = useAuth();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [calculations, setCalculations] = useState(null);

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

    const fetchTrips = async () => {
      try {
        const tripsQuery = query(
          collection(db, 'trips'),
          where('participants', 'array-contains', currentUser.uid)
        );
        const tripsSnapshot = await getDocs(tripsQuery);
        const tripsData = tripsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrips(tripsData);
      } catch (error) {
        console.error('Error fetching trips:', error);
      }
    };

    fetchTrips();
  }, [currentUser]);

  // Fetch expenses when trip is selected
  useEffect(() => {
    if (!selectedTrip) return;

    const fetchExpenses = async () => {
      try {
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('tripId', '==', selectedTrip.id)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setExpenses(expensesData);
        
        // Calculate settlements when expenses are loaded
        calculateSettlements(expensesData, selectedTrip);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }
    };

    fetchExpenses();
  }, [selectedTrip]);

  // Your Google Apps Script calculation logic adapted for React
  const calculateSettlements = (expensesData, trip) => {
    if (!expensesData || expensesData.length === 0) {
      setCalculations(null);
      return;
    }

    // Step 1: Calculate per-person totals (same as your Apps Script)
    const persons = {};
    
    expensesData.forEach(expense => {
      const paidBy = expense.paidBy;
      const amount = expense.amount;
      const participants = expense.participants || [];
      
      // Initialize person if not exists
      if (!persons[paidBy]) {
        persons[paidBy] = { paid: 0, share: 0 };
      }
      
      // Add to paid amount
      persons[paidBy].paid += amount;
      
      // Calculate share for each participant
      const participantCount = participants.length || 1;
      const perShare = amount / participantCount;
      
      participants.forEach(participantId => {
        if (!persons[participantId]) {
          persons[participantId] = { paid: 0, share: 0 };
        }
        persons[participantId].share += perShare;
      });
    });

    // Step 2: Calculate net amounts and round (same as your round2 function)
    const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
    
    const nets = [];
    Object.keys(persons).forEach(personId => {
      const paid = round2(persons[personId].paid);
      const share = round2(persons[personId].share);
      const net = round2(paid - share);
      
      // Get username for display
      const username = trip.participantUsernames?.find(
        (name, index) => trip.participants[index] === personId
      ) || personId;
      
      nets.push({ 
        id: personId,
        name: username,
        paid, 
        share, 
        net 
      });
    });

    // Step 3: Calculate suggested settlements (same greedy algorithm)
    const creditors = nets.filter(x => x.net > 0).sort((a, b) => b.net - a.net);
    const debtors = nets.filter(x => x.net < 0).sort((a, b) => a.net - b.net);
    
    const credits = creditors.map(c => ({ ...c }));
    const debts = debtors.map(d => ({ ...d }));
    
    const transactions = [];
    let cIdx = 0, dIdx = 0;
    
    while (dIdx < debts.length && cIdx < credits.length) {
      const debtor = debts[dIdx];
      const creditor = credits[cIdx];
      const owe = -debtor.net;
      const receive = creditor.net;
      const pay = round2(Math.min(owe, receive));
      
      transactions.push({ 
        from: debtor.name, 
        to: creditor.name, 
        amount: pay 
      });
      
      debtor.net = round2(debtor.net + pay);
      creditor.net = round2(creditor.net - pay);
      
      if (Math.abs(debtor.net) < 0.001) dIdx++;
      if (Math.abs(creditor.net) < 0.001) cIdx++;
    }

    // Step 4: Calculate trip total
    const tripTotal = round2(expensesData.reduce((sum, expense) => sum + expense.amount, 0));

    // Set the calculations state
    setCalculations({
      persons: nets,
      transactions,
      tripTotal,
      expenseCount: expensesData.length
    });
  };

  const formatNumber = (num) => {
    if (isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  if (!currentUserData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="calculation-container">
      <div className="calculation-header">
        <h2> Trip Calculations & Settlements</h2>
        <p>Logged as: <strong>{currentUserData.userName}</strong></p>
      </div>

      {/* Trip Selection */}
      <div className="trip-selection-section">
        <h3>Select Trip to Calculate</h3>
        {trips.length === 0 ? (
          <p>No trips found. Create a trip first!</p>
        ) : (
          <div className="trips-list">
            {trips.map(trip => (
              <div 
                key={trip.id}
                className={`trip-item ${selectedTrip?.id === trip.id ? 'selected' : ''}`}
                onClick={() => setSelectedTrip(trip)}
              >
                <strong>{trip.tripName}</strong>
                <small>Participants: {trip.participantUsernames?.join(', ')}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTrip && calculations && (
        <div className="calculations-results">
          {/* Trip Summary Card */}
          <div className="calculation-card">
            <h3>
              {selectedTrip.tripName} 
              <span className="badge">Total ₹{formatNumber(calculations.tripTotal)}</span>
            </h3>
            <div className="muted">
              {calculations.expenseCount} expenses • {calculations.persons.length} participants
            </div>

            {/* Per-person Table */}
            <div className="table-section">
              <h4>Per-Person Summary</h4>
              <table className="calculations-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Paid</th>
                    <th>Share</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.persons.sort((a, b) => a.name.localeCompare(b.name)).map(person => (
                    <tr key={person.id}>
                      <td className={person.id === currentUser.uid ? 'current-user' : ''}>
                        {person.name} {person.id === currentUser.uid && '(You)'}
                      </td>
                      <td>₹{formatNumber(person.paid)}</td>
                      <td>₹{formatNumber(person.share)}</td>
                      <td className={
                        person.net > 0 ? 'credit' : 
                        person.net < 0 ? 'debit' : ''
                      }>
                        ₹{formatNumber(person.net)}
                        {person.net > 0 && ' (owed)'}
                        {person.net < 0 && ' (owes)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Suggested Settlements */}
            <div className="settlements-section">
              <h4>Suggested Settlements</h4>
              {calculations.transactions.length === 0 ? (
                <p className="muted">No transactions needed — everything is settled! 🎉</p>
              ) : (
                <table className="settlements-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.transactions.map((transaction, index) => (
                      <tr key={index}>
                        <td className={
                          transaction.from.includes(currentUserData.userName) ? 'current-user' : ''
                        }>
                          {transaction.from} 
                          {transaction.from.includes(currentUserData.userName) && ' (You)'}
                        </td>
                        <td className={
                          transaction.to.includes(currentUserData.userName) ? 'current-user' : ''
                        }>
                          {transaction.to}
                          {transaction.to.includes(currentUserData.userName) && ' (You)'}
                        </td>
                        <td className="amount">₹{formatNumber(transaction.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Expense Breakdown */}
            <div className="expense-breakdown">
              <h4>Expense Breakdown</h4>
              {expenses.length === 0 ? (
                <p className="muted">No expenses recorded yet.</p>
              ) : (
                <div className="expenses-list">
                  {expenses.map(expense => (
                    <div key={expense.id} className="expense-item">
                      <div className="expense-main">
                        <strong>{expense.description}</strong>
                        <span>₹{formatNumber(expense.amount)}</span>
                      </div>
                      <div className="expense-details">
                        <small>Paid by: {expense.paidBy === currentUser.uid ? 'You' : 'Someone'}</small>
                        <small>Split between: {expense.participants?.length} people</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTrip && !calculations && (
        <div className="no-data">
          <p>No expenses found for this trip. Add some expenses to see calculations.</p>
        </div>
      )}
    </div>
  );
}

export default CalculationDashboard;
