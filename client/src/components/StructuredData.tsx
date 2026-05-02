import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function StructuredData() {
  const foodEstablishment = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    "name": "Rations",
    "url": "https://rationsfood.com",
    "description": "Fast Food Done Right. Rations Brands Limited.",
    "servesCuisine": "Fast Food",
    "image": "https://rationsfood.com/logo.png"
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
