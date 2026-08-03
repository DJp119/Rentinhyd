// src/components/ToLetBoardSheet.tsx
// Bottom sheet for displaying details of a clicked To-Let board pin

'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

type ToLetBoardSheetProps = {
  id: string;
  onClose: () => void;
};

type BoardDetails = {
  id: string;
  locality: string;
  phone: string;
  imageUrl: string;
  expiresAt: string;
};

export function ToLetBoardSheet({ id, onClose }: ToLetBoardSheetProps) {
  const [board, setBoard] = useState<BoardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/tolet-boards/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load board details');
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setBoard(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleReport = async () => {
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'tolet_board',
          targetId: id,
          reason: 'inappropriate',
          turnstileToken: 'mock-turnstile-token',
        }),
      });
      if (res.ok) {
        setReported(true);
      }
    } catch {
      // Ignore report errors in UI
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      data-testid="tolet-board-sheet"
    >
      <div className="bg-backgroundElevated border-t border-border rounded-t-xl p-4 md:p-6 max-h-[85vh] overflow-y-auto max-w-lg mx-auto shadow-2xl">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-border mx-auto rounded-full mb-4" />

        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-400">
              🪧 To-Let Board
            </span>
            <h3 className="text-lg font-bold text-textPrimary capitalize mt-1">
              {board?.locality || 'Locality'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-textMuted hover:text-textPrimary transition-colors"
            aria-label="Close To-Let sheet"
            data-testid="tolet-sheet-close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="py-8 text-center text-textMuted text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent mx-auto mb-2" />
            Loading board details...
          </div>
        )}

        {error && (
          <div className="py-6 text-center text-error text-sm">
            {error}
          </div>
        )}

        {!loading && !error && board && (
          <div className="space-y-4">
            {/* Board Photo */}
            {board.imageUrl && (
              <div className="rounded-lg overflow-hidden bg-background border border-border max-h-64 flex justify-center">
                <img
                  src={board.imageUrl}
                  alt={`To-Let board in ${board.locality}`}
                  className="max-h-64 object-contain"
                />
              </div>
            )}

            {/* Contact Phone & Actions */}
            <div className="p-3 bg-background border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-textMuted block">Contact Number</span>
                <span className="text-lg font-bold text-accent">{board.phone || 'N/A'}</span>
              </div>

              {board.phone && (
                <a
                  href={`tel:${board.phone}`}
                  className="px-4 py-2 bg-accent text-background font-medium rounded-lg text-sm hover:bg-accentHover transition-colors inline-flex items-center gap-1.5"
                  data-testid="tolet-call-button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call
                </a>
              )}
            </div>

            {/* Expiry & Report */}
            <div className="flex items-center justify-between text-xs text-textMuted pt-2 border-t border-border">
              <span>
                Expires {board.expiresAt ? formatDistanceToNow(new Date(board.expiresAt), { addSuffix: true }) : 'soon'}
              </span>
              <button
                onClick={handleReport}
                disabled={reported}
                className="hover:text-error transition-colors underline"
                data-testid="tolet-report-button"
              >
                {reported ? 'Reported' : 'Report Board'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
