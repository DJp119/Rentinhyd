// src/app/flatmates-in-hyderabad/page.tsx
// SEO city page: Flatmates in Hyderabad (Temporarily disabled: redirects to /rent-map)

import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Flatmates in Hyderabad | Find Roommates | Zero Brokerage | hyderabad.rent',
  description: 'Find verified flatmates and rooms for rent in Hyderabad — Gachibowli, Madhapur, Kondapur, HITEC City. No brokerage, direct from flatmates. Shared flats, single rooms.',
};

export default async function FlatmatesPage() {
  // Temporarily disabled SEO landing page: redirect visitors to interactive rent map
  redirect('/rent-map');
}

// NOTE: Previous implementation preserved below for when this SEO page is re-enabled.
//
// const LOCALITY_DISPLAY: Record<string, { name: string; metro?: string }> = {
//   gachibowli: { name: 'Gachibowli', metro: 'Blue Line' },
//   madhapur: { name: 'Madhapur', metro: 'Blue Line' },
//   kondapur: { name: 'Kondapur', metro: 'Blue Line' },
//   'hitec-city': { name: 'HITEC City', metro: 'Blue Line' },
//   'financial-district': { name: 'Financial District', metro: 'Blue Line' },
//   manikonda: { name: 'Manikonda', metro: 'Proposed' },
//   narsingi: { name: 'Narsingi', metro: 'Proposed' },
//   hafeezpet: { name: 'Hafeezpet', metro: 'Green Line' },
// };
//
// async function getLocalitiesWithStats() {
//   const [cityStats, allStats] = await Promise.all([
//     getCityStats(),
//     getAllLocalityStats(),
//   ]);
//   return { cityStats, localityStats: allStats };
// }
