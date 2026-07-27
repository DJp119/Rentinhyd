// src/components/ShareButtons.tsx
// Reusable share buttons for pins, listings, seekers

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  copyToClipboard,
  getWhatsAppUrl,
  getPinShareContent,
  type ShareContent,
} from '@/lib/utils';

interface ShareButtonsProps {
  content: ShareContent;
  className?: string;
  showLabel?: boolean;
}

interface ShareButtonsWithPinProps {
  pin: {
    id: string;
    type: 'rent_pin' | 'listing';
    locality: string;
    bhk: string;
    furnishing: string;
    rent?: number;
    rentMin?: number;
    rentMax?: number;
    listingType?: string;
  };
  className?: string;
  showLabel?: boolean;
}

const WHATSAPP_SVG = (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.472.099-.174.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414zM12 2C6.486 2 2 6.486 2 12c0 4.42 2.87 8.166 6.839 9.489.079.027.16.039.239.039.131 0 .259-.02.387-.058l.766-.227c.293-.109.262-.296.163-.438-.085-.125-.447-.625-.447-1.309l-.067-1.323c0-.523.085-.966.466-1.46.378-.494.978-1.269 1.218-1.528.24-.258.41-.386.49-0.9806.079.25.382.86.707 1.206.274.29.734.575 1.41.813.667.15 1.005.06 1.152-.298.149-.355.257-.93.48-1.58.242-.67.36-.949.39-1.006.03-.056.112-.553.25-1.378.148-.865-.345-1.723-.965-2.336-.54-.52-1.175-.78-1.74-.997-.56-.188-1.48-.13-2.109-.13-.593 0-1.33.071-1.98.242-.654.172-1.224.484-1.683.949-.46.464-.588.778-.466 1.13.089.265.32.616.48.458.173-.17.548-.875.813-1.38.252-.47.39-.72.48-.873.09-.157.245-.12.402.03.17.17.328.327.753.617 1.112.755 2.4.85 2.92.85.59 0 1.125-.07 1.61-.218.595-.176 1.04-.507 1.388-.86.358-.36.534-.78.494-1.257-.04-.46-.454-.553-1.18-.806-.724-.25-1.88-.214-2.36-.15z" />
  </svg>
);

const COPY_SVG = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
);

const COPIED_SVG = (
  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export function ShareButtons({ pin, className = '', showLabel = false }: ShareButtonsWithPinProps) {
  const [copied, setCopied] = useState(false);

  const shareContent = getPinShareContent(pin);
  const whatsappUrl = getWhatsAppUrl(shareContent);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareContent.url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors',
          showLabel && 'whitespace-nowrap'
        )}
        aria-label="Share on WhatsApp"
      >
        {WHATSAPP_SVG}
        {showLabel && <span>WhatsApp</span>}
      </a>

      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-backgroundElevated text-textSecondary hover:border-accent/50 hover:text-textPrimary transition-colors',
          showLabel && 'whitespace-nowrap'
        )}
        aria-label={copied ? 'Copied to clipboard' : 'Copy link'}
      >
        {copied ? COPIED_SVG : COPY_SVG}
        {showLabel && <span>{copied ? 'Copied!' : 'Copy Link'}</span>}
      </button>
    </div>
  );
}

// Alternative: accept pre-built share content
export function ShareButtonsFromContent({ content, className = '', showLabel = false }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const whatsappUrl = getWhatsAppUrl(content);

  const handleCopy = async () => {
    const success = await copyToClipboard(content.url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors',
          showLabel && 'whitespace-nowrap'
        )}
        aria-label="Share on WhatsApp"
      >
        {WHATSAPP_SVG}
        {showLabel && <span>WhatsApp</span>}
      </a>

      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-backgroundElevated text-textSecondary hover:border-accent/50 hover:text-textPrimary transition-colors',
          showLabel && 'whitespace-nowrap'
        )}
        aria-label={copied ? 'Copied to clipboard' : 'Copy link'}
      >
        {copied ? COPIED_SVG : COPY_SVG}
        {showLabel && <span>{copied ? 'Copied!' : 'Copy Link'}</span>}
      </button>
    </div>
  );
}