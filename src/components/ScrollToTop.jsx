import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    // Also scroll to top on initial page load/reload
    // Use setTimeout to ensure it runs after browser's scroll restoration attempt
    const scrollToTop = () => {
      window.scrollTo(0, 0);
    };
    
    scrollToTop(); // Immediate
    setTimeout(scrollToTop, 0); // After current execution stack
    setTimeout(scrollToTop, 100); // After potential browser restoration
  }, []);

  return null;
};

export default ScrollToTop; 