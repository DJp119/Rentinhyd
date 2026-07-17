import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manage Listings | Admin | hyderabad.rent',
};

async function getListings(searchParams: Promise<{ status?: string; page?: string }>) {
  const { status, page } = await searchParams;
  const pageNum = parseInt(page || '1', 10);
  const pageSize = 20;
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('listings')
    .select(`
      *,
      listing_private (
        contact_email,
        contact_phone,
        owner_id
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching listings:', error);
    return { listings: [], total: 0 };
  }

  return { listings: data || [], total: count || 0 };
}

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const [currentParams, { listings, total }] = await Promise.all([
    searchParams,
    getListings(searchParams),
  ]);

  const status = currentParams.status || 'all';
  const page = parseInt(currentParams.page || '1', 10);
  const totalPages = Math.ceil(total / 20);

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'expired', label: 'Expired' },
    { value: 'quarantined', label: 'Quarantined' },
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
              <Link href="/admin/listings" className="text-sm text-accent font-medium">Listings</Link>
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-textPrimary">Manage Listings</h1>
              <span className="px-3 py-1 bg-backgroundElevated border border-border rounded-full text-sm text-textSecondary">
                {total} total
              </span>
            </div>

            {/* Status Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <Link
                  key={opt.value}
                  href={`/admin/listings?status=${opt.value}`}
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

            {/* Listings Table */}
            <div className="bg-backgroundElevated border border-border rounded-xl overflow-hidden">
              {listings.length === 0 ? (
                <div className="p-12 text-center text-textMuted">
                  No listings found.
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-backgroundHover">
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Locality</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Rent</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Owner</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Created</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((listing) => (
                        <tr key={listing.id} className="border-b border-border hover:bg-backgroundHover">
                          <td className="px-4 py-3">
                            <Link href={`/list/${listing.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-textPrimary hover:text-accent max-w-xs truncate block">
                              {listing.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-textSecondary">
                            {listing.listing_type === 'whole_flat' ? 'Whole Flat' : 'Room/Flatmate'}
                          </td>
                          <td className="px-4 py-3 text-sm text-textSecondary capitalize">{listing.locality}</td>
                          <td className="px-4 py-3 text-sm font-medium text-textPrimary">₹{listing.rent.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              listing.status === 'approved' ? 'bg-success/20 text-success' :
                              listing.status === 'pending' ? 'bg-warning/20 text-warning' :
                              listing.status === 'quarantined' ? 'bg-error/20 text-error' :
                              'bg-textMuted/20 text-textMuted'
                            }`}>
                              {listing.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-textSecondary">
                            {listing.listing_private?.contact_email || listing.listing_private?.owner_id?.slice(0, 8) || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-textMuted">
                            {new Date(listing.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link href={`/list/${listing.id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                                View
                              </Link>
                              {listing.status === 'pending' && (
                                <button className="text-sm text-success hover:underline">
                                  Approve
                                </button>
                              )}
                              {listing.status === 'approved' && (
                                <button className="text-sm text-warning hover:underline">
                                  Quarantine
                                </button>
                              )}
                              {listing.status === 'quarantined' && (
                                <button className="text-sm text-success hover:underline">
                                  Restore
                                </button>
                              )}
                              <button className="text-sm text-error hover:underline">
                                Delete
                              </button>
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
                          <Link href={`/admin/listings?status=${status}&page=${page - 1}`} className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-backgroundHover">
                            Previous
                          </Link>
                        )}
                        {page < totalPages && (
                          <Link href={`/admin/listings?status=${status}&page=${page + 1}`} className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-backgroundHover">
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