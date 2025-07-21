import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentTextIcon,
  EyeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import AppLayout from '../../components/layout/AppLayout';
import { toast } from 'react-hot-toast';

const AdminPages = () => {
  const { currentUser } = useAuth();
  const { getContentValue } = useContentTranslation();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    console.log('AdminPages useEffect - currentUser:', currentUser);
    if (!currentUser) {
      console.log('AdminPages - no currentUser, keeping loading true');
      return; // Keep loading until user is available
    }

    console.log('AdminPages - user available, setting up Firestore query');
    try {
      // Temporarily use simple collection query without orderBy to test
      const pagesQuery = collection(db, 'pages');

      console.log('AdminPages - setting up onSnapshot listener');
      const unsubscribe = onSnapshot(pagesQuery, (snapshot) => {
        console.log('AdminPages - snapshot received, docs:', snapshot.size);
        const pagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('AdminPages - pages data:', pagesData);
        setPages(pagesData);
        setLoading(false);
        console.log('AdminPages - loading set to false');
      }, (error) => {
        console.error('Error fetching pages:', error);
        
                 // If it's an index error, try without orderBy
         if (error.code === 'failed-precondition' || error.message.includes('index')) {
          const fallbackQuery = collection(db, 'pages');
          
          const fallbackUnsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
            const pagesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            // Sort in memory if no index available
            pagesData.sort((a, b) => {
              const aTime = a.updatedAt?.toMillis?.() || 0;
              const bTime = b.updatedAt?.toMillis?.() || 0;
              return bTime - aTime;
            });
            setPages(pagesData);
            setLoading(false);
          }, (fallbackError) => {
            console.error('Fallback query also failed:', fallbackError);
            toast.error('Fel vid hämtning av sidor');
            setLoading(false);
          });
          
          return () => fallbackUnsubscribe();
        } else {
          toast.error('Fel vid hämtning av sidor');
          setLoading(false);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up pages query:', error);
      setLoading(false);
    }
  }, [currentUser]);

  const handleDelete = async (pageId, pageTitle) => {
    if (!window.confirm(`Är du säker på att du vill ta bort sidan "${getContentValue(pageTitle)}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'pages', pageId));
      toast.success('Sidan har tagits bort');
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Fel vid borttagning av sida');
    }
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch = !searchTerm || 
      getContentValue(page.title)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'published' && page.status === 'published') ||
      (statusFilter === 'draft' && page.status === 'draft');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { color: 'bg-green-100 text-green-800', text: 'Publicerad' },
      draft: { color: 'bg-yellow-100 text-yellow-800', text: 'Utkast' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTranslationStatus = (page) => {
    const languages = ['sv-SE', 'en-GB', 'en-US'];
    const fields = ['title', 'content', 'metaTitle', 'metaDescription'];
    
    let completedLanguages = 0;
    
    // Check each language
    for (const lang of languages) {
      let langComplete = true;
      
      // Check each field for this language
      for (const field of fields) {
        const fieldValue = page[field];
        
        if (typeof fieldValue === 'string') {
          // Single string value - only counts for Swedish
          if (lang === 'sv-SE' && fieldValue.length === 0) {
            langComplete = false;
            break;
          }
        } else if (typeof fieldValue === 'object' && fieldValue) {
          // Multilingual object
          if (!fieldValue[lang] || fieldValue[lang].length === 0) {
            langComplete = false;
            break;
          }
        } else {
          // No value at all
          langComplete = false;
          break;
        }
      }
      
      if (langComplete) {
        completedLanguages++;
      }
    }
    
    return {
      completed: completedLanguages,
      total: languages.length,
      statusColor: completedLanguages === 3 ? 'bg-green-500' :
                   completedLanguages >= 2 ? 'bg-blue-500' :
                   completedLanguages >= 1 ? 'bg-yellow-500' :
                   'bg-gray-300'
    };
  };

  return (
    <AppLayout>
      {(loading || !currentUser) ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sidhantering</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hantera webbsidornas innehåll och struktur
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/admin/pages/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Ny sida
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Sök efter titel eller slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="all">Alla statusar</option>
                <option value="published">Publicerad</option>
                <option value="draft">Utkast</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titel
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Översättningar
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uppdaterad
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Åtgärder</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Inga sidor</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Inga sidor matchar dina filter.' 
                        : 'Kom igång genom att skapa din första sida.'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getContentValue(page.title) || 'Utan titel'}
                          </div>
                          {page.metaTitle && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              SEO: {getContentValue(page.metaTitle)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        /{page.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(page.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const translationStatus = getTranslationStatus(page);
                        return (
                          <div className="flex items-center gap-1">
                            <div 
                              className={`w-2 h-2 rounded-full ${translationStatus.statusColor}`} 
                              title={`${translationStatus.completed}/${translationStatus.total} språk kompletta`}
                            ></div>
                            <span className="text-xs text-gray-500">
                              {translationStatus.completed}/{translationStatus.total}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {page.updatedAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'Okänt'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {page.status === 'published' && (
                          <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600"
                            title="Visa sida"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </a>
                        )}
                        <Link
                          to={`/admin/pages/${page.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Redigera sida"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(page.id, page.title)}
                          className="text-red-600 hover:text-red-900"
                          title="Ta bort sida"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pages.length}</div>
            <div className="text-sm text-gray-500">Totalt antal sidor</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {pages.filter(p => p.status === 'published').length}
            </div>
            <div className="text-sm text-gray-500">Publicerade sidor</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {pages.filter(p => p.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-500">Utkast</div>
          </div>
        </div>
      </div>
    </div>
      )}
    </AppLayout>
  );
};

export default AdminPages; 