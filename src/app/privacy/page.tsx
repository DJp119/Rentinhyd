// src/app/privacy/page.tsx
// Privacy Notice - DPDP Compliant

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Notice | hyderabad.rent',
  description: 'Privacy notice for hyderabad.rent - DPDP Act compliant. How we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  const lastUpdated = 'July 17, 2026';

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-textPrimary">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className="text-xl font-bold text-textPrimary">hyderabad.rent</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/flats-for-rent-in-hyderabad" className="text-sm text-textSecondary hover:text-textPrimary">Flats for Rent</Link>
              <Link href="/flatmates-in-hyderabad" className="text-sm text-textSecondary hover:text-textPrimary">Flatmates</Link>
              <Link href="/rent-map" className="text-sm text-textSecondary hover:text-textPrimary">Map</Link>
            </nav>
          </div>
        </header>

        <main className="pt-16 pb-12">
          <div className="max-w-3xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-textPrimary mb-4">Privacy Notice</h1>
            <p className="text-textSecondary mb-8">Last updated: {lastUpdated}</p>

            {/* Data Controller */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">1. Data Controller</h2>
              <p className="text-textSecondary">
                hyderabad.rent (the &ldquo;Service&rdquo;) is operated by the hyderabad.rent team.
                Contact: <a href="mailto:privacy@hyderabad.rent" className="text-accent hover:underline">privacy@hyderabad.rent</a>
              </p>
            </section>

            {/* What We Collect */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">2. What We Collect</h2>
              <div className="space-y-4 text-textSecondary">
                <div>
                  <h3 className="font-medium text-textPrimary mb-2">Public Data (Visible on Map)</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Anonymous rent pins: approximate locality, rent range, BHK, furnishing type</li>
                    <li>Verified listings: title, description, rent, BHK, furnishing, amenities, locality (jittered coordinates)</li>
                    <li>Seeker requests: budget range, BHK, move-in window, preferred/excluded localities, lifestyle preferences</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-textPrimary mb-2">Private Data (Encrypted, Never Public)</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Email address (for verification only)</li>
                    <li>Phone number (optional, for contact preferences)</li>
                    <li>Exact coordinates (jittered ~100-200m before display)</li>
                    <li>Contact method preferences and time windows</li>
                    <li>IP fingerprint hash (for abuse detection)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-textPrimary mb-2">Automatically Collected</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Request metadata: timestamp, user agent, referrer</li>
                    <li>Email events: delivery, bounce, complaint (Resend webhooks)</li>
                    <li>Turnstile verification tokens (Cloudflare)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Legal Basis */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">3. Legal Basis (DPDP Act 2023)</h2>
              <div className="space-y-4 text-textSecondary">
                <div className="p-4 bg-backgroundElevated border border-border rounded-xl">
                  <h3 className="font-medium text-textPrimary mb-2">Consent (Section 6)</h3>
                  <p>Email verification, contact preference sharing, marketing communications.</p>
                </div>
                <div className="p-4 bg-backgroundElevated border border-border rounded-xl">
                  <h3 className="font-medium text-textPrimary mb-2">Legitimate Interest (Section 7)</h3>
                  <p>Abuse detection, fraud prevention, platform security, service improvement.</p>
                </div>
                <div className="p-4 bg-backgroundElevated border border-border rounded-xl">
                  <h3 className="font-medium text-textPrimary mb-2">Legal Obligation</h3>
                  <p>Retention of report records, audit logs as required by law.</p>
                </div>
              </div>
            </section>

            {/* How We Use */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">4. How We Use Your Data</h2>
              <ul className="list-disc list-inside space-y-2 text-textSecondary">
                <li>Verify your email and enable listing/seeker submission</li>
                <li>Match seekers with compatible listings (deterministic algorithm)</li>
                <li>Facilitate double-consent contact introduction</li>
                <li>Send transactional emails (verification, match digest, introduction)</li>
                <li>Detect and prevent abuse, spam, broker activity</li>
                <li>Generate aggregate statistics (anonymized, no PII)</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">5. Data Sharing</h2>
              <div className="space-y-4 text-textSecondary">
                <p><strong>We never sell your data.</strong></p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>With your consent:</strong> Contact details shared only after BOTH parties accept a match (double-consent).</li>
                  <li><strong>Service providers:</strong> Supabase (database), Resend (email), Cloudflare (Turnstile, CDN). All under DPAs.</li>
                  <li><strong>Legal requirements:</strong> When required by law or to protect rights/safety.</li>
                  <li><strong>Public aggregates:</strong> Anonymized statistics (median rent, counts) with no identifying information.</li>
                </ul>
              </div>
            </section>

            {/* Retention */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">6. Retention</h2>
              <div className="space-y-4 text-textSecondary">
                <ul className="list-disc list-inside space-y-2">
                  <li>Verified listings: Until rented/withdrawn/expired, then 30 days</li>
                  <li>Seeker requests: Until matched/expired/withdrawn, then 30 days</li>
                  <li>Rent pins: 90 days (auto-expire)</li>
                  <li>Email events: 30 days (raw inbound email deleted unless tied to report)</li>
                  <li>Audit logs: 1 year</li>
                  <li>Moderation records: 2 years</li>
                </ul>
              </div>
            </section>

            {/* Your Rights */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">7. Your Rights (DPDP Act)</h2>
              <div className="space-y-4 text-textSecondary">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Access:</strong> Request copy of your data</li>
                  <li><strong>Correction:</strong> Update inaccurate data</li>
                  <li><strong>Deletion:</strong> Request erasure (subject to legal retention)</li>
                  <li><strong>Withdrawal:</strong> Withdraw consent anytime (stops future processing)</li>
                  <li><strong>Grievance:</strong> Contact our Grievance Officer at <a href="mailto:grievance@hyderabad.rent" className="text-accent hover:underline">grievance@hyderabad.rent</a></li>
                </ul>
                <p>Exercise rights via <Link href="/consent" className="text-accent hover:underline">Consent Portal</Link> or email us.</p>
              </div>
            </section>

            {/* Security */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">8. Security</h2>
              <ul className="list-disc list-inside space-y-2 text-textSecondary">
                <li>Private fields encrypted at rest (AES-256-GCM)</li>
                <li>Row Level Security (RLS) on all database tables</li>
                <li>HTTPS everywhere, CSP, HSTS headers</li>
                <li>Signed action tokens (HMAC-SHA256, constant-time verify)</li>
                <li>Rate limiting, Turnstile challenge on all submissions</li>
              </ul>
            </section>

            {/* Cookies */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">9. Cookies & Tracking</h2>
              <p className="text-textSecondary mb-2">We use minimal cookies:</p>
              <ul className="list-disc list-inside space-y-2 text-textSecondary">
                <li>Essential: Session management, CSRF protection</li>
                <li>Turnstile: Cloudflare challenge cookie (privacy-preserving)</li>
                <li>No advertising cookies, no third-party analytics cookies</li>
              </ul>
            </section>

            {/* Children */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">10. Children</h2>
              <p className="text-textSecondary">
                Service not directed to individuals under 18. We do not knowingly collect data from minors.
              </p>
            </section>

            {/* Changes */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">11. Changes to This Notice</h2>
              <p className="text-textSecondary">
                Material changes notified via email (if verified) and posted here with updated date.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">12. Contact</h2>
              <address className="not-italic text-textSecondary">
                <p>Data Protection Officer: <a href="mailto:dpo@hyderabad.rent" className="text-accent hover:underline">dpo@hyderabad.rent</a></p>
                <p>Grievance Officer: <a href="mailto:grievance@hyderabad.rent" className="text-accent hover:underline">grievance@hyderabad.rent</a></p>
                <p>General: <a href="mailto:privacy@hyderabad.rent" className="text-accent hover:underline">privacy@hyderabad.rent</a></p>
              </address>
            </section>

            {/* Scam Warning */}
            <div className="p-4 bg-warningSoft border border-warning/30 rounded-xl text-center">
              <p className="text-sm text-warning font-medium">
                ⚠ Never pay before visiting and independently verifying the property. Report scams.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-backgroundElevated border-t border-border py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-textMuted text-sm">
            <p>hyderabad.rent — Zero brokerage rental marketplace</p>
            <p className="mt-1">
              <Link href="/privacy" className="text-accent hover:underline mr-4">Privacy</Link>
              <Link href="/terms" className="text-accent hover:underline mr-4">Terms</Link>
              <Link href="/consent" className="text-accent hover:underline">Consent</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}