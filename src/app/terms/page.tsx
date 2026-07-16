// src/app/terms/page.tsx
// Terms of Service with Anti-Brokerage Disclaimer

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | hyderabad.rent',
  description: 'Terms of service for hyderabad.rent - Zero brokerage rental marketplace. Anti-brokerage policy included.',
};

export default function TermsPage() {
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
            <h1 className="text-4xl font-bold text-textPrimary mb-4">Terms of Service</h1>
            <p className="text-textSecondary mb-8">Last updated: {lastUpdated}</p>

            {/* Acceptance */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">1. Acceptance</h2>
              <p className="text-textSecondary">
                By accessing or using hyderabad.rent (&ldquo;Service&rdquo;), you agree to these Terms.
                If you do not agree, do not use the Service.
              </p>
            </section>

            {/* Anti-Brokerage */}
            <section className="mb-10 p-6 bg-errorSoft border border-error/30 rounded-xl">
              <h2 className="text-xl font-semibold text-error mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                2. Zero Brokerage Policy — Strictly Enforced
              </h2>
              <div className="space-y-3 text-textSecondary">
                <p><strong>No brokers. No brokerage fees. Ever.</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Only property owners and genuine flatmates may list.</li>
                  <li>Any listing posted by a broker/agent will be removed and the account banned.</li>
                  <li>Users reporting broker activity are prioritized in moderation.</li>
                  <li>We reserve the right to verify ownership/tenancy at any time.</li>
                </ul>
                <p className="text-warning font-medium">⚠ If you encounter a broker posing as an owner, report immediately.</p>
              </div>
            </section>

            {/* Service Description */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">3. Service Description</h2>
              <p className="text-textSecondary mb-2">
                hyderabad.rent is a rental marketplace connecting:
              </p>
              <ul className="list-disc list-inside space-y-1 text-textSecondary">
                <li>Property owners listing whole flats or rooms</li>
                <li>Flatmates seeking roommates</li>
                <li>Seekers posting requirements</li>
              </ul>
              <p className="text-textSecondary mt-2">
                We provide: anonymous rent pins, verified listings, seeker requests, deterministic matching,
                and double-consent contact introduction. We are NOT a party to any rental agreement.
              </p>
            </section>

            {/* User Obligations */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">4. Your Obligations</h2>
              <ul className="list-disc list-inside space-y-2 text-textSecondary">
                <li>Provide accurate, truthful information</li>
                <li>List only properties you own or legitimately occupy</li>
                <li>One active seeker request per verified email</li>
                <li>No spam, fraud, scraping, or automated access</li>
                <li>No impersonation or false representation</li>
                <li>Respect other users&apos; privacy and contact preferences</li>
              </ul>
            </section>

            {/* Verification */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">5. Verification & Accounts</h2>
              <p className="text-textSecondary mb-2">
                No traditional accounts. Identity established via:
              </p>
              <ul className="list-disc list-inside space-y-1 text-textSecondary">
                <li>Email verification (24-hour token expiry)</li>
                <li>Signed action tokens for sensitive operations (7-day expiry)</li>
                <li>Turnstile challenge on all submissions</li>
                <li>IP fingerprinting for abuse detection</li>
              </ul>
              <p className="text-textSecondary mt-2">
                You are responsible for securing your email. Compromised email = compromised listings.
              </p>
            </section>

            {/* Matching */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">6. Matching & Introductions</h2>
              <ul className="list-disc list-inside space-y-2 text-textSecondary">
                <li>Deterministic algorithm: geography, budget, BHK, timing, lifestyle</li>
                <li>Daily digest emails (one per person, not per candidate)</li>
                <li>Double-consent required: BOTH parties must accept within 7 days</li>
                <li>Contact details shared ONLY after mutual acceptance</li>
                <li>Either party may withdraw anytime before introduction</li>
                <li>Introduction email includes chosen contact method and time window</li>
              </ul>
            </section>

            {/* Content License */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">7. Content License</h2>
              <p className="text-textSecondary">
                You retain ownership. By submitting, you grant us a worldwide, non-exclusive, royalty-free license to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-textSecondary">
                <li>Display, distribute, and match your content</li>
                <li>Create derivative works (aggregated statistics, anonymized)</li>
                <li>Use for service improvement and abuse detection</li>
              </ul>
            </section>

            {/* Prohibited Content */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">8. Prohibited Content</h2>
              <ul className="list-disc list-inside space-y-1 text-textSecondary">
                <li>Broker/agent listings (see Section 2)</li>
                <li>Fake, misleading, or duplicate listings</li>
                <li>Scam attempts, advance fee fraud</li>
                <li>Discriminatory preferences (protected characteristics)</li>
                <li>Personal contact info in public fields</li>
                <li>Illegal activity</li>
              </ul>
            </section>

            {/* Reporting */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">9. Reporting & Moderation</h2>
              <p className="text-textSecondary mb-2">
                Report violations via the report button or email. Reasons:
              </p>
              <ul className="list-disc list-inside space-y-1 text-textSecondary">
                <li>Fake listing</li>
                <li>Broker activity</li>
                <li>Scam/fraud</li>
                <li>Inappropriate content</li>
                <li>Other</li>
              </ul>
              <p className="text-textSecondary mt-2">
                Moderation actions: quarantine, approve, ban, delete. All decisions logged in audit trail.
              </p>
            </section>

            {/* Disclaimers */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">10. Disclaimers</h2>
              <ul className="list-disc list-inside space-y-2 text-textSecondary">
                <li><strong>No warranty:</strong> Service provided &ldquo;as is&rdquo; without warranties of any kind</li>
                <li><strong>Not a party:</strong> We are not party to rental agreements. No liability for disputes.</li>
                <li><strong>Verify independently:</strong> Always visit property, verify ownership, read agreement before paying</li>
                <li><strong>Third-party links:</strong> Not responsible for external sites</li>
                <li><strong>Availability:</strong> Service may have downtime. No SLA guaranteed.</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">11. Limitation of Liability</h2>
              <p className="text-textSecondary">
                To the maximum extent permitted by law, hyderabad.rent is not liable for any indirect,
                incidental, special, consequential, or punitive damages, or loss of profits/data/use.
                Total liability limited to ₹1,000 or amount paid to us in last 12 months.
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">12. Indemnification</h2>
              <p className="text-textSecondary">
                You agree to indemnify and hold harmless hyderabad.rent from claims arising from
                your use of the Service, violation of these Terms, or violation of any third-party rights.
              </p>
            </section>

            {/* Termination */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">13. Termination</h2>
              <p className="text-textSecondary">
                We may suspend or terminate access for violations. You may stop using anytime.
                Verification tokens and action tokens expire per their terms.
              </p>
            </section>

            {/* Governing Law */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">14. Governing Law</h2>
              <p className="text-textSecondary">
                Governed by laws of India. Exclusive jurisdiction: Courts of Hyderabad, Telangana.
              </p>
            </section>

            {/* Changes */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">15. Changes</h2>
              <p className="text-textSecondary">
                We may update these Terms. Material changes notified via email (if verified) and posted with updated date.
                Continued use = acceptance.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">16. Contact</h2>
              <address className="not-italic text-textSecondary">
                <p>Questions: <a href="mailto:legal@hyderabad.rent" className="text-accent hover:underline">legal@hyderabad.rent</a></p>
                <p>Reports: <a href="mailto:reports@hyderabad.rent" className="text-accent hover:underline">reports@hyderabad.rent</a></p>
              </address>
            </section>

            {/* Scam Warning */}
            <div className="p-4 bg-warningSoft border border-warning/30 rounded-xl text-center">
              <p className="text-sm text-warning font-medium">
                ⚠ Never pay before visiting and independently verifying the property.
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