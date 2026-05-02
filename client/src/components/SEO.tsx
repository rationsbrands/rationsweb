import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
}

export default function SEO({
  title,
  description,
  canonicalUrl = 'https://rationsfood.com',
  ogImage = '/logo.png',
  ogType = 'website'
}: SEOProps) {
  const siteTitle = `${title} | Rations - Made for you`;
  const fullCanonicalUrl = canonicalUrl.startsWith('http') ? canonicalUrl : `https://rationsfood.com${canonicalUrl}`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `https://rationsfood.com${ogImage}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content="Rations Brands Limited" />
      <meta name="robots" content="index, follow" />
      <meta name="keywords" content="rations, rations food, rations.food, rationsfood, rations brands, rations brands limited, fast food, qsr, affordable food, order food online, hot meals, fresh fast food, quick service restaurant, best fast food, food delivery" />
      <link rel="canonical" href={fullCanonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullCanonicalUrl} />
      <meta property="twitter:title" content={siteTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={fullOgImage} />
    </Helmet>
  );
}
