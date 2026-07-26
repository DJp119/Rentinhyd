// src/app/rent-map/page.tsx
// SEO city page: Hyderabad Rent Map

import { Metadata } from 'next';
import { getCityStats } from '@/lib/aggregates';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hyderabad Rent Map | Interactive Map | hyderabad.rent',
  description: 'Explore Hyderabad rentals on an interactive map. See rent pins, verified listings, and seeker requests by locality. Gachibowli, Madhapur, Kondapur, HITEC City, Financial District.',
  openGraph: {
    title: 'Hyderabad Rent Map | Interactive',
    description: 'Explore Hyderabad rentals on an interactive map. Rent pins, verified listings, seeker requests.',
    type: 'website',
  },
};

async function getStats() {
  return getCityStats();
}

export default async function RentMapPage() {
  const cityStats = await getStats();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Hyderabad Rent Map',
              url: 'https://hyderabad.rent/rent-map',
              applicationCategory: 'Real Estate',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'INR',
              },
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
              <Link href="/flatmates-in-hyderabad" className="text-sm text-textSecondary hover:text-textPrimary">Flatmates</Link>
              <Link href="/rent-map" className="text-sm text-accent font-medium">Map</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/list" className="px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accentHover transition-colors">
                Add to Map
              </Link>
            </div>
          </div>
        </header>

        <main className="pt-16">
          {/* Hero */}
          <section className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-textPrimary mb-4">
              Hyderabad Rent Map
            </h1>
            <p className="text-xl text-textSecondary max-w-2xl mx-auto mb-8">
              Explore rentals visually. Anonymous rent pins, verified listings, and seeker requests — all on one interactive map.
            </p>
            <Link href="/map" className="btn-primary text-lg px-8 py-3 inline-block">
              Open Interactive Map
            </Link>
          </section>

          {/* Map Preview / Stats */}
          <section className="max-w-7xl mx-auto px-4 py-8 border-y border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Rent Pins" value={cityStats.totalRentPins} icon="📍" />
              <StatCard label="Verified Listings" value={cityStats.totalListings} icon="🏠" />
              <StatCard label="Seeker Requests" value={cityStats.totalSeekers} icon="🔍" />
              <StatCard label="Matches Made" value={cityStats.totalMatches} icon="✅" />
            </div>
          </section>

          {/* Features */}
          <section className="max-w-7xl mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold text-textPrimary text-center mb-10">Map Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                title="Anonymous Rent Pins"
                description="Drop a pin with your rent range. No account needed. Helps others see real market rates."
                icon="📍"
              />
              <FeatureCard
                title="Verified Listings"
                description="Email-verified whole flats and rooms. Contact details revealed only after mutual consent."
                icon="🏠"
              />
              <FeatureCard
                title="Seeker Requests"
                description="Post what you're looking for. Get matched with compatible listings automatically."
                icon="🔍"
              />
            </div>
          </section>

          {/* Coverage */}
          <section className="max-w-7xl mx-auto px-4 py-12 bg-backgroundElevated/50 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-textPrimary text-center mb-8">Coverage</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 py-8">
              {[
                'Gachibowli', 'Madhapur', 'Kondapur', 'HITEC City',
                'Financial District', 'Manikonda', 'Narsingi', 'Hafeezpet'
              ].map(area => (
                <div key={area} className="text-center p-4">
                  <p className="font-medium text-textPrimary">{area}</p>
                  <p className="text-sm text-textMuted mt-1">Metro connected</p>
                </div>
              ))}
            </div>
          </section>

          {/* Usage Guide */}
          <section className="max-w-7xl mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold text-textPrimary text-center mb-10">How to Use the Map</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StepCard number="1" title="Navigate" description="Pan and zoom to your area of interest. Cluster view at city level, individual pins when localty detail when zoomed in." />
              <StepCard number="2" title="Filter" description="Filter by rent range, BHK, furnishing, listing type. See only what matches your criteria." />
              <StepCard number="3" title="Act" description="Click any pin for details. Drop your own rent pin. List a property. Post a seeker request." />
            </div>
          </section>

          {/* CTA */}
          <section className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl font-bold text-textPrimary mb-4">Explore Hyderabad Rentals Now</h2>
            <p className="text-textSecondary mb-6">Interactive map with real data from verified users.</p>
            <Link href="/map" className="btn-primary text-lg px-8 py-3 inline-block">
              Open Map
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

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-6 text-center">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-3xl font-bold text-accent">{value.toLocaleString()}+</p>
      <p className="text-sm text-textSecondary mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-backgroundElevated border border-border rounded-xl p-6 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <h3 className="text-lg font-semibold text-textPrimary mb-2">{title}</h3>
      <p className="text-textSecondary text-sm">{description}</p>
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
