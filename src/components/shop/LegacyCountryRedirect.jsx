import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Backward-compat for the dropped `/{countryCode}` URL prefix (Swedish-only;
// i18n deferred). Old links — past order-confirmation emails, affiliate ref
// links, bookmarks — used `/se/...`. If the path starts with a known legacy
// country code, strip it and redirect to the countryless path (e.g.
// /se/product/x -> /product/x, /se -> /). Otherwise render children (the CMS
// page handler) — so genuine countryless paths like /contact fall through
// without a redirect loop.
const LEGACY_COUNTRY_CODES = ['se', 'gb', 'us'];

const LegacyCountryRedirect = ({ children }) => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const first = (segments[0] || '').toLowerCase();

  if (LEGACY_COUNTRY_CODES.includes(first)) {
    const target = '/' + segments.slice(1).join('/');
    return <Navigate to={`${target}${location.search}`} replace />;
  }

  // Not a legacy country path — let the CMS handler try the slug.
  return children;
};

export default LegacyCountryRedirect;
