import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Audit Log | Admin | hyderabad.rent',
};

async function getAuditLogs(searchParams: Promise<{ page?: string }>) {
  const { page } = await searchParams;
  const pageNum = parseInt(page || '1', 10);
  const pageSize = 50;
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('moderation_audit')
    .select(`
      *,
      actor:profiles!moderation_audit_actor_id_fkey (email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }

  return { logs: data || [], total: count || 0 };
}

const actionColors: Record<string, string> = {
  approve: 'bg-success/20 text-success',
  quarantine: 'bg-error/20 text-error',
  ban: 'bg-error/20 text-error',
  warn: 'bg-warning/20 text-warning',
  delete: 'bg-error/20 text-error',
  restore: 'bg-success/20 text-success',
  unban: 'bg-success/20 text-success',
  resolve: 'bg-success/20 text-success',
  dismiss: 'bg-textMuted/20 text-textMuted',
};

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [currentParams, { logs, total }] = await Promise.all([
    searchParams,
    getAuditLogs(searchParams),
  ]);

  const page = parseInt(currentParams.page || '1', 10);
  const totalPages = Math.ceil(total / 50);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-textPrimary">
        <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className="text-xl font-bold text-textPrimary">hyderabad.rent</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-error/20 text-error rounded">Admin</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/admin" className="text-sm text-textSecondary hover:text-textPrimary">Dashboard</Link>
              <Link href="/admin/listings" className="text-sm text-textSecondary hover:text-textPrimary">Listings</Link>
              <Link href="/admin/reports" className="text-sm text-textSecondary hover:text-textPrimary">Reports</Link>
              <Link href="/admin/users" className="text-sm text-textSecondary hover:text-textPrimary">Users</Link>
              <Link href="/admin/audit" className="text-sm text-accent font-medium">Audit Log</Link>
            </nav>
            <Link href="/" className="px-4 py-2 border border-border text-textSecondary rounded-lg hover:border-accent hover:text-textPrimary transition-colors">
              View Site
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-12">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-textPrimary">Audit Log</h1>
              <span className="px-3 py-1 bg-backgroundElevated border border-border rounded-full text-sm text-textSecondary">
                {total} total entries
              </span>
            </div>

            {/* Actions Reference */}
            <div className="mb-6 p-4 bg-backgroundElevated border border-border rounded-xl">
              <h3 className="font-medium text-textPrimary mb-3">Action Types</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(actionColors).map(([action, color]) => (
                  <span key={action} className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                    {action}
                  </span>
                ))}
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-backgroundElevated border border-border rounded-xl overflow-hidden">
              {logs.length === 0 ? (
                <div className="p-12 text-center text-textMuted">
                  No audit entries found.
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-backgroundHover">
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Time</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Actor</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Action</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Target</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Target ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Reason</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-border hover:bg-backgroundHover">
                          <td className="px-4 py-3 text-sm text-textMuted whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-textSecondary">
                            {log.actor?.email || log.actor_id?.slice(0, 8) || 'System'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-backgroundElevated border border-border text-textSecondary'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-textSecondary capitalize">{log.target_type}</td>
                          <td className="px-4 py-3 text-sm font-mono text-textMuted">{log.target_id}</td>
                          <td className="px-4 py-3 text-sm text-textSecondary max-w-xs truncate block">{log.reason || '—'}</td>
                          <td className="px-4 py-3 text-sm text-textMuted max-w-xs truncate block">
                            {log.details ? JSON.stringify(log.details) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                      <span className="text-sm text-textSecondary">
                        Page {page} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        {page > 1 && (
                          <Link href={`/admin/audit?page=${page - 1}`} className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-backgroundHover">
                            Previous
                          </Link>
                        )}
                        {page < totalPages && (
                          <Link href={`/admin/audit?page=${page + 1}`} className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-backgroundHover">
                            Next
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        <footer className="bg-backgroundElevated border-t border-border py-4">
          <div className="max-w-7xl mx-auto px-4 text-center text-textMuted text-xs">
            hyderabad.rent Admin Console
          </div>
        </footer>
      </body>
    </html>
  );
}
