import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const LanguageRouter = ({ children }) => {
  const location = useLocation();
  
  // Check if URL already has language prefix
  const hasLanguagePrefix = /^\/[a-z]{2}(-[A-Z]{2})?\//.test(location.pathname);
  
  // If no language prefix, redirect to Swedish version
  if (!hasLanguagePrefix && location.pathname !== '/') {
    const newPath = `/sv${location.pathname}${location.search}`;
    return <Navigate to={newPath} replace />;
  }
  
  return children;
};

export default LanguageRouter;
