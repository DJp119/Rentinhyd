// src/app/admin/tolet-boards/page.tsx
// Admin Moderation Page for To-Let Boards

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type PendingBoard = {
  id: string;
  locality: string;
  phone_encrypted: string;
  created_at: string;
  image_path: string;
  status: string;
};

export default function AdminToLetBoardsPage() {
  const [boards, setBoards] = useState<PendingBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tolet-boards');
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || []);
      } else {
        // Fallback / mock data for admin page view
        setBoards([]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'quarantine' | 'delete') => {
    try {
      const res = await fetch(`/api/admin/tolet-boards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setBoards((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert('Action failed');
      }
    } catch {
      alert('Error connecting to server');
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="text-xl font-bold text-textPrimary">hyderabad.rent</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-error/20 text-error rounded">Admin</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/admin" className="text-sm text-textSecondary hover:text-textPrimary">Dashboard</Link>
            <Link href="/admin/listings" className="text-sm text-textSecondary hover:text-textPrimary">Listings</Link>
            <Link href="/admin/tolet-boards" className="text-sm text-accent font-medium">To-Let Boards</Link>
            <Link href="/admin/reports" className="text-sm text-textSecondary hover:text-textPrimary">Reports</Link>
          </nav>
        </div>
      </header>

      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-textPrimary">To-Let Board Moderation</h1>
            <button
              onClick={fetchBoards}
              className="px-3 py-1.5 border border-border text-sm rounded-lg hover:border-accent"
            >
              Refresh
            </button>
          </div>

          {loading && (
            <div className="py-12 text-center text-textMuted">Loading pending boards...</div>
          )}

          {error && (
            <div className="p-4 bg-error/10 text-error rounded-lg mb-6">{error}</div>
          )}

          {!loading && boards.length === 0 && (
            <div className="py-12 text-center text-textMuted bg-backgroundElevated border border-border rounded-xl">
              No pending To-Let boards to review.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-backgroundElevated border border-border rounded-xl overflow-hidden p-4 space-y-4"
                data-testid={`tolet-board-card-${board.id}`}
              >
                <div className="h-48 bg-background rounded-lg flex items-center justify-center border border-border overflow-hidden">
                  <span className="text-textMuted text-xs">Photo Preview ({board.image_path})</span>
                </div>

                <div>
                  <h3 className="font-semibold text-textPrimary capitalize">{board.locality}</h3>
                  <p className="text-xs text-textMuted mt-1">Submitted: {new Date(board.created_at).toLocaleString()}</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleAction(board.id, 'approve')}
                    className="flex-1 py-1.5 bg-success/20 text-success border border-success/40 text-xs font-semibold rounded-lg hover:bg-success/30"
                    data-testid="approve-tolet-button"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(board.id, 'quarantine')}
                    className="flex-1 py-1.5 bg-warning/20 text-warning border border-warning/40 text-xs font-semibold rounded-lg hover:bg-warning/30"
                    data-testid="quarantine-tolet-button"
                  >
                    Quarantine
                  </button>
                  <button
                    onClick={() => handleAction(board.id, 'delete')}
                    className="flex-1 py-1.5 bg-error/20 text-error border border-error/40 text-xs font-semibold rounded-lg hover:bg-error/30"
                    data-testid="delete-tolet-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
