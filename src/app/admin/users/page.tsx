import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'Manage Users | Admin | hyderabad.rent',
};

async function getUsers(searchParams: Promise<{ status?: string; page?: string }>) {
  const { status, page } = await searchParams;
  const pageNum = parseInt(page || '1', 10);
  const pageSize = 20;
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('profiles')
    .select(`
      *,
      listings:listings!listings_owner_id_fkey (count),
      seekers:seekers!seekers_owner_id_fkey (count),
      rent_pins:rent_pins!rent_pins_owner_id_fkey (count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status === 'banned') {
    query = query.eq('banned', true);
  } else if (status === 'active') {
    query = query.eq('banned', false);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    return { users: [], total: 0 };
  }

  return { users: data || [], total: count || 0 };
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const [currentParams, { users, total }] = await Promise.all([
    searchParams,
    getUsers(searchParams),
  ]);

  const status = currentParams.status || 'all';
  const page = parseInt(currentParams.page || '1', 10);
  const totalPages = Math.ceil(total / 20);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'banned', label: 'Banned' },
  ];

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
              <Link href="/admin/users" className="text-sm text-accent font-medium">Users</Link>
              <Link href="/admin/audit" className="text-sm text-textSecondary hover:text-textPrimary">Audit Log</Link>
            </nav>
            <Link href="/" className="px-4 py-2 border border-border text-textSecondary rounded-lg hover:border-accent hover:text-textPrimary transition-colors">
              View Site
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-12">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-textPrimary">Manage Users</h1>
              <span className="px-3 py-1 bg-backgroundElevated border border-border rounded-full text-sm text-textSecondary">
                {total} total
              </span>
            </div>

            {/* Status Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <Link
                  key={opt.value}
                  href={`/admin/users?status=${opt.value}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    status === opt.value
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-backgroundElevated border border-border text-textSecondary hover:border-accent hover:text-textPrimary'
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>

            {/* Users Table */}
            <div className="bg-backgroundElevated border border-border rounded-xl overflow-hidden">
              {users.length === 0 ? (
                <div className="p-12 text-center text-textMuted">
                  No users found.
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-backgroundHover">
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Email / Phone</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Verified</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Listings</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Seekers</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Rent Pins</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Created</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-border hover:bg-backgroundHover">
                          <td className="px-4 py-3">
                            <div className="text-sm text-textPrimary">{user.email || '—'}</div>
                            <div className="text-xs text-textMuted">{user.phone || 'No phone'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.email_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                            }`}>
                              {user.email_verified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-textSecondary">
                            {Array.isArray(user.listings) ? user.listings.length : user.listings || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-textSecondary">
                            {Array.isArray(user.seekers) ? user.seekers.length : user.seekers || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-textSecondary">
                            {Array.isArray(user.rent_pins) ? user.rent_pins.length : user.rent_pins || 0}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.banned ? 'bg-error/20 text-error' : 'bg-success/20 text-success'
                            }`}>
                              {user.banned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-textMuted">
                            {new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {user.banned ? (
                                <button className="text-sm text-success hover:underline">Unban</button>
                              ) : (
                                <button className="text-sm text-error hover:underline">Ban</button>
                              )}
                              <button className="text-sm text-accent hover:underline">View Details</button>
                            </div>
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
                          <Link href={`/admin/users?status=${status}&page=${page - 1}`} className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-backgroundHover">
                            Previous
                          </Link>
                        )}
                        {page < totalPages && (
                          <Link href={`/admin/users?status=${status}&page=${page + 1}`} className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-backgroundHover">
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