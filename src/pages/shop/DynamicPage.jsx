import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { useTranslation } from '../../contexts/TranslationContext';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import { toast } from 'react-hot-toast';

const DynamicPage = ({ slug: propSlug, isCmsPage = false, children = null }) => {
  const { slug: paramSlug } = useParams();
  const navigate = useNavigate();
  const slug = propSlug || paramSlug;
  const { getContentValue } = useContentTranslation();
  const { t } = useTranslation();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug || !isCmsPage) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 DynamicPage: Fetching page with slug:', slug);
        
        // Query for the page with the given slug and published status
        const pagesRef = collection(db, 'pages');
        const q = query(
          pagesRef,
          where('slug', '==', slug),
          where('status', '==', 'published')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('🔍 DynamicPage: No published page found with slug:', slug);
          setError('Page not found');
          setLoading(false);
          return;
        }

        // Get the first (and should be only) matching page
        const pageDoc = querySnapshot.docs[0];
        const pageData = {
          id: pageDoc.id,
          ...pageDoc.data()
        };

        console.log('🔍 DynamicPage: Found page:', pageData);
        setPage(pageData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching page:', error);
        setError('Error loading page');
        setLoading(false);
        toast.error('Fel vid laddning av sida');
      }
    };

    fetchPage();
  }, [slug, isCmsPage]);

  // Update document title for SEO (must be before early returns)
  useEffect(() => {
    if (page && page.title) {
      const title = getContentValue(page.title) || 'Untitled Page';
      document.title = `${title} - B8Shield`;
    }
  }, [page, getContentValue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <ShopNavigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <ShopFooter />
      </div>
    );
  }

  // If not a CMS page, render children (fallback to existing routes)
  if (!isCmsPage) {
    return children;
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <ShopNavigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('page_not_found', 'Sidan kunde inte hittas')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('page_not_found_description', 'Sidan du letar efter finns inte eller är inte publicerad.')}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {t('go_back', 'Gå tillbaka')}
            </button>
          </div>
        </div>
        <ShopFooter />
      </div>
    );
  }

  // Get page content values (must be before early returns)
  const pageTitle = page ? (getContentValue(page.title) || 'Untitled Page') : '';
  const pageContent = page ? (getContentValue(page.content) || '') : '';
  const metaTitle = page ? (getContentValue(page.metaTitle) || pageTitle) : '';
  const metaDescription = page ? (getContentValue(page.metaDescription) || '') : '';

  // Debug: Log the HTML structure to see what Quill is generating
  if (pageContent && pageContent.startsWith('<')) {
    console.log('🔍 DynamicPage: HTML content structure:', pageContent.substring(0, 500));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <ShopNavigation />
      
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {pageTitle}
            </h1>
            {page.updatedAt && (
              <p className="text-sm text-gray-500">
                {t('last_updated', 'Senast uppdaterad')}: {page.updatedAt.toDate().toLocaleDateString('sv-SE')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            {/* Render content - handle both plain text and HTML with full Quill format support */}
            {pageContent.startsWith('<') ? (
              <div 
                className="prose prose-lg max-w-none"
                style={{
                  // Enhanced Quill-specific styles with explicit element targeting
                  '--tw-prose-body': '#374151',
                  '--tw-prose-headings': '#111827',
                  '--tw-prose-links': '#2563eb',
                  '--tw-prose-bold': '#111827',
                  '--tw-prose-counters': '#6b7280',
                  '--tw-prose-bullets': '#d1d5db',
                  '--tw-prose-hr': '#e5e7eb',
                  '--tw-prose-quotes': '#6b7280',
                  '--tw-prose-quote-borders': '#e5e7eb',
                  '--tw-prose-captions': '#6b7280',
                  '--tw-prose-code': '#111827',
                  '--tw-prose-pre-code': '#e5e7eb',
                  '--tw-prose-pre-bg': '#1f2937',
                  '--tw-prose-th-borders': '#d1d5db',
                  '--tw-prose-td-borders': '#e5e7eb',
                }}
                dangerouslySetInnerHTML={{ __html: pageContent }}
              />
            ) : (
              <div className="prose prose-lg max-w-none whitespace-pre-wrap prose-p:text-gray-700 prose-p:mb-4 prose-p:leading-relaxed">
                {pageContent}
              </div>
            )}
            
            {/* Custom CSS for Quill heading styles - force override */}
            <style dangerouslySetInnerHTML={{
              __html: `
                .prose h1 {
                  font-size: 1.875rem !important;
                  line-height: 2.25rem !important;
                  font-weight: 700 !important;
                  color: #111827 !important;
                  margin-bottom: 1.5rem !important;
                  margin-top: 0 !important;
                }
                .prose h2 {
                  font-size: 1.5rem !important;
                  line-height: 2rem !important;
                  font-weight: 700 !important;
                  color: #111827 !important;
                  margin-bottom: 1rem !important;
                  margin-top: 0 !important;
                }
                .prose h3 {
                  font-size: 1.25rem !important;
                  line-height: 1.75rem !important;
                  font-weight: 700 !important;
                  color: #111827 !important;
                  margin-bottom: 0.75rem !important;
                  margin-top: 0 !important;
                }
                .prose h4 {
                  font-size: 1.125rem !important;
                  line-height: 1.75rem !important;
                  font-weight: 700 !important;
                  color: #111827 !important;
                  margin-bottom: 0.5rem !important;
                  margin-top: 0 !important;
                }
                .prose p {
                  color: #374151 !important;
                  margin-bottom: 1rem !important;
                  line-height: 1.75 !important;
                }
                .prose strong {
                  font-weight: 600 !important;
                  color: #111827 !important;
                }
                .prose em {
                  font-style: italic !important;
                  color: #374151 !important;
                }
                .prose ul {
                  list-style-type: disc !important;
                  padding-left: 1.5rem !important;
                  margin-bottom: 1rem !important;
                }
                .prose ol {
                  list-style-type: decimal !important;
                  padding-left: 1.5rem !important;
                  margin-bottom: 1rem !important;
                }
                .prose li {
                  margin-bottom: 0.25rem !important;
                }
                .prose a {
                  color: #2563eb !important;
                  text-decoration: underline !important;
                }
                .prose a:hover {
                  color: #1d4ed8 !important;
                }
              `
            }} />
          </div>
        </div>
      </div>

      <ShopFooter />
    </div>
  );
};

export default DynamicPage; 