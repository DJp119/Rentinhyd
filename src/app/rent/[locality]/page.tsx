// src/app/rent/[locality]/page.tsx
// Locality page template with SSR - indexes only after 20+ data points

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocalityStats, getCityStats, getAllLocalityStats } from '@/lib/aggregates';
import { formatINR, formatRentRange } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locality: string }>;
}

const LOCALITY_META: Record<string, {
  name: string;
  metro?: string;
  description: string;
  nearby: string[];
}> = {
  gachibowli: {
    name: 'Gachibowli',
    metro: 'Blue Line (Gachibowli Metro Station)',
    description: 'Major IT hub with Oracle, Microsoft, Tech Mahindra offices. Excellent metro connectivity.',
    nearby: ['Kondapur', 'Madhapur', 'Financial District', 'Nanakramguda'],
  },
  madhapur: {
    name: 'Madhapur',
    metro: 'Blue Line (Madhapur Metro Station)',
    description: 'HITEC City core with massive tech parks. High density of rental demand.',
    nearby: ['HITEC City', 'Kondapur', 'Gachibowli', 'Jubilee Hills'],
  },
  kondapur: {
    name: 'Kondapur',
    metro: 'Blue Line (Kondapur Metro Station)',
    description: 'Residential preference for IT professionals. Good mix of apartments and villas.',
    nearby: ['Gachibowli', 'Madhapur', 'HITEC City', 'Kothaguda'],
  },
  'hitec-city': {
    name: 'HITEC City',
    metro: 'Blue Line (HITEC City Metro Station)',
    description: 'Premier tech corridor with Cyber Towers, Cyber Gateway. Highest rental yields.',
    nearby: ['Madhapur', 'Kondapur', 'Financial District', 'Kothaguda'],
  },
  'financial-district': {
    name: 'Financial District',
    metro: 'Blue Line (Financial District Metro Station)',
    description: 'Banking and financial services hub. Premium apartments, growing rapidly.',
    nearby: ['Gachibowli', 'Narsingi', 'Nanakramguda', 'HITEC City'],
  },
  manikonda: {
    name: 'Manikonda',
    metro: 'Proposed Metro Extension',
    description: 'Affordable residential area with good connectivity to Gachibowli via ORR.',
    nearby: ['Gachibowli', 'Puppalaguda', 'Narsingi', 'Bandlaguda'],
  },
  narsingi: {
    name: 'Narsingi',
    metro: 'Proposed Metro Extension',
    description: 'Emerging residential corridor near Financial District. New apartment complexes.',
    nearby: ['Financial District', 'Manikonda', 'Puppalaguda', 'Tellapur'],
  },
  hafeezpet: {
    name: 'Hafeezpet',
    metro: 'Green Line (Hafeezpet Metro Station)',
    description: 'Established residential area with metro access. Mix of independent houses and apartments.',
    nearby: ['Miyapur', 'Madhapur', 'KPHB', 'Allwyn Colony'],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locality } = await params;
  const meta = LOCALITY_META[locality];
  const stats = await getLocalityStats(locality);

  if (!meta || !stats || stats.sampleSize < 20) {
    // Still return metadata but with noindex signal
    return {
      title: `${meta?.name || locality} Rentals | hyderabad.rent`,
      description: `Find rentals in ${meta?.name || locality}, Hyderabad. Verified listings, zero brokerage.`,
      robots: 'noindex, follow',
    };
  }

  const bhkBreakdown: Record<string, number> = {};
  // Note: We'd need a more detailed query for BHK breakdown

  return {
    title: `${meta.name} Rentals | Flats & Flatmates | Median ${formatINR(stats.medianRent)}/mo | hyderabad.rent`,
    description: `${meta.description} ${stats.totalListings} verified listings. Median rent ${formatINR(stats.medianRent)}/mo. Zero brokerage.`,
    openGraph: {
      title: `${meta.name} Rentals | hyderabad.rent`,
      description: `${stats.totalListings} verified listings. Median ${formatINR(stats.medianRent)}/mo.`,
      type: 'website',
    },
    other: {
      'json-ld': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Place',
        name: `${meta.name}, Hyderabad`,
        containedInPlace: {
          '@type': 'City',
          name: 'Hyderabad',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 17.44,
          longitude: 78.38,
        },
      }),
    },
  };
}

