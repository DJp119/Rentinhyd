'use client';

import { useState, useEffect } from 'react';

const CONSENT_KEY = 'rentinhyd_consent';

export function ConsentModal({ onAccept }: { onAccept: () => void }) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  useEffect(() => {
    console.log('[ConsentModal] useEffect running, checking localStorage');
    setMounted(true);
    if (typeof window !== 'undefined') {
      const consented = localStorage.getItem(CONSENT_KEY);
      console.log('[ConsentModal] localStorage consent value:', consented);
      if (!consented) {
        console.log('[ConsentModal] No consent found, setting show=true');
        setShow(true);
      }
    }
  }, []);

  console.log('[ConsentModal] render: mounted=', mounted, 'show=', show);

  // Don't render anything before mounted to avoid hydration mismatch
  if (!mounted) return null;

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setShow(false);
    onAccept();
  };

  // Only show after checking localStorage
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay animate-fade-in" data-testid="consent-modal">
      <div className="bg-backgroundElevated border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-textPrimary mb-2">Let's build world's biggest rental map</h2>
          <p className="text-textSecondary">
            By moving forward to the map, you agree to our{' '}
            <button onClick={() => setActiveTab('privacy')} className="text-accent hover:underline">Privacy Policy</button>
            {' '}and{' '}
            <button onClick={() => setActiveTab('terms')} className="text-accent hover:underline">Terms of Use</button>
            {'.'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-background/50">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'privacy'
                ? 'border-accent text-accent'
                : 'border-transparent text-textMuted hover:text-textSecondary'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'terms'
                ? 'border-accent text-accent'
                : 'border-transparent text-textMuted hover:text-textSecondary'
            }`}
          >
            Terms of Use
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'privacy' ? (
            <div className="prose prose-invert max-w-none space-y-4 text-sm">
              <h3 className="text-lg font-semibold text-textPrimary">Privacy Policy</h3>
              <p className="text-textMuted">Last updated: July 2026</p>

              <section>
                <h4 className="font-semibold text-textPrimary">1. Information We Collect</h4>
                <p className="text-textSecondary">
                  We collect minimal data to operate the rental map:
                </p>
                <ul className="list-disc list-inside text-textSecondary space-y-1">
                  <li><strong>Anonymous rent pins:</strong> Location (jittered ~100-200m), rent range, BHK, furnishing type, locality. No personal identifiers.</li>
                  <li><strong>Listings (optional):</strong> Property details, contact preferences (stored separately with consent), photos you upload.</li>
                  <li><strong>Seeker requests (optional):</strong> Requirements, budget, preferred localities, contact preferences.</li>
                  <li><strong>Technical data:</strong> IP fingerprint (hashed), user agent, request timestamps for abuse prevention.</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">2. How We Use Your Data</h4>
                <ul className="list-disc list-inside text-textSecondary space-y-1">
                  <li>Display aggregated rent pins on the map (jittered for privacy)</li>
                  <li>Match seekers with listings via double-consent introduction</li>
                  <li>Prevent spam/abuse via rate limiting and fingerprinting</li>
                  <li>Send verification emails for listings/seeker requests</li>
                  <li>Analytics: aggregate, non-personal usage statistics</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">3. Data Sharing</h4>
                <p className="text-textSecondary">
                  We do <strong>not</strong> sell your data. Contact details are only shared after <strong>double-consent introduction</strong> (both parties agree).
                  Aggregated, anonymized rent data may be published for market insights.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">4. Data Retention</h4>
                <ul className="list-disc list-inside text-textSecondary space-y-1">
                  <li>Rent pins: 90 days (auto-expire)</li>
                  <li>Listings/Seeker requests: Until withdrawn or 180 days</li>
                  <li>Verification tokens: 24 hours</li>
                  <li>Abuse fingerprints: 30 days</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">5. Your Rights</h4>
                <p className="text-textSecondary">
                  You can request data deletion at any time by emailing us. Anonymous pins cannot be linked back to you.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">6. Security</h4>
                <p className="text-textSecondary">
                  TLS encryption, hashed IP fingerprints, Row Level Security on database, Turnstile bot protection.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">7. Cookies & Local Storage</h4>
                <p className="text-textSecondary">
                  We use <code className="bg-background px-1 rounded">localStorage</code> only for: consent preference, map viewport, form drafts.
                  No tracking cookies.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">8. Contact</h4>
                <p className="text-textSecondary">Questions? Email <a href="mailto:privacy@hyderabad.rent" className="text-accent hover:underline">privacy@hyderabad.rent</a></p>
              </section>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none space-y-4 text-sm">
              <h3 className="text-lg font-semibold text-textPrimary">Terms of Use</h3>
              <p className="text-textMuted">Last updated: July 2026</p>

              <section>
                <h4 className="font-semibold text-textPrimary">1. Acceptance</h4>
                <p className="text-textSecondary">
                  By accessing hyderabad.rent, you agree to these terms. If you disagree, do not use the service.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">2. Service Description</h4>
                <p className="text-textSecondary">
                  hyderabad.rent is a zero-brokerage rental marketplace for Hyderabad. We provide a map-based platform for:
                </p>
                <ul className="list-disc list-inside text-textSecondary space-y-1">
                  <li>Anonymous rent price pins (community-contributed)</li>
                  <li>Verified property listings (whole flats, rooms, flatmates)</li>
                  <li>Seeker requests matched via double-consent introductions</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">3. User Conduct</h4>
                <p className="text-textSecondary">You agree not to:</p>
                <ul className="list-disc list-inside text-textSecondary space-y-1">
                  <li>Post fake, misleading, or fraudulent data</li>
                  <li>Scrape, crawl, or bulk-extract data</li>
                  <li>Harass, spam, or contact users outside the platform</li>
                  <li>Bypass rate limits, Turnstile, or abuse controls</li>
                  <li>Use the service for commercial purposes without permission</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">4. Listings & Seeker Requests</h4>
                <ul className="list-disc list-inside text-textSecondary space-y-1">
                  <li>Listings require email verification. Unverified listings are not published.</li>
                  <li>You control contact preferences (phone, email, in-app) and availability windows.</li>
                  <li>Contact details are only shared after <strong>mutual consent</strong> via our introduction system.</li>
                  <li>You may withdraw listings/requests at any time.</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">5. Rent Pins</h4>
                <ul className="list-disc list-inside text-textSecondary space-y-1">
                  <li>Anonymous, no account required.</li>
                  <li>Jittered ~100-200m for privacy; not exact addresses.</li>
                  <li>Expire after 90 days. Community-moderated.</li>
                  <li>Limited to Hyderabad metro area (100km radius).</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">6. Disclaimers</h4>
                <p className="text-textSecondary">
                  Data is community-contributed and <strong>not verified</strong>. Rents are indicative.
                  We do not guarantee accuracy, availability, or legality of listings.
                  Always verify independently before transactions.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">7. Limitation of Liability</h4>
                <p className="text-textSecondary">
                  hyderabad.rent is provided "as is". We are not liable for disputes, transactions,
                  or decisions made using this platform. Maximum liability: ₹1,000.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">8. Intellectual Property</h4>
                <p className="text-textSecondary">
                  Map data © OpenStreetMap contributors. Rent pins & listings © respective contributors.
                  Platform code & design © hyderabad.rent.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">9. Termination</h4>
                <p className="text-textSecondary">
                  We may suspend access for violations. You may stop using the service anytime.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">10. Governing Law</h4>
                <p className="text-textSecondary">
                  Governed by laws of India. Jurisdiction: Hyderabad courts.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">11. Changes</h4>
                <p className="text-textSecondary">
                  We may update these terms. Continued use constitutes acceptance.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-textPrimary">12. Contact</h4>
                <p className="text-textSecondary">Questions? Email <a href="mailto:legal@hyderabad.rent" className="text-accent hover:underline">legal@hyderabad.rent</a></p>
              </section>
            </div>
          )}

          {/* Helper links */}
          <div className="mt-8 pt-4 border-t border-border flex flex-wrap gap-4 text-sm">
            <a href="/guide" className="text-accent hover:underline">Learn how to use</a>
            <a href="/about" className="text-accent hover:underline">About</a>
            <a href="/contact" className="text-accent hover:underline">Contact</a>
          </div>
        </div>

        {/* Accept Button */}
        <div className="p-6 border-t border-border bg-background/50 flex justify-end">
          <button
            onClick={handleAccept}
            className="btn-primary px-8"
            data-testid="consent-accept"
          >
            I Agree — Enter Map
          </button>
        </div>
      </div>
    </div>
  );
}