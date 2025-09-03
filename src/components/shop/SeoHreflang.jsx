import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://shop.b8shield.com';
const COUNTRY_CODES = [
  { code: 'se', hreflang: 'sv-SE' },
  { code: 'gb', hreflang: 'en-GB' },
  { code: 'us', hreflang: 'en-US' }
];

function getAlternateUrls(pathname) {
  // Remove country prefix from path
  const segments = (pathname || '/').split('/').filter(Boolean);
  const pathWithoutCountry = segments.length > 1 ? `/${segments.slice(1).join('/')}` : '/';
  return COUNTRY_CODES.map(({ code, hreflang }) => ({
    hreflang,
    url: `${BASE_URL}/${code}${pathWithoutCountry}`
  }));
}

const SeoHreflang = () => {
  const location = useLocation();
  const alternates = getAlternateUrls(location.pathname);

  return (
    <Helmet>
      {alternates.map(({ hreflang, url }) => (
        <link rel="alternate" hrefLang={hreflang} href={url} key={hreflang} />
      ))}
      {/* x-default points to Swedish as main market */}
      <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/se${alternates[0].url.replace(BASE_URL + '/se', '')}`} />
    </Helmet>
  );
};

export default SeoHreflang; 