'use client';

import { useState, useTransition } from 'react';
import { addTransaction } from '@/lib/actions/transactions';

type Account = { id: number; name: string };
type Category = { id: number; name: string; color: string | null };

export default function AddTransactionDialog({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [accountId, setAccountId] = useState(accounts[0]?.id.toString() || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setAccountId(accounts[0]?.id.toString() || '');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAmount('');
    setIsCredit(false);
    setCategoryId('');
    setNotes('');
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!accountId || !date || !description || isNaN(amountNum) || amountNum <= 0) return;

    startTransition(async () => {
      await addTransaction({
        accountId: parseInt(accountId),
        date,
        description,
        amount: amountNum,
        isCredit,
        categoryId: categoryId ? parseInt(categoryId) : null,
        notes: notes || null,
      });
      reset();
      setOpen(false);
    });
  };

  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        + Add Transaction
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="card"
            style={{ width: '480px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Add Transaction</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Account</label>
                <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)} required>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Transaction description"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    className="form-input"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={isCredit ? 'credit' : 'debit'} onChange={e => setIsCredit(e.target.value === 'credit')}>
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category (Optional)</label>
                <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  <option value="">— None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  style={{ resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Saving…' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
