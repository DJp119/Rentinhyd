// src/app/consent/page.tsx
// Consent / Withdrawal / Access / Deletion Portal

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Consent & Data Rights | hyderabad.rent',
  description: 'Manage your consent, request data access, correction, or deletion. DPDP Act compliant portal.',
};

export default function ConsentPage() {
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
          </div>
        </header>

        <main className="pt-16 pb-12">
          <div className="max-w-3xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-textPrimary mb-4">Consent & Data Rights</h1>
            <p className="text-textSecondary mb-8">
              Exercise your rights under the DPDP Act 2023. Manage consent, access your data, request correction or deletion.
            </p>

            {/* Current Consent Status */}
            <section className="mb-10 p-6 bg-backgroundElevated border border-border rounded-xl">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Your Current Consents</h2>
              <div className="space-y-4 text-textSecondary">
                <ConsentRow
                  label="Email Verification"
                  description="Required to list properties or post seeker requests"
                  status="active"
                  required
                />
                <ConsentRow
                  label="Transactional Emails"
                  description="Verification, match digests, introduction emails"
                  status="active"
                  required
                />
                <ConsentRow
                  label="Contact Sharing (Double-Consent)"
                  description="Share contact details only after mutual match acceptance"
                  status="active"
                  required={false}
                  withdrawable
                />
                <ConsentRow
                  label="Matching Digests"
                  description="Daily email with compatible matches"
                  status="active"
                  required={false}
                  withdrawable
                />
              </div>
              <p className="text-sm text-textMuted mt-4">
                * Required consents cannot be withdrawn without deleting your listings/seeker requests.
              </p>
            </section>

            {/* Withdraw Consent */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Withdraw Consent</h2>
              <p className="text-textSecondary mb-4">
                Withdrawing optional consents stops future processing. Required consents (verification, transactional emails)
                cannot be withdrawn while you have active listings or seeker requests.
              </p>
              <form className="space-y-4" id="withdraw-form">
                <div>
                  <label htmlFor="withdraw-email" className="block text-sm font-medium text-textSecondary mb-1">
                    Verified Email
                  </label>
                  <input
                    type="email"
                    id="withdraw-email"
                    placeholder="your@email.com"
                    className="w-full input-field"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="withdraw-type" className="block text-sm font-medium text-textSecondary mb-1">
                    Consent to Withdraw
                  </label>
                  <select id="withdraw-type" className="w-full input-field">
                    <option value="matching_digest">Matching Digests</option>
                    <option value="contact_sharing">Contact Sharing (future matches)</option>
                    <option value="all_optional">All Optional Consents</option>
                  </select>
                </div>
                <button type="submit" className="btn-secondary w-full">
                  Submit Withdrawal Request
                </button>
              </form>
            </section>

            {/* Data Access Request */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Request Data Access (Right to Access)</h2>
              <p className="text-textSecondary mb-4">
                Receive a copy of all personal data we hold about you (listings, seeker requests, matches, contact prefs, email events).
              </p>
              <form className="space-y-4" id="access-form">
                <div>
                  <label htmlFor="access-email" className="block text-sm font-medium text-textSecondary mb-1">
                    Verified Email
                  </label>
                  <input
                    type="email"
                    id="access-email"
                    placeholder="your@email.com"
                    className="w-full input-field"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Request Data Copy
                </button>
              </form>
            </section>

            {/* Data Correction */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Request Data Correction (Right to Correction)</h2>
              <p className="text-textSecondary mb-4">
                Correct inaccurate or incomplete personal data.
              </p>
              <form className="space-y-4" id="correction-form">
                <div>
                  <label htmlFor="correction-email" className="block text-sm font-medium text-textSecondary mb-1">
                    Verified Email
                  </label>
                  <input
                    type="email"
                    id="correction-email"
                    placeholder="your@email.com"
                    className="w-full input-field"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="correction-field" className="block text-sm font-medium text-textSecondary mb-1">
                    Field to Correct
                  </label>
                  <select id="correction-field" className="w-full input-field">
                    <option value="contact_phone">Contact Phone</option>
                    <option value="contact_email">Contact Email</option>
                    <option value="contact_method">Contact Method</option>
                    <option value="contact_window">Contact Time Window</option>
                    <option value="listing_details">Listing Details (title, description, rent, etc.)</option>
                    <option value="seeker_details">Seeker Preferences</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="correction-value" className="block text-sm font-medium text-textSecondary mb-1">
                    Correct Value
                  </label>
                  <textarea
                    id="correction-value"
                    rows={3}
                    placeholder="Enter the correct information..."
                    className="w-full input-field"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Submit Correction Request
                </button>
              </form>
            </section>

            {/* Data Deletion */}
            <section className="mb-10 p-6 bg-errorSoft border border-error/30 rounded-xl">
              <h2 className="text-xl font-semibold text-error mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Request Data Deletion (Right to Erasure)
              </h2>
              <p className="text-textSecondary mb-4">
                Permanently delete your personal data. This will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-textSecondary mb-4">
                <li>Deactivate all your listings and seeker requests</li>
                <li>Delete contact preferences and private fields</li>
                <li>Anonymize your matches and introductions (audit trail retained)</li>
                <li>Cancel pending verification tokens</li>
              </ul>
              <p className="text-textSecondary mb-4">
                Note: Some data may be retained for legal obligations (audit logs, moderation records, reports) per our retention policy.
              </p>
              <form className="space-y-4" id="deletion-form">
                <div>
                  <label htmlFor="deletion-email" className="block text-sm font-medium text-textSecondary mb-1">
                    Verified Email
                  </label>
                  <input
                    type="email"
                    id="deletion-email"
                    placeholder="your@email.com"
                    className="w-full input-field"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="deletion-confirm" className="w-4 h-4 accent-accent" required />
                    <span className="text-sm text-textSecondary">
                      I understand this is irreversible and will deactivate all my listings/seeker requests
                    </span>
                  </label>
                </div>
                <button type="submit" className="btn-error w-full">
                  Request Account Deletion
                </button>
              </form>
            </section>

            {/* Grievance Redressal */}
            <section className="mb-10 p-6 bg-infoSoft border border-info/30 rounded-xl">
              <h2 className="text-xl font-semibold text-info mb-4">Grievance Redressal</h2>
              <p className="text-textSecondary mb-2">
                If you&apos;re unsatisfied with our response to your rights request, contact our Grievance Officer:
              </p>
              <address className="not-italic text-textSecondary">
                <p>Email: <a href="mailto:grievance@hyderabad.rent" className="text-accent hover:underline">grievance@hyderabad.rent</a></p>
                <p>Response time: Within 30 days per DPDP Act</p>
              </address>
            </section>

            {/* Response Timeline */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Response Timelines</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TimelineCard title="Access Request" days="30" description="Copy of your data" />
                <TimelineCard title="Correction Request" days="30" description="Inaccurate data fixed" />
                <TimelineCard title="Deletion Request" days="30" description="Data erased (legal holds excepted)" />
                <TimelineCard title="Withdrawal" days="7" description="Processing stopped" />
                <TimelineCard title="Grievance" days="30" description="Officer response" />
              </div>
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

function ConsentRow({ label, description, status, required, withdrawable }: {
  label: string;
  description: string;
  status: 'active' | 'inactive';
  required: boolean;
  withdrawable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-textPrimary">{label}</h3>
          {required && <span className="px-2 py-0.5 text-xs font-medium bg-error/20 text-error rounded">Required</span>}
        </div>
        <p className="text-sm text-textSecondary mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-success' : 'bg-textMuted'}`} />
        {withdrawable && !required && (
          <button className="text-sm text-accent hover:underline">Withdraw</button>
        )}
      </div>
    </div>
  );
}

function TimelineCard({ title, days, description }: { title: string; days: string; description: string }) {
  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-4 text-center">
      <p className="text-3xl font-bold text-accent">{days}</p>
      <p className="text-sm font-medium text-textPrimary mt-1">Days</p>
      <p className="text-xs text-textSecondary mt-2">{title}</p>
      <p className="text-xs text-textMuted mt-1">{description}</p>
    </div>
  );
}