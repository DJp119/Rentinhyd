// src/app/flatmates-in-hyderabad/page.tsx
// SEO city page: Flatmates in Hyderabad

import { Metadata } from 'next';
import { getCityStats, getAllLocalityStats } from '@/lib/aggregates';
import { formatINR } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Flatmates in Hyderabad | Find Roommates | Zero Brokerage | hyderabad.rent',
  description: 'Find verified flatmates and rooms for rent in Hyderabad — Gachibowli, Madhapur, Kondapur, HITEC City. No brokerage, direct from flatmates. Shared flats, single rooms.',
  openGraph: {
    title: 'Flatmates in Hyderabad | Zero Brokerage',
    description: 'Verified flatmates and rooms for rent in Hyderabad. No brokerage fees.',
    type: 'website',
  },
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

export default async function FlatmatesPage() {
  const { cityStats, localityStats } = await getLocalitiesWithStats();

  // Filter for room/flatmate localities with data
  const roomLocalities = localityStats
    .filter(l => l.roomCount > 0)
    .sort((a, b) => b.roomCount - a.roomCount);

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              itemListElement: roomLocalities.slice(0, 10).map((loc, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                item: {
                  '@type': 'Place',
                  name: `${loc.locality} Flatmates`,
                  url: `https://hyderabad.rent/rent/${loc.locality}?type=room`,
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
              <Link href="/flats-for-rent-in-hyderabad" className="text-sm text-textSecondary hover:text-textPrimary">Flats for Rent</Link>
              <Link href="/flatmates-in-hyderabad" className="text-sm text-accent font-medium">Flatmates</Link>
              <Link href="/rent-map" className="text-sm text-textSecondary hover:text-textPrimary">Map</Link>
            </nav>
            <Link href="/list" className="px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accentHover transition-colors">
              List Room/Flatmate
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-12">
          {/* Hero */}
          <section className="max-w-7xl mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-textPrimary mb-4">
              Flatmates & Rooms in Hyderabad
            </h1>
            <p className="text-xl text-textSecondary max-w-2xl mx-auto mb-8">
              Find verified flatmates and single rooms — direct from flatmates. Zero brokerage. Gachibowli, Madhapur, Kondapur, HITEC City & more.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/list" className="btn-primary text-lg px-8 py-3">
                List Room / Find Flatmate
              </Link>
              <Link href="/rent-map" className="btn-secondary text-lg px-8 py-3">
                Explore Map
              </Link>
            </div>
          </section>

          {/* City Stats */}
          <section className="max-w-7xl mx-auto px-4 py-8 border-y border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Room Listings" value={cityStats.totalListings} />
              <StatCard label="Seeking Flatmates" value={cityStats.totalSeekers} />
              <StatCard label="Rent Pins" value={cityStats.totalRentPins} />
              <StatCard label="Connections Made" value={cityStats.totalMatches} />
            </div>
          </section>

          {/* Popular Localities */}
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-textPrimary">Popular Localities for Flatmates</h2>
              <Link href="/rent-map" className="text-accent hover:underline text-sm font-medium">View all on map →</Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {roomLocalities.slice(0, 12).map((loc) => {
                const display = LOCALITY_DISPLAY[loc.locality] || { name: loc.locality };
                return (
                  <Link
                    key={loc.locality}
                    href={`/rent/${loc.locality}?type=room`}
                    className="group p-6 bg-backgroundElevated border border-border rounded-xl hover:border-accent/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-textPrimary group-hover:text-accent transition-colors">
                        {display.name}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-info/20 text-info rounded-full">
                        {loc.roomCount} rooms
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

            {roomLocalities.length > 12 && (
              <Link href="/rent-map" className="block mt-8 text-center btn-secondary inline-block w-auto">
                View All {roomLocalities.length} Localities
              </Link>
            )}
          </section>

          {/* How it works */}
          <section className="max-w-7xl mx-auto px-4 py-12 bg-backgroundElevated/50 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-textPrimary text-center mb-10">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StepCard
                number="1"
                title="Browse Verified Rooms"
                description="Every room listing is email-verified. Real flatmates, no brokers."
              />
              <StepCard
                number="2"
                title="Match Preferences"
                description="Filter by lifestyle: food, smoking, WFH, gender, pets. Find compatible flatmates."
              />
              <StepCard
                number="3"
                title="Connect Safely"
                description="Contact details shared only after mutual consent. No spam, no pressure."
              />
            </div>
          </section>

          {/* FAQ */}
                    <div className="max-w-3xl mx-auto px-4 py-12" itemScope itemType="https://schema.org/FAQPage">
            <h2 className="text-2xl font-bold text-textPrimary text-center mb-8">Common Questions</h2>
            <FAQItem
              question="Is there really zero brokerage for flatmates too?"
              answer="Yes. Connect directly with flatmates listing spare rooms. No broker fees ever."
            />
            <FAQItem
              question="How do lifestyle preferences work?"
              answer="Filter by food preference (veg/non-veg), smoking, drinking, WFH, pets, gender. Only see compatible matches."
            />
            <FAQItem
              question="Can I list a room in my flat?"
              answer="Yes. List your spare room free. Verified seekers will contact you directly after mutual consent."
            />
            <FAQItem
              question="Is it safe?"
              answer="All listings email-verified. Contact details only shared after both parties accept. Report fake posts instantly."
            />
          </div>

          {/* CTA */}
          <section className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl font-bold text-textPrimary mb-4">Looking for a Flatmate?</h2>
            <p className="text-textSecondary mb-6">Join 1000+ verified flatmates finding rooms in Hyderabad.</p>
            <Link href="/list" className="btn-primary text-lg px-8 py-3 inline-block">
              List Room / Find Flatmate
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
