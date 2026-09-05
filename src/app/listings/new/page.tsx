'use client';

import { useState } from 'react';
import { ListingForm } from '@/components/forms/ListingForm';
import { toast } from 'sonner';
import type { ListingSubmit } from '@/lib/schemas';
import Link from 'next/link';

export default function NewListingPage() {
  const [verificationSent, setVerificationSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (data: ListingSubmit) => {
    setFormError(null);
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setVerificationSent(true);
        toast.success('Listing submitted! Check your email to verify.', {
          description: `Verification token: ${result.verificationToken || '(check email)'}`,
          duration: 10000,
        });
      } else {
        const errorMsg = result.message || result.error || result.details || 'Failed to submit listing';
        setFormError(errorMsg);
        toast.error(errorMsg, {
          description: result.error || result.details,
        });
      }
    } catch (err) {
      const errorMsg = 'Network error - Please try again';
      setFormError(errorMsg);
      toast.error('Network error', { description: 'Please try again' });
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/map" className="inline-flex items-center gap-1 text-textMuted hover:text-textSecondary mb-4 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Map
          </Link>
          <h1 className="text-3xl font-bold mb-2">Post a Verified Listing</h1>
          <p className="text-textSecondary">
            List your whole flat or room. Email verification required. No broker fees.
          </p>
        </div>

        {verificationSent && (
          <div data-testid="listing-verification-sent" className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
            <p className="font-medium">Verification email sent!</p>
            <p className="text-sm opacity-80">Check your inbox to verify and publish your listing.</p>
          </div>
        )}

        {formError && (
          <div data-testid="listing-error" className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <p className="font-medium">Submission failed</p>
            <p className="text-sm opacity-80">{formError}</p>
          </div>
        )}

        <ListingForm
          onSubmit={handleSubmit}
          onCancel={() => window.history.back()}
        />
      </div>
    </div>
  );
}