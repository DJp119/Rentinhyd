// src/app/robots.ts
// Dynamic robots.txt generation

import { MetadataRoute } from 'next';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = 'https://rentinhyderabad.in';

  // Return basic robots.txt without Supabase dependency
  // The full version with locality filtering will be regenerated periodically
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/list*?*',
        '/seek*?*',
        '/map*?*',
        '/rent/*?*',
        '/_next/',
        '/static/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}