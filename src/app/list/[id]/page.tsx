import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatINR, formatRentRange } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

async function getListing(id: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_private (
        contact_phone,
        contact_email,
        contact_method,
        contact_window_start,
        contact_window_end,
        owner_id
      )
    `)
    .eq('id', id)
    .eq('status', 'approved')
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) {
    return { title: 'Listing Not Found' };
  }

  const rentDisplay = listing.listing_type === 'whole_flat'
    ? formatINR(listing.rent)
    : formatRentRange(listing.rent, listing.rent);

  return {
    title: `${listing.title} — ${rentDisplay}/mo | Hyderabad.rent`,
    description: `${listing.bhk} ${listing.furnishing.replace('_', ' ')} in ${listing.locality}. ${listing.description?.slice(0, 160)}`,
    openGraph: {
      title: `${listing.title} — ${rentDisplay}/mo`,
      description: `${listing.bhk} ${listing.furnishing.replace('_', ' ')} in ${listing.locality}`,
      type: 'website',
    },
  };
}

function ListingDetail({ listing }: { listing: Awaited<ReturnType<typeof getListing>> }) {
  const isWholeFlat = listing.listing_type === 'whole_flat';
  const rentDisplay = isWholeFlat
    ? formatINR(listing.rent)
    : formatRentRange(listing.rent, listing.rent);

  const amenities = [
    listing.amenities?.includes('wifi') && 'WiFi',
    listing.amenities?.includes('ac') && 'AC',
    listing.amenities?.includes('parking') && 'Parking',
    listing.amenities?.includes('lift') && 'Lift',
    listing.amenities?.includes('security') && 'Security',
    listing.amenities?.includes('power_backup') && 'Power Backup',
    listing.amenities?.includes('gym') && 'Gym',
    listing.amenities?.includes('pool') && 'Pool',
  ].filter(Boolean);

  const lifestyleTags = [
    listing.lifestyle_prefs?.food !== 'no_preference' && `Food: ${listing.lifestyle_prefs.food}`,
    listing.lifestyle_prefs?.smoking !== 'no_preference' && `Smoking: ${listing.lifestyle_prefs.smoking}`,
    listing.lifestyle_prefs?.drinking !== 'no_preference' && `Drinking: ${listing.lifestyle_prefs.drinking}`,
    listing.lifestyle_prefs?.work_from_home && 'WFH Friendly',
    listing.lifestyle_prefs?.pets !== 'no_preference' && `Pets: ${listing.lifestyle_prefs.pets}`,
    listing.lifestyle_prefs?.gender !== 'no_preference' && `Gender: ${listing.lifestyle_prefs.gender}`,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 md:py-12">
        {/* Back link */}
        <Link href="/map" className="inline-flex items-center gap-1 text-textMuted hover:text-textSecondary mb-6 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Map
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero */}
            <article className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${isWholeFlat ? 'badge-accent' : 'badge-info'}`}>
                      {isWholeFlat ? 'Whole Flat' : 'Room / Flatmate'}
                    </span>
                    <span className="badge badge-muted">{listing.bhk}</span>
                    <span className="badge badge-muted">{listing.furnishing.replace('_', ' ')}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-1">{listing.title}</h1>
                  <p className="text-textSecondary flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {listing.locality}, Hyderabad
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-accent">{rentDisplay}<span className="text-base font-normal text-textMuted">/month</span></p>
                  <p className="text-sm text-textMuted mt-1">Deposit: {listing.deposit_months} months</p>
                </div>
              </div>

              {listing.description && (
                <div className="prose prose-invert max-w-none mb-6">
                  <p className="text-textSecondary">{listing.description}</p>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-background/50 rounded-xl">
                <div>
                  <p className="text-xs text-textMuted uppercase tracking-wide">Available From</p>
                  <p className="font-medium">{new Date(listing.available_from).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-xs text-textMuted uppercase tracking-wide">Listing Type</p>
                  <p className="font-medium capitalize">{listing.listing_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-textMuted uppercase tracking-wide">Maintenance</p>
                  <p className="font-medium">{listing.maintenance_included ? 'Included' : 'Extra'}</p>
                </div>
                <div>
                  <p className="text-xs text-textMuted uppercase tracking-wide">Views</p>
                  <p className="font-medium">{listing.view_count || 0}</p>
                </div>
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a) => (
                      <span key={a} className="badge badge-muted">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifestyle */}
              {lifestyleTags.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Lifestyle</h3>
                  <div className="flex flex-wrap gap-2">
                    {lifestyleTags.map((t) => (
                      <span key={t} className="badge badge-info">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact - private info only shown after match introduction */}
              <div className="border-t border-border pt-6">
                <h3 className="font-semibold mb-3">Contact</h3>
                <p className="text-textMuted text-sm mb-4">
                  Contact details are shared only after a double-consent introduction via the matching system.
                  <Link href="/seekers/new" className="text-accent hover:underline ml-1">Post a seeker request</Link>
                  to get matched with this listing.
                </p>
                {listing.listing_private && (
                  <div className="text-sm text-textSecondary space-y-1">
                    <p>Preferred contact: {listing.listing_private.contact_method}</p>
                    {listing.listing_private.contact_window_start && listing.listing_private.contact_window_end && (
                      <p>Available: {listing.listing_private.contact_window_start} – {listing.listing_private.contact_window_end}</p>
                    )}
                  </div>
                )}
              </div>
            </article>

            {/* Map placeholder */}
            <article className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Location</h2>
              <div className="aspect-video bg-background border border-border rounded-xl flex items-center justify-center">
                <div className="text-center text-textMuted">
                  <svg className="w-12 h-12 mx-auto mb-2 text-textMuted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>Map view available on the main map page</p>
                  <Link href={`/map?lat=${listing.lat}&lon=${listing.lon}&zoom=16`} className="text-accent hover:underline text-sm mt-2 inline-block">
                    Open in Map →
                  </Link>
                </div>
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <aside className="card p-6 sticky top-24">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href={`/map?lat=${listing.lat}&lon=${listing.lon}&zoom=16`} className="btn-secondary w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  View on Map
                </Link>
                <Link href="/seekers/new" className="btn-primary w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Post Seeker Request
                </Link>
                <button className="btn-secondary w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share
                </button>
                <button className="btn-secondary w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  Report
                </button>
              </div>
            </aside>

            <aside className="card p-6">
              <h3 className="font-semibold mb-4">Similar Listings</h3>
              <p className="text-textMuted text-sm">Browse more {listing.bhk} {listing.furnishing.replace('_', ' ')} in {listing.locality}</p>
              <Link href={`/rent/${listing.locality.toLowerCase().replace(' ', '-')}`} className="mt-4 block text-accent hover:underline text-sm font-medium">
                View all in {listing.locality} →
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) {
    notFound();
  }

  return <ListingDetail listing={listing} />;
}
