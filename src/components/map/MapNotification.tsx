// src/components/map/MapNotification.tsx
// Non-blocking, accessible notification toast for map alerts

'use client';

import { useEffect } from 'react';
import { X, AlertCircle, Info } from 'lucide-react';

export type MapNotificationType = 'info' | 'warning' | 'error';

export type MapNotificationProps = {
  message: string | null;
  type?: MapNotificationType;
  onDismiss: () => void;
  autoDismissMs?: number;
  className?: string;
};

export function MapNotification({
  message,
  type = 'info',
  onDismiss,
  autoDismissMs = 5000,
  className = '',
}: MapNotificationProps) {
  useEffect(() => {
    if (!message || autoDismissMs <= 0) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [message, autoDismissMs, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="map-notification"
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] map-control-surface rounded-xl p-3.5 shadow-xl flex items-center gap-3 animate-slide-up pointer-events-auto border ${
        type === 'error'
          ? 'border-error/40 text-textPrimary'
          : type === 'warning'
          ? 'border-warning/40 text-textPrimary'
          : 'border-border text-textPrimary'
      } ${className}`}
      style={{
        zIndex: 'var(--z-map-notification, 50)',
      }}
    >
      <div className="shrink-0">
        {type === 'error' ? (
          <AlertCircle className="w-5 h-5 text-error" aria-hidden="true" />
        ) : type === 'warning' ? (
          <AlertCircle className="w-5 h-5 text-warning" aria-hidden="true" />
        ) : (
          <Info className="w-5 h-5 text-info" aria-hidden="true" />
        )}
      </div>

      <p className="text-xs sm:text-sm text-textSecondary flex-1 leading-snug">
        {message}
      </p>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        data-testid="map-notification-dismiss"
        className="shrink-0 p-1 text-textMuted hover:text-textPrimary rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
