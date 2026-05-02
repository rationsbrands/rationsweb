import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function StructuredData() {
  const foodEstablishment = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    "name": "Rations",
    "alternateName": ["Rations Food", "RationsFood", "Rations Brands", "Rations Brands Limited"],
    "url": "https://rationsfood.com",
    "description": "Hot food, ready when you are. Rations is a fast growing QSR brand serving fresh, affordable meals made to order.",
    "servesCuisine": "Fast Food",
    "priceRange": "₦",
    "telephone": "+2349122058888",
    "email": "info@rationsfood.com",
    "image": "https://rationsfood.com/logo.png",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "10:00",
        "closes": "19:00"
      }
    ],
    "sameAs": [
      "https://www.tiktok.com/@rations.food",
      "https://instagram.com/rations.food",
      "https://facebook.com/rations.food",
      "https://youtube.com/@rationsfood",
      "https://x.com/rationsfood",
      "https://wa.me/2349122058888"
    ]
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Rations",
    "url": "https://rationsfood.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://rationsfood.com/menu?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(foodEstablishment)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(webSite)}
      </script>
    </Helmet>
  );
}
