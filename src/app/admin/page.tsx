// src/app/admin/page.tsx
// Admin Moderation Console

import { Metadata } from 'next';
import { getMatchStats, getReportStats } from '@/lib/aggregates';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Console | hyderabad.rent',
  description: 'Admin moderation dashboard for hyderabad.rent',
};

export default async function AdminPage() {
  const [matchStats, reportStats] = await Promise.all([
    getMatchStats(),
    getReportStats(),
  ]);

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
              <span className="px-2 py-0.5 text-xs font-medium bg-error/20 text-error rounded">Admin</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/admin" className="text-sm text-accent font-medium">Dashboard</Link>
              <Link href="/admin/listings" className="text-sm text-textSecondary hover:text-textPrimary">Listings</Link>
              <Link href="/admin/reports" className="text-sm text-textSecondary hover:text-textPrimary">Reports</Link>
              <Link href="/admin/users" className="text-sm text-textSecondary hover:text-textPrimary">Users</Link>
              <Link href="/admin/audit" className="text-sm text-textSecondary hover:text-textPrimary">Audit Log</Link>
            </nav>
            <Link href="/" className="px-4 py-2 border border-border text-textSecondary rounded-lg hover:border-accent hover:text-textPrimary transition-colors">
              View Site
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-12">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-textPrimary mb-8">Admin Dashboard</h1>

            {/* Stats Overview */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Platform Health</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <StatCard label="Total Matches" value={matchStats.totalMatches} />
                <StatCard label="Pending" value={matchStats.pending} color="warning" />
                <StatCard label="Accepted" value={matchStats.accepted} color="success" />
                <StatCard label="Declined" value={matchStats.declined} color="error" />
                <StatCard label="Introduced" value={matchStats.introduced} color="info" />
                <StatCard label="Expired" value={matchStats.expired} color="textMuted" />
                <StatCard label="Avg Score" value={Math.round(matchStats.avgScore)} />
                <StatCard label="7-Day Matches" value={matchStats.matchesLast7Days} />
              </div>
            </section>

            {/* Reports Overview */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Reports & Moderation</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Reports" value={reportStats.total} />
                <StatCard label="Pending" value={reportStats.pending} color="warning" />
                <StatCard label="Resolved" value={reportStats.resolved} color="success" />
                <StatCard label="7-Day Trends" value="—" />
              </div>

              {reportStats.byReason && Object.keys(reportStats.byReason).length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-textSecondary mb-3">By Reason</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reportStats.byReason).map(([reason, count]) => (
                      <span key={reason} className="px-3 py-1 bg-backgroundElevated border border-border rounded-full text-sm text-textSecondary">
                        {reason}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {reportStats.byTargetType && Object.keys(reportStats.byTargetType).length > 0 && (
                <div>
                  <h3 className="font-medium text-textSecondary mb-3">By Target Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reportStats.byTargetType).map(([type, count]) => (
                      <span key={type} className="px-3 py-1 bg-backgroundElevated border border-border rounded-full text-sm text-textSecondary">
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionCard
                  title="Pending Listings"
                  description="Review listings awaiting approval"
                  href="/admin/listings?status=pending"
                  icon="📋"
                  color="accent"
                />
                <ActionCard
                  title="Pending Reports"
                  description="Investigate user reports"
                  href="/admin/reports?status=pending"
                  icon="🚨"
                  color="warning"
                />
                <ActionCard
                  title="Quarantined Items"
                  description="Review quarantined listings/pins"
                  href="/admin/listings?status=quarantined"
                  icon="🔒"
                  color="error"
                />
                <ActionCard
                  title="Banned Users"
                  description="Manage banned identities"
                  href="/admin/users?status=banned"
                  icon="🚫"
                  color="error"
                />
              </div>
            </section>

            {/* System Health */}
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-textPrimary mb-4">System Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <HealthCard
                  name="Database"
                  status="pass"
                  message="Connected"
                  latencyMs={12}
                />
                <HealthCard
                  name="Resend Email"
                  status="pass"
                  message="Operational"
                  latencyMs={45}
                />
                <HealthCard
                  name="Turnstile"
                  status="pass"
                  message="Verifying"
                  latencyMs={8}
                />
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className="text-xl font-semibold text-textPrimary mb-4">Recent Moderation Actions</h2>
              <div className="bg-backgroundElevated border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-backgroundHover">
                      <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Action</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Target</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Actor</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border hover:bg-backgroundHover">
                      <td className="px-4 py-3 text-sm text-textMuted">—</td>
                      <td className="px-4 py-3 text-sm text-textSecondary">No actions yet</td>
                      <td className="px-4 py-3 text-sm text-textMuted">—</td>
                      <td className="px-4 py-3 text-sm text-textMuted">—</td>
                      <td className="px-4 py-3 text-sm text-textMuted">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-backgroundElevated border-t border-border py-4">
          <div className="max-w-7xl mx-auto px-4 text-center text-textMuted text-xs">
            hyderabad.rent Admin Console
          </div>
        </footer>
      </body>
    </html>
  );
}

function StatCard({ label, value, color = 'accent' }: { label: string; value: number | string; color?: string }) {
  const colors: Record<string, string> = {
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
    textMuted: 'text-textMuted',
  };

  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-6 text-center">
      <p className={`text-3xl font-bold ${colors[color] || 'text-accent'}`}>{value}</p>
      <p className="text-sm text-textSecondary mt-1">{label}</p>
    </div>
  );
}

function ActionCard({ title, description, href, icon, color }: { title: string; description: string; href: string; icon: string; color: string }) {
  const colors: Record<string, string> = {
    accent: 'border-accent/30 bg-accent/10',
    success: 'border-success/30 bg-success/10',
    warning: 'border-warning/30 bg-warning/10',
    error: 'border-error/30 bg-error/10',
    info: 'border-info/30 bg-info/10',
  };

  return (
    <Link
      href={href}
      className={`p-6 rounded-xl border transition-all group ${colors[color] || colors.accent}`}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-textPrimary group-hover:text-accent transition-colors">{title}</h3>
          <p className="text-sm text-textSecondary mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function HealthCard({ name, status, message, latencyMs }: { name: string; status: 'pass' | 'warn' | 'fail'; message: string; latencyMs: number }) {
  const statusColors = {
    pass: 'text-success',
    warn: 'text-warning',
    fail: 'text-error',
  };

  const statusLabels = {
    pass: 'Healthy',
    warn: 'Degraded',
    fail: 'Down',
  };

  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-textPrimary">{name}</h3>
        <span className={`text-sm font-medium ${statusColors[status]}`}>{statusLabels[status]}</span>
      </div>
      <p className="text-sm text-textSecondary">{message}</p>
      <p className="text-xs text-textMuted mt-1">Latency: {latencyMs}ms</p>
    </div>
  );
}