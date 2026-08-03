// src/components/MapAddMenu.tsx
// Reusable bottom-sheet component for empty map taps

'use client';

import { useEffect, useRef } from 'react';
import { MapLocation } from './Map';

type MapAddMenuProps = {
  location: MapLocation | null;
  onClose: () => void;
  onRent: () => void;
  onList: () => void;
  onSeek: () => void;
  onToLet: () => void;
};

export function MapAddMenu({
  location,
  onClose,
  onRent,
  onList,
  onSeek,
  onToLet,
}: MapAddMenuProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!location) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-overlay z-40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="add-menu-backdrop"
      />

      {/* Menu Popup */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-menu-title"
        className="fixed bottom-0 left-0 right-0 z-50 md:top-1/2 md:left-1/2 md:bottom-auto md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-backgroundElevated border-t md:border border-border rounded-t-xl md:rounded-xl p-6 shadow-2xl animate-slide-up focus:outline-none"
        tabIndex={-1}
        data-testid="map-add-menu"
      >
        {/* Drag handle for mobile */}
        <div className="w-12 h-1 bg-border mx-auto rounded-full mb-5 md:hidden" />

        <div className="flex items-center justify-between mb-6">
          <h2
            id="add-menu-title"
            className="text-xl font-bold text-textPrimary"
          >
            Add something here
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-textMuted hover:text-textPrimary hover:bg-muted/15 focus:bg-muted/15 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Close add menu"
            data-testid="add-menu-close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Action 1: Rent */}
          <button
            onClick={onRent}
            className="flex flex-col items-start w-full text-left p-4 rounded-xl border border-border hover:border-accent hover:bg-muted/10 focus:bg-muted/10 focus:border-accent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            aria-label="What rent are you paying? Anonymous rent data point - takes 10 seconds, helps everyone"
            data-testid="action-rent"
          >
            <span className="text-base font-semibold text-textPrimary flex items-center gap-2">
              <span>💰</span> What rent are you paying?
            </span>
            <span className="text-xs text-textSecondary mt-1 ml-6 leading-relaxed">
              Anonymous rent data point — takes 10 seconds, helps everyone
            </span>
          </button>

          {/* Action 2: List */}
          <button
            onClick={onList}
            className="flex flex-col items-start w-full text-left p-4 rounded-xl border border-border hover:border-accent hover:bg-muted/10 focus:bg-muted/10 focus:border-accent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            aria-label="List my flat. Reach active seekers - free, direct contact, no broker"
            data-testid="action-list"
          >
            <span className="text-base font-semibold text-textPrimary flex items-center gap-2">
              <span>🏠</span> List my flat
            </span>
            <span className="text-xs text-textSecondary mt-1 ml-6 leading-relaxed">
              Reach active seekers — free, direct contact, no broker
            </span>
          </button>

          {/* Action 3: Seek */}
          <button
            onClick={onSeek}
            className="flex flex-col items-start w-full text-left p-4 rounded-xl border border-border hover:border-accent hover:bg-muted/10 focus:bg-muted/10 focus:border-accent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            aria-label="I'm looking for a flat. Drop a seeker pin - matches land in your inbox within minutes"
            data-testid="action-seek"
          >
            <span className="text-base font-semibold text-textPrimary flex items-center gap-2">
              <span>🔍</span> I'm looking for a flat
            </span>
            <span className="text-xs text-textSecondary mt-1 ml-6 leading-relaxed">
              Drop a seeker pin — matches land in your inbox within minutes
            </span>
          </button>

          {/* Action 4: To-Let */}
          <button
            onClick={onToLet}
            className="flex flex-col items-start w-full text-left p-4 rounded-xl border border-border hover:border-accent hover:bg-muted/10 focus:bg-muted/10 focus:border-accent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Spotted a To-Let board? Snap it - the board's photo + phone number go live on the map."
            data-testid="action-tolet"
          >
            <span className="text-base font-semibold text-textPrimary flex items-center gap-2">
              <span>🪧</span> Spotted a To-Let board?
            </span>
            <span className="text-xs text-textSecondary mt-1 ml-6 leading-relaxed">
              Snap it — the board's photo + phone number go live on the map.
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
