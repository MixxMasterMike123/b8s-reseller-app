import React from 'react';

const LanguageRouter = ({ children }) => {
  // B8Shield system doesn't use language prefixes in URLs
  // Language is handled through context only
  // Just render children without any routing logic
  return children;
};

export default LanguageRouter;