export default async function LocalityPage({ params }: PageProps) {
  const { locality } = await params;
  const meta = LOCALITY_META[locality];
  const stats = await getLocalityStats(locality);
  const cityStats = await getCityStats();

  // Check if should be indexed (20+ data points gate)
  const shouldIndex = stats && stats.sampleSize >= 20;

  if (!meta) {
    notFound();
  }

  const displayName = meta.name;

  return (
    <html lang="en">
      <head>
        {!shouldIndex && (
          <meta name="robots" content="noindex, follow" />
        )}
        {shouldIndex && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: `What is the median rent in ${displayName}?`,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: `The median rent in ${displayName} is ${formatINR(stats?.medianRent || 0)}/month based on ${stats?.sampleSize || 0} verified listings.`,
                    },
                  },
                  {
                    '@type': 'Question',
                    name: `Are there flats for rent in ${displayName}?`,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: `Yes, ${stats?.wholeFlatCount || 0} whole flats and ${stats?.roomCount || 0} rooms are currently available in ${displayName}.`,
                    },
                  },
                  {
                    '@type': 'Question',
                    name: `Which metro line serves ${displayName}?`,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: meta.metro || 'Metro connectivity is planned for this area.',
                    },
                  },
                ],
              }),
            }}
          />
        )}
      </head>
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
            <Link href="/list" className="px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accentHover transition-colors">
              List Property
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-12">
          {/* Hero */}
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <Link href="/rent-map" className="text-sm text-accent hover:underline mb-2 inline-block">
                  ← All Localities
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-textPrimary">
                  {displayName} Rentals
                </h1>
                <p className="text-textSecondary mt-2 max-w-2xl">{meta.description}</p>
              </div>
              {stats && (
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 text-sm font-medium bg-accent/20 text-accent rounded-full">
                    {stats.totalListings} Listings
                  </span>
                  <span className="px-3 py-1 text-sm font-medium bg-info/20 text-info rounded-full">
                    {stats.wholeFlatCount} Flats
                  </span>
                  <span className="px-3 py-1 text-sm font-medium bg-accent/20 text-accent rounded-full">
                    {stats.roomCount} Rooms
                  </span>
                </div>
              )}
            </div>

            {/* Key Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <StatCard label="Median Rent" value={formatINR(stats.medianRent)} sub="/month" />
                <StatCard label="Range" value={formatRentRange(stats.minRent, stats.maxRent)} />
                <StatCard label="Listings" value={stats.totalListings.toString()} />
                <StatCard label="Sample Size" value={stats.sampleSize.toString()} />
                <StatCard label="BHK Variety" value={stats.bhkVariety.toString()} />
              </div>
            )}

            {/* Metro Info */}
            {meta.metro && (
              <div className="mb-8 p-4 bg-infoSoft border border-info/30 rounded-xl flex items-center gap-3">
                <svg className="w-6 h-6 text-info flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <div>
                  <p className="font-medium text-info">Metro Access</p>
                  <p className="text-sm text-textSecondary">{meta.metro}</p>
                </div>
              </div>
            )}
          </section>

          {/* Rent Summary */}
          {stats && (
            <section className="max-w-7xl mx-auto px-4 py-8 border-y border-border">
              <h2 className="text-2xl font-bold text-textPrimary mb-6">Rent Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-backgroundElevated border border-border rounded-xl p-6">
                  <h3 className="text-lg font-medium text-textSecondary mb-3">Whole Flats</h3>
                  <p className="text-3xl font-bold text-accent mb-2">{stats.wholeFlatCount}</p>
                  <p className="text-textSecondary">Median: {formatINR(stats.medianRent)}/mo</p>
                  <Link
                    href={`/rent-map?locality=${locality}&type=whole_flat`}
                    className="mt-4 inline-block text-sm text-accent hover:underline"
                  >
                    View on Map →
                  </Link>
                </div>
                <div className="bg-backgroundElevated border border-border rounded-xl p-6">
                  <h3 className="text-lg font-medium text-textSecondary mb-3">Rooms / Flatmates</h3>
                  <p className="text-3xl font-bold text-info mb-2">{stats.roomCount}</p>
                  <p className="text-textSecondary">Median: {formatINR(stats.medianRent)}/mo</p>
                  <Link
                    href={`/rent-map?locality=${locality}&type=room_flatmate`}
                    className="mt-4 inline-block text-sm text-accent hover:underline"
                  >
                    View on Map →
                  </Link>
                </div>
                <div className="bg-backgroundElevated border border-border rounded-xl p-6">
                  <h3 className="text-lg font-medium text-textSecondary mb-3">Common Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.commonAmenities.slice(0, 8).map((a, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-background border border-border rounded-full text-textSecondary">
                        {a.name} ({a.count})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Nearby Localities */}
          <section className="max-w-7xl mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold text-textPrimary mb-6">Nearby Localities</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {meta.nearby.map(nearby => {
                const nearbyMeta = LOCALITY_META[nearby];
                return (
                  <Link
                    key={nearby}
                    href={`/rent/${nearby}`}
                    className="p-4 bg-backgroundElevated border border-border rounded-xl hover:border-accent/50 transition-all text-center"
                  >
                    <p className="font-medium text-textPrimary">{nearbyMeta?.name || nearby}</p>
                    <p className="text-sm text-textMuted mt-1">{nearbyMeta?.metro?.split(' ')[0] || 'Nearby'}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Actions */}
          <section className="max-w-3xl mx-auto px-4 py-12 text-center bg-backgroundElevated/50 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-textPrimary mb-4">Take Action</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/map" className="btn-primary px-6 py-3">Browse on Map</Link>
              <Link href="/list" className="btn-secondary px-6 py-3">List Your Property</Link>
              <Link href="/seek" className="btn-secondary px-6 py-3">Post Requirement</Link>
            </div>
          </section>

          {/* FAQ */}
          {shouldIndex && stats && (
            <section className="max-w-3xl mx-auto px-4 py-12" itemScope itemType="https://schema.org/FAQPage">
              <h2 className="text-2xl font-bold text-textPrimary text-center mb-8">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <FAQItem
                  question={`What is the median rent in ${displayName}?`}
                  answer={`The median rent in ${displayName} is ${formatINR(stats.medianRent)}/month based on ${stats.sampleSize} verified listings. Range: ${formatRentRange(stats.minRent, stats.maxRent)}.`}
                />
                <FAQItem
                  question={`How many flats are available in ${displayName}?`}
                  answer={`${stats.wholeFlatCount} whole flats and ${stats.roomCount} rooms are currently listed in ${displayName}.`}
                />
                <FAQItem
                  question={`Which metro line serves ${displayName}?`}
                  answer={meta.metro || 'Metro connectivity is planned for this area.'}
                />
                <FAQItem
                  question="Is brokerage charged?"
                  answer="No. hyderabad.rent connects you directly with owners/flatmates. Zero brokerage fees ever."
                />
                <FAQItem
                  question="How do I list my property?"
                  answer="Click 'List Your Property' — it's free, takes 2 minutes, and requires email verification."
                />
              </div>
            </section>
          )}

          {/* Scam Warning */}
          <div className="max-w-3xl mx-auto px-4 py-6 text-center">
            <p className="text-xs text-textMuted border-t border-border pt-4">
              ⚠ <strong>Never pay before visiting and independently verifying the property.</strong> Report suspicious listings.
            </p>
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-textPrimary">{value}<span className="text-base font-normal text-textMuted">{sub || ''}</span></p>
      <p className="text-xs text-textSecondary mt-1">{label}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-6" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
      <h3 className="font-medium text-textPrimary" itemProp="name">{question}</h3>
      <div className="text-textSecondary mt-2" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
        <span itemProp="text">{answer}</span>
      </div>
    </div>
  );
}