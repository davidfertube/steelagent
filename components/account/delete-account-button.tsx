'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function DeleteAccountButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete account');
        return;
      }

      toast.success('Account deleted successfully');
      window.location.href = '/';
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
      >
        Delete Account
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-red-400 text-sm font-medium">
        This action is permanent and cannot be undone. All your documents, API keys, and subscription will be deleted.
      </p>
      <div>
        <label htmlFor="delete-confirm" className="block text-sm text-gray-400 mb-2">
          Type <span className="text-white font-mono font-bold">DELETE</span> to confirm:
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="DELETE"
          className="w-full px-3 py-2 bg-[#0f0f1e] border border-gray-700 rounded-lg text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleDelete}
          disabled={confirmation !== 'DELETE' || deleting}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? 'Deleting...' : 'Permanently Delete Account'}
        </button>
        <button
          onClick={() => { setShowConfirm(false); setConfirmation(''); }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
