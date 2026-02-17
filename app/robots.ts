import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/account/', '/workspace/', '/auth/'],
      },
    ],
    sitemap: 'https://specvault.app/sitemap.xml',
  };
}
