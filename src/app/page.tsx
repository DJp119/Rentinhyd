import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hyderabad.rent — Honest Rent Data for Hyderabad',
  description: 'Anonymous rent pins, verified listings, and seeker requests. No broker spam. No fake prices. Just real data from real tenants.',
  openGraph: {
    title: 'Hyderabad.rent — Honest Rent Data for Hyderabad',
    description: 'Anonymous rent pins, verified listings, and seeker requests. No broker spam. No fake prices.',
    type: 'website',
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-textPrimary">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-backgroundElevated/50 to-background" />
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-info/10 rounded-full blur-3xl" />
        </div>
        <div className="relative container py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 text-accent text-sm font-medium mb-6 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              Live in Hyderabad — Launch MVP
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
              Honest Rent Data{' '}
              <span className="text-accent">for Hyderabad</span>
            </h1>
            <p className="text-lg md:text-xl text-textSecondary max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Anonymous rent pins, verified listings, and seeker requests. No broker spam. No fake prices. Just real data from real tenants.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Link href="/map" className="btn-primary text-lg px-8 py-3">
                Explore the Map
              </Link>
              <Link href="/flats-for-rent-in-hyderabad" className="btn-secondary text-lg px-8 py-3">
                Browse Listings
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-textMuted animate-fade-in" style={{ animationDelay: '300ms' }}>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                100% Anonymous
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Verified Listings
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                No Broker Fees
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-backgroundElevated/50 border-y border-border">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-textSecondary max-w-2xl mx-auto">Three ways to participate — pick what fits you.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Rent Pin */}
            <article className="card p-6 hover:border-accent/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Drop a Rent Pin</h3>
              <p className="text-textSecondary mb-4">Share what you pay anonymously. No account needed. Just locality, rent range, BHK, and furnishing.</p>
              <ul className="space-y-2 text-sm text-textSecondary">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> Completely anonymous</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> Coordinates jittered ~150m</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> Appears on map instantly</li>
              </ul>
              <Link href="/map" className="mt-4 inline-flex items-center gap-1 text-accent font-medium hover:underline">
                Add your pin <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" /></svg>
              </Link>
            </article>

            {/* Verified Listing */}
            <article className="card p-6 hover:border-accent/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 22v-8.325" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Post a Verified Listing</h3>
              <p className="text-textSecondary mb-4">Landlords & tenants: list a whole flat or room. Email verification required. Shows exact address on match.</p>
              <ul className="space-y-2 text-sm text-textSecondary">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> Email verified</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> Whole flat or room/flatmate</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> 60-day expiry, renewable</li>
              </ul>
              <Link href="/listings/new" className="mt-4 inline-flex items-center gap-1 text-accent font-medium hover:underline">
                List your property <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" /></svg>
              </Link>
            </article>

            {/* Seeker Request */}
            <article className="card p-6 hover:border-accent/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-info/15 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Post a Seeker Request</h3>
              <p className="text-textSecondary mb-4">Looking for a flat or flatmate? Describe your budget, move-in date, and lifestyle. Get matched automatically.</p>
              <ul className="space-y-2 text-sm text-textSecondary">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-info" /> Email verified</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-info" /> Smart matching algorithm</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-info" /> Double-consent introductions</li>
              </ul>
              <Link href="/seekers/new" className="mt-4 inline-flex items-center gap-1 text-info font-medium hover:underline">
                Find your match <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" /></svg>
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* Map Preview / Stats */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">See the Market at a Glance</h2>
              <p className="text-textSecondary mb-8">Interactive map with rent pins, listings, and seekers. Filter by rent, BHK, furnishing. Cluster view at city level, individual pins when zoomed in.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4 text-center">
                  <div className="text-3xl font-bold text-accent">2,847</div>
                  <div className="text-sm text-textMuted">Active Rent Pins</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-3xl font-bold text-accent">1,203</div>
                  <div className="text-sm text-textMuted">Verified Listings</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-3xl font-bold text-info">689</div>
                  <div className="text-sm text-textMuted">Active Seekers</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-3xl font-bold text-success">94%</div>
                  <div className="text-sm text-textMuted">Match Response Rate</div>
                </div>
              </div>
              <Link href="/map" className="mt-6 inline-flex items-center gap-2 btn-primary">
                Open Full Map
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4z" /></svg>
              </Link>
            </div>
            <div className="relative aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 bg-backgroundElevated border border-border rounded-2xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-xl bg-gradient-to-br from-accent/20 to-info/20 flex items-center justify-center">
                      <svg className="w-12 h-12 text-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 4m0 0l5.447 2.724A1 1 0 0021 16.382V19.5a1 1 0 00-.553.894L9 20zm0 0v-8" />
                      </svg>
                    </div>
                    <p className="text-textSecondary">Interactive MapLibre GL map</p>
                    <p className="text-sm text-textMuted mt-1">Clustering • Filters • Privacy-jittered pins</p>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-backgroundElevated/90 backdrop-blur-sm border border-border rounded-lg p-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded-full bg-success" />
                    <span>Rent Pins</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded-full bg-accent" />
                    <span>Listings</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded-full bg-info" />
                    <span>Seekers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Localities */}
      <section className="py-20 md:py-28 bg-backgroundElevated/50 border-y border-border">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Popular Localities</h2>
            <p className="text-textSecondary max-w-2xl mx-auto">Explore rent trends by neighbourhood. Each page shows 20+ data points before publishing.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 max-w-6xl mx-auto">
            {[
              { name: 'Gachibowli', avg: '₹28K' },
              { name: 'HITEC City', avg: '₹32K' },
              { name: 'Madhapur', avg: '₹26K' },
              { name: 'Kondapur', avg: '₹24K' },
              { name: 'Banjara Hills', avg: '₹45K' },
              { name: 'Jubilee Hills', avg: '₹42K' },
              { name: 'KPHB', avg: '₹22K' },
              { name: 'Miyapur', avg: '₹18K' },
            ].map((loc) => (
              <Link key={loc.name} href={`/rent/${loc.name.toLowerCase().replace(' ', '-')}`} className="card p-4 text-center hover:border-accent/30 hover:bg-backgroundHover transition-colors">
                <div className="font-medium">{loc.name}</div>
                <div className="text-sm text-accent font-semibold mt-1">{loc.avg}/mo</div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/areas" className="text-accent font-medium hover:underline">
              View all localities →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Trust</h2>
            <p className="text-textSecondary max-w-2xl mx-auto">Every design decision protects you.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <article className="card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
              <p className="text-textSecondary text-sm">Rent pins are anonymous by default. Coordinates jittered ~150m deterministically. No PII stored without consent.</p>
            </article>
            <article className="card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Verified Identity</h3>
              <p className="text-textSecondary text-sm">Email verification required for listings & seekers. Turnstile bot protection. Secure tokens, hashed storage.</p>
            </article>
            <article className="card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-info/15 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Double Consent</h3>
              <p className="text-textSecondary text-sm">Contact details only shared when both parties accept. 7-day expiry. You&apos;re never exposed without agreeing.</p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-backgroundElevated border-y border-border">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join?</h2>
          <p className="text-textSecondary max-w-xl mx-auto mb-8">Drop a pin, list a flat, or post a seeker request. Takes 30 seconds.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/map" className="btn-primary text-lg px-8 py-3">
              Start Exploring
            </Link>
            <Link href="/listings/new" className="btn-secondary text-lg px-8 py-3">
              List a Property
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Hyderabad.rent</h3>
              <p className="text-textMuted text-sm">Honest rent data for Hyderabad. Built by tenants, for tenants.</p>
            </div>
            <nav>
              <h4 className="font-medium mb-4">Explore</h4>
              <ul className="space-y-2 text-sm text-textSecondary">
                <li><Link href="/map" className="hover:text-accent transition-colors">Interactive Map</Link></li>
                <li><Link href="/flats-for-rent-in-hyderabad" className="hover:text-accent transition-colors">Flats for Rent</Link></li>
                <li><Link href="/flatmates-in-hyderabad" className="hover:text-accent transition-colors">Flatmates</Link></li>
                <li><Link href="/areas" className="hover:text-accent transition-colors">All Localities</Link></li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-medium mb-4">Post</h4>
              <ul className="space-y-2 text-sm text-textSecondary">
                <li><Link href="/map" className="hover:text-accent transition-colors">Add Rent Pin</Link></li>
                <li><Link href="/listings/new" className="hover:text-accent transition-colors">List a Property</Link></li>
                <li><Link href="/seekers/new" className="hover:text-accent transition-colors">Find Flatmate</Link></li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-textSecondary">
                <li><Link href="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
                <li><Link href="/consent" className="hover:text-accent transition-colors">Consent Settings</Link></li>
              </ul>
            </nav>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-textMuted">© 2025 Hyderabad.rent. Not a brokerage. Data contributed by users.</p>
            <div className="flex items-center gap-6 text-sm text-textMuted">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">GitHub</a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">Twitter</a>
              <a href="mailto:hello@hyderabad.rent" className="hover:text-accent transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}