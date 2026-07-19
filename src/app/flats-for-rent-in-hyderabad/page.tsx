// src/app/flats-for-rent-in-hyderabad/page.tsx
// SEO city page: Flats for Rent in Hyderabad

import { Metadata } from 'next';
import { getCityStats, getAllLocalityStats } from '@/lib/aggregates';
import { formatINR } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Flats for Rent in Hyderabad | Zero Brokerage | hyderabad.rent',
  description: 'Find verified flats for rent in Hyderabad — Gachibowli, Madhapur, Kondapur, HITEC City, Financial District. No brokerage, direct from owners. 50+ localities, real listings.',
  openGraph: {
    title: 'Flats for Rent in Hyderabad | Zero Brokerage',
    description: 'Verified flats for rent in Hyderabad. No brokerage fees. Direct from owners.',
    type: 'website',
  },
  other: {
    'json-ld': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'hyderabad.rent',
      url: 'https://hyderabad.rent',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://hyderabad.rent/rent/{locality}',
        },
        queryInput: 'required name=locality',
      },
    }),
  },
};

const BHk_LABEL: Record<string, string> = {
  '1BHK': '1 BHK',
  '2BHK': '2 BHK',
  '3BHK': '3 BHK',
  '4+BHK': '4+ BHK',
};

const LOCALITY_DISPLAY: Record<string, { name: string; metro?: string }> = {
  gachibowli: { name: 'Gachibowli', metro: 'Blue Line' },
  madhapur: { name: 'Madhapur', metro: 'Blue Line' },
  kondapur: { name: 'Kondapur', metro: 'Blue Line' },
  'hitec-city': { name: 'HITEC City', metro: 'Blue Line' },
  'financial-district': { name: 'Financial District', metro: 'Blue Line' },
  manikonda: { name: 'Manikonda', metro: 'Proposed' },
  narsingi: { name: 'Narsingi', metro: 'Proposed' },
  hafeezpet: { name: 'Hafeezpet', metro: 'Green Line' },
};

async function getLocalitiesWithStats() {
  const [cityStats, allStats] = await Promise.all([
    getCityStats(),
    getAllLocalityStats(),
  ]);

  return { cityStats, localityStats: allStats };
}

