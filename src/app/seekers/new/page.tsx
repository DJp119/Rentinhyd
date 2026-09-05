'use client';

import { useState } from 'react';
import { SeekerForm } from '@/components/forms/SeekerForm';
import { toast } from 'sonner';
import Link from 'next/link';
import type { SeekerSubmit } from '@/lib/schemas';

export default function NewSeekerPage() {
  const [verificationSent, setVerificationSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (data: SeekerSubmit) => {
    setFormError(null);
    try {
      const response = await fetch('/api/seekers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setVerificationSent(true);
        toast.success('Search request submitted! Check your email to verify.', {
          description: `Verification token sent to your email.`,
          duration: 10000,
        });
      } else {
        const errorMsg = result.message || result.error || result.details || 'Failed to submit search request';
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
          <h1 className="text-3xl font-bold mb-2">Post a Seeker Request</h1>
          <p className="text-textSecondary">
            Looking for a flat or flatmate? Describe your requirements and get matched automatically.
          </p>
        </div>

        {verificationSent && (
          <div data-testid="seeker-verification-sent" className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
            <p className="font-medium">Verification email sent!</p>
            <p className="text-sm opacity-80">Check your inbox to verify and activate your search.</p>
          </div>
        )}

        {formError && (
          <div data-testid="seeker-error" className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <p className="font-medium">Submission failed</p>
            <p className="text-sm opacity-80">{formError}</p>
          </div>
        )}

        <SeekerForm
          onSubmit={handleSubmit}
          onCancel={() => window.history.back()}
        />
      </div>
    </div>
  );
}