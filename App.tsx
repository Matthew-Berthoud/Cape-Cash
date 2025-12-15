import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ReceiptManager from './components/ReceiptManager';
import ExpenseTable from './components/ExpenseTable';
import { AppView, Expense, Receipt, User } from './types';
import { CATEGORIES, DEFAULT_PROJECT } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.AUTH);
  const [user, setUser] = useState<User | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Convert receipts to expenses when moving from Receipt Manager to Expense Table
  // Only process receipts that aren't already linked to an expense to avoid duplicates on re-navigation
  const processReceiptsToExpenses = () => {
    const newExpenses: Expense[] = [];
    const usedReceiptIds = new Set(expenses.flatMap(e => e.linkedReceiptIds));

    receipts.forEach(receipt => {
      // Only auto-create an expense if this receipt isn't already linked
      if (receipt.status === 'completed' && !usedReceiptIds.has(receipt.id)) {
        newExpenses.push({
          id: `exp-${Math.random().toString(36).substr(2, 9)}`,
          date: receipt.extractedDate || new Date().toISOString().split('T')[0],
          amount: receipt.extractedAmount || 0,
          category: receipt.extractedCategory || CATEGORIES[0],
          project: DEFAULT_PROJECT,
          description: receipt.extractedDescription || '',
          linkedReceiptIds: [receipt.id],
          isReviewed: false
        });
      }
    });
    
    // Sort by date descending
    const updatedExpenses = [...expenses, ...newExpenses].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setExpenses(updatedExpenses);
    setView(AppView.EXPENSES);
  };

  const handleUpdateReceipt = (id: string, updates: Partial<Receipt>) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleDeleteReceipt = (id: string) => {
    const isLinked = expenses.some(e => e.linkedReceiptIds.includes(id));
    if (isLinked) {
      if (!window.confirm("This receipt is linked to an expense item. Deleting it will remove it from the expense. Continue?")) {
        return;
      }
      // Remove from expenses
      setExpenses(prev => prev.map(e => ({
        ...e,
        linkedReceiptIds: e.linkedReceiptIds.filter(rid => rid !== id)
      })));
    }
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateExpense = (id: string, field: keyof Expense, value: any) => {
    setExpenses(prev => {
        let updated = prev.map(e => e.id === id ? { ...e, [field]: value } : e);
        
        // Re-sort if date changes
        if (field === 'date') {
            updated = updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return updated;
    });
  };

  const handleLinkReceipts = (expenseId: string, receiptIds: string[]) => {
      setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, linkedReceiptIds: receiptIds } : e));
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (user) {
        setUser({ ...user, ...updates });
    }
  };

  return (
    <>
      {view === AppView.AUTH && (
        <Login onLogin={(u) => { setUser(u); setView(AppView.RECEIPTS); }} />
      )}

      {view === AppView.RECEIPTS && (
        <ReceiptManager 
          receipts={receipts}
          onAddReceipts={(newReceipts) => setReceipts(prev => [...prev, ...newReceipts])}
          onUpdateReceipt={handleUpdateReceipt}
          onDeleteReceipt={handleDeleteReceipt}
          onNavigateNext={processReceiptsToExpenses}
        />
      )}

      {view === AppView.EXPENSES && user && (
        <ExpenseTable 
          expenses={expenses}
          receipts={receipts}
          user={user}
          onUpdateUser={handleUpdateUser}
          onUpdateExpense={handleUpdateExpense}
          onAddExpense={() => setExpenses(prev => [...prev, { // Add to bottom
            id: `exp-${Math.random().toString(36).substr(2, 9)}`,
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            category: CATEGORIES[0],
            project: DEFAULT_PROJECT,
            description: '',
            linkedReceiptIds: [],
            isReviewed: false
          }])}
          onDeleteExpense={(id) => setExpenses(prev => prev.filter(e => e.id !== id))}
          onNavigateBack={() => setView(AppView.RECEIPTS)}
          onLinkReceipts={handleLinkReceipts}
        />
      )}
    </>
  );
};

export default App;