export default async function FlatsForRentPage() {
  const { cityStats, localityStats } = await getLocalitiesWithStats();

  // Filter for whole flat localities with data
  const wholeFlatLocalities = localityStats
    .filter(l => l.wholeFlatCount > 0)
    .sort((a, b) => b.wholeFlatCount - a.wholeFlatCount);

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              itemListElement: wholeFlatLocalities.slice(0, 10).map((loc, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                item: {
                  '@type': 'Place',
                  name: `${loc.locality} Flats for Rent`,
                  url: `https://hyderabad.rent/rent/${loc.locality}`,
                },
              })),
            }),
          }}
        />
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
              <Link href="/flats-for-rent-in-hyderabad" className="text-sm text-accent font-medium">Flats for Rent</Link>
              <Link href="/flatmates-in-hyderabad" className="text-sm text-textSecondary hover:text-textPrimary">Flatmates</Link>
              <Link href="/rent-map" className="text-sm text-textSecondary hover:text-textPrimary">Map</Link>
            </nav>
            <Link href="/list" className="px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accentHover transition-colors">
              List Your Flat
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-12">
          {/* Hero */}
          <section className="max-w-7xl mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-textPrimary mb-4">
              Flats for Rent in Hyderabad
            </h1>
            <p className="text-xl text-textSecondary max-w-2xl mx-auto mb-8">
              Verified whole flats — direct from owners. Zero brokerage. Gachibowli, Madhapur, Kondapur, HITEC City, Financial District & more.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/list" className="btn-primary text-lg px-8 py-3">
                List Your Flat Free
              </Link>
              <Link href="/rent-map" className="btn-secondary text-lg px-8 py-3">
                Explore Map
              </Link>
            </div>
          </section>

          {/* City Stats */}
          <section className="max-w-7xl mx-auto px-4 py-8 border-y border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Verified Flats" value={cityStats.totalListings} />
              <StatCard label="Active Seekers" value={cityStats.totalSeekers} />
              <StatCard label="Rent Pins" value={cityStats.totalRentPins} />
              <StatCard label="Matches Made" value={cityStats.totalMatches} />
            </div>
          </section>

          {/* Popular Localities */}
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-textPrimary">Popular Localities for Flats</h2>
              <Link href="/rent-map" className="text-accent hover:underline text-sm font-medium">View all on map →</Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {wholeFlatLocalities.slice(0, 12).map((loc) => {
                const display = LOCALITY_DISPLAY[loc.locality] || { name: loc.locality };
                return (
                  <Link
                    key={loc.locality}
                    href={`/rent/${loc.locality}`}
                    className="group p-6 bg-backgroundElevated border border-border rounded-xl hover:border-accent/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-textPrimary group-hover:text-accent transition-colors">
                        {display.name}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded-full">
                        {loc.wholeFlatCount} flats
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-textSecondary">
                      <p>Median: <span className="text-textPrimary font-medium">{formatINR(loc.medianRent)}/mo</span></p>
                      <p>Range: <span className="text-textPrimary font-medium">{formatINR(loc.minRent)} – {formatINR(loc.maxRent)}</span></p>
                      {display.metro && (
                        <p className="flex items-center gap-1 text-info">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                          {display.metro}
                        </p>
                      )}
                      <p className="text-textMuted">{loc.sampleSize} listings</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {wholeFlatLocalities.length > 12 && (
              <Link href="/rent-map" className="block mt-8 text-center btn-secondary inline-block w-auto">
                View All {wholeFlatLocalities.length} Localities
              </Link>
            )}
          </section>

          {/* How it works */}
          <section className="max-w-7xl mx-auto px-4 py-12 bg-backgroundElevated/50 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-textPrimary text-center mb-10">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StepCard
                number="1"
                title="Browse Verified Flats"
                description="Every listing is email-verified and reviewed. No brokers, no fake posts."
              />
              <StepCard
                number="2"
                title="Contact Directly"
                description="Owner contact details revealed only after mutual consent. Your privacy protected."
              />
              <StepCard
                number="3"
                title="Move In Confidently"
                description="No brokerage fees ever. Verify independently before paying any deposit."
              />
            </div>
          </section>

          {/* FAQ - JSON-LD */}
          <section className="max-w-3xl mx-auto px-4 py-12" itemScope itemType="https://schema.org/FAQPage">
            <h2 className="text-2xl font-bold text-textPrimary text-center mb-8">Common Questions</h2>
            <dl className="space-y-4" itemProp="mainEntity" itemScope itemType="https://schema.org/Question">
              <FAQItem
                question="Is there really zero brokerage?"
                answer="Yes. hyderabad.rent connects you directly with property owners. No broker fees, ever."
              />
              <FAQItem
                question="How are listings verified?"
                answer="Every listing requires email verification. Our team reviews each submission before it goes live."
              />
              <FAQItem
                question="Which areas do you cover?"
                answer="All of Hyderabad — Gachibowli, Madhapur, Kondapur, HITEC City, Financial District, Manikonda, Narsingi, Hafeezpet, and 40+ more localities."
              />
              <FAQItem
                question="Can I post a flat for rent?"
                answer="Absolutely. Click 'List Your Flat' — it's free, takes 2 minutes, and reaches verified seekers."
              />
            </dl>
          </section>

          {/* CTA */}
          <section className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl font-bold text-textPrimary mb-4">Ready to Find Your Flat?</h2>
            <p className="text-textSecondary mb-6">Join 1000+ verified seekers finding homes in Hyderabad.</p>
            <Link href="/list" className="btn-primary text-lg px-8 py-3 inline-block">
              List Your Flat Free
            </Link>
          </section>
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
            <p className="mt-2 text-xs">⚠ Never pay before visiting and independently verifying the property.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-6 text-center">
      <p className="text-3xl font-bold text-accent">{value.toLocaleString()}+</p>
      <p className="text-sm text-textSecondary mt-1">{label}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center p-6">
      <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto mb-4 text-xl font-bold">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-textPrimary mb-2">{title}</h3>
      <p className="text-textSecondary text-sm">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-6" itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
      <dt className="font-medium text-textPrimary" itemProp="name">{question}</dt>
      <dd className="text-textSecondary mt-2" itemProp="text">{answer}</dd>
    </div>
  );
}
