'use client';

import { useState } from 'react';
import { SeekerForm } from '@/components/forms/SeekerForm';
import { toast } from 'sonner';
import Link from 'next/link';
import type { SeekerSubmit } from '@/lib/schemas';

export default function NewSeekerPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: SeekerSubmit) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/seekers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Search request submitted! Check your email to verify.', {
          description: `Verification token sent to your email.`,
          duration: 10000,
        });
      } else {
        toast.error(result.message || 'Failed to submit search request', {
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
          <h1 className="text-3xl font-bold mb-2">Post a Seeker Request</h1>
          <p className="text-textSecondary">
            Looking for a flat or flatmate? Describe your requirements and get matched automatically.
          </p>
        </div>

        <SeekerForm
          onSubmit={handleSubmit}
          onCancel={() => window.history.back()}
        />
      </div>
    </div>
  );
}