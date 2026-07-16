'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface VerifyState {
  status: 'loading' | 'success' | 'error';
  message: string;
  resourceType?: 'listing' | 'seeker' | 'identity';
  resourceId?: string;
  details?: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type') || 'verify';

  const [state, setState] = useState<VerifyState>({
    status: 'loading',
    message: 'Verifying...',
  });

  useEffect(() => {
    if (!token) {
      setState({
        status: 'error',
        message: 'Invalid verification link',
        details: 'No token provided in the URL.',
      });
      return;
    }

    async function verify() {
      try {
        const response = await fetch(`/api/verify/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setState({
            status: 'success',
            message: data.message || 'Verified successfully!',
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            details: getDetailsMessage(data.resourceType, data.resourceId),
          });
        } else {
          setState({
            status: 'error',
            message: data.message || 'Verification failed',
            details: data.error || 'The verification token may be invalid or expired.',
          });
        }
      } catch (err) {
        setState({
          status: 'error',
          message: 'Verification failed',
          details: 'Network error. Please try again or request a new verification email.',
        });
      }
    }

    verify();
  }, [token, type]);

  function getDetailsMessage(resourceType?: string, resourceId?: string) {
    switch (resourceType) {
      case 'listing':
        return `Your listing is now live on the map. Resource ID: ${resourceId?.slice(0, 8)}...`;
      case 'seeker':
        return `Your search request is now active. Resource ID: ${resourceId?.slice(0, 8)}...`;
      case 'identity':
        return 'Your email has been verified. You can now post listings and seeker requests.';
      default:
        return '';
    }
  }

  function getActionLink() {
    switch (state.resourceType) {
      case 'listing':
        return state.resourceId ? `/list/${state.resourceId}` : '/map';
      case 'seeker':
        return '/map';
      case 'identity':
        return '/map';
      default:
        return '/map';
    }
  }

  function getActionLabel() {
    switch (state.resourceType) {
      case 'listing':
        return 'View Your Listing';
      case 'seeker':
        return 'Explore Matches';
      case 'identity':
        return 'Start Exploring';
      default:
        return 'Go to Map';
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="card p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-accent border-t-transparent mx-auto mb-6" />
        <h1 className="text-xl font-semibold mb-2">Verifying...</h1>
        <p className="text-textSecondary">Please wait while we verify your token.</p>
      </div>
    );
  }

  return (
    <div className="card p-8 max-w-md w-full text-center">
      {state.status === 'success' && (
        <>
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">Verified Successfully!</h1>
          <p className="text-textSecondary mb-2">{state.message}</p>
          {state.details && <p className="text-sm text-textMuted mb-6">{state.details}</p>}

          <div className="space-y-3">
            <Link href={getActionLink()} className="btn-primary w-full block">
              {getActionLabel()}
            </Link>
            <Link href="/map" className="btn-secondary w-full block">
              Explore the Map
            </Link>
          </div>
        </>
      )}

      {state.status === 'error' && (
        <>
          <div className="w-16 h-16 rounded-full bg-error/15 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">Verification Failed</h1>
          <p className="text-textSecondary mb-2">{state.message}</p>
          {state.details && <p className="text-sm text-textMuted mb-6">{state.details}</p>}

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Try Again
            </button>
            <Link href="/map" className="btn-secondary w-full block">
              Go to Map Anyway
            </Link>
          </div>

          <p className="mt-6 text-sm text-textMuted">
            Need a new verification link?{' '}
            <Link href="/" className="text-accent hover:underline">Return to homepage</Link>
            {' '}and resubmit.
          </p>
        </>
      )}
    </div>
  );
}

function VerifyFallback() {
  return (
    <div className="card p-8 max-w-md w-full text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-3 border-accent border-t-transparent mx-auto mb-6" />
      <h1 className="text-xl font-semibold mb-2">Verifying...</h1>
      <p className="text-textSecondary">Please wait while we verify your token.</p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Suspense fallback={<VerifyFallback />}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}