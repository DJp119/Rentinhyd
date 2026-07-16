'use client';

import { useState } from 'react';
import { ListingForm } from '@/components/forms/ListingForm';
import { toast } from 'sonner';

export default function NewListingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Listing submitted! Check your email to verify.', {
          description: `Verification token: ${result.verificationToken || '(check email)'}`,
          duration: 10000,
        });
      } else {
        toast.error(result.message || 'Failed to submit listing', {
          description: result.error || result.details,
        });
      }
    } catch (err) {
      toast.error('Network error', { description: 'Please try again' });
    } finally {
      setIsSubmitting(false);
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

        <ListingForm
          onSubmit={handleSubmit}
          onCancel={() => window.history.back()}
        />
      </div>
    </div>
  );
}

// Add Link import
import Link from 'next/link';