// src/app/sitemap.ts
// Dynamic sitemap generation

import { MetadataRoute } from 'next';

// Known localities for sitemap generation
const KNOWN_LOCALITIES = [
  'gachibowli',
  'madhapur',
  'kondapur',
  'hitec-city',
  'financial-district',
  'manikonda',
  'narsingi',
  'hafeezpet',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://hyderabad.rent';

  // Use known localities for sitemap generation without Supabase dependency
  // The sitemap will be regenerated periodically with real data
  const indexableLocalities = KNOWN_LOCALITIES;

  const staticRoutes = [
    '',
    '/flats-for-rent-in-hyderabad',
    '/flatmates-in-hyderabad',
    '/rent-map',
    '/map',
    '/list',
    '/seek',
    '/privacy',
    '/terms',
    '/consent',
  ];

  const staticUrls: MetadataRoute.Sitemap = staticRoutes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route.includes('rent') ? 0.9 : 0.7,
  }));

  const localityUrls: MetadataRoute.Sitemap = indexableLocalities.map(locality => ({
    url: `${baseUrl}/rent/${locality}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Also include locality pages with type filters
  const filteredUrls: MetadataRoute.Sitemap = indexableLocalities.flatMap(locality => [
    {
      url: `${baseUrl}/rent/${locality}?type=whole_flat`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/rent/${locality}?type=room_flatmate`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ]);

  return [...staticUrls, ...localityUrls, ...filteredUrls];
}