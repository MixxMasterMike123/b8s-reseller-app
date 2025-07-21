import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  EyeIcon,
  CheckIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import ContentLanguageIndicator from '../../components/ContentLanguageIndicator';
import AppLayout from '../../components/layout/AppLayout';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-hot-toast';

// ReactQuill configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'color', 'background',
  'align',
  'link', 'image'
];

const AdminPageEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { getContentValue, setContentValue } = useContentTranslation();
  

  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    status: 'draft',
    metaTitle: '',
    metaDescription: '',
    createdAt: null,
    updatedAt: null,
    createdBy: '',
    updatedBy: ''
  });

  const isNewPage = id === 'new';
  const [hasBeenSaved, setHasBeenSaved] = useState(false);

  // Update formData when user becomes available
  useEffect(() => {
    if (currentUser && isNewPage) {
      setFormData(prev => ({
        ...prev,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid
      }));
    }
  }, [currentUser, isNewPage]);

  useEffect(() => {
    // Wait for user to be loaded
    if (!currentUser) {
      setLoading(false);
      return;
    }

    if (isNewPage) {
      setLoading(false);
      return;
    }

    const fetchPage = async () => {
      try {
        const pageDoc = await getDoc(doc(db, 'pages', id));
        if (pageDoc.exists()) {
                  const pageData = pageDoc.data();
        setFormData(prev => ({
          ...prev,
          ...pageData,
          createdBy: pageData.createdBy || currentUser.uid,
          updatedBy: pageData.updatedBy || currentUser.uid
        }));
        // Mark as saved since this is an existing page
        setHasBeenSaved(true);
        } else {
          toast.error('Sidan kunde inte hittas');
          navigate('/admin/pages');
        }
      } catch (error) {
        console.error('Error fetching page:', error);
        toast.error('Fel vid hämtning av sida');
      } finally {
        setLoading(false);
      }
    };

          fetchPage();
  }, [id, isNewPage, currentUser, navigate]);

  const generateSlug = (title) => {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Auto-generate slug from Swedish title when title changes (only for new pages)
  const handleTitleChange = (e) => {
    const newTitle = setContentValue(formData.title, e.target.value);
    
    setFormData({
      ...formData,
      title: newTitle,
      // Only auto-generate slug if this is a new page that hasn't been saved yet
      slug: (isNewPage && !hasBeenSaved) ? generateSlug(newTitle['sv-SE'] || '') : formData.slug
    });
  };

  const handleSave = async (newStatus = formData.status) => {
    if (!formData.title || !getContentValue(formData.title)) {
      toast.error('Titel är obligatorisk');
      return;
    }

    if (!formData.slug) {
      toast.error('Slug är obligatorisk');
      return;
    }

    setSaving(true);

    try {
      const pageData = {
        ...formData,
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || '',
        ...(isNewPage && {
          createdAt: serverTimestamp(),
                      createdBy: currentUser?.uid || ''
        })
      };

      if (isNewPage) {
        // For new pages, use addDoc to generate a unique ID
        const docRef = await addDoc(collection(db, 'pages'), pageData);
        const pageId = docRef.id;
        
        toast.success('Sidan har skapats');
        setHasBeenSaved(true); // Mark as saved after first save
        navigate(`/admin/pages/${pageId}`);
      } else {
        // For existing pages, use setDoc with the existing ID
        await setDoc(doc(db, 'pages', id), pageData);
        
        toast.success('Sidan har uppdaterats');
        setFormData(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Fel vid sparande av sida');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => handleSave('published');
  const handleSaveDraft = () => handleSave('draft');

  const tabs = [
    { id: 'content', name: 'Innehåll', icon: DocumentDuplicateIcon },
    { id: 'seo', name: 'SEO', icon: Cog6ToothIcon }
  ];

  return (
    <AppLayout>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/pages"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Tillbaka till sidor
          </Link>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {!isNewPage && formData.status === 'published' && (
            <a
              href={`/${formData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              Visa sida
            </a>
          )}
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Spara utkast
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            {formData.status === 'published' ? 'Uppdatera' : 'Publicera'}
          </button>
        </div>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNewPage ? 'Ny sida' : getContentValue(formData.title) || 'Redigera sida'}
        </h1>
        {!isNewPage && (
          <p className="mt-1 text-sm text-gray-500">
            Slug: /{formData.slug} • Status: {formData.status === 'published' ? 'Publicerad' : 'Utkast'}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {activeTab === 'content' && (
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Titel *
              </label>
              <ContentLanguageIndicator 
                contentField={formData.title}
                label="Titel"
                currentValue={getContentValue(formData.title)}
              />
              <input
                type="text"
                id="title"
                value={getContentValue(formData.title)}
                onChange={handleTitleChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sidans titel..."
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                Slug *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  /
                </span>
                <input
                  type="text"
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="flex-1 block w-full border border-gray-300 rounded-r-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="sida-slug"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {isNewPage && !hasBeenSaved ? (
                  <>
                    URL-vänlig version av sidtiteln. <span className="font-medium text-blue-600">Genereras automatiskt från svenska titeln.</span> Endast små bokstäver, siffror och bindestreck.
                  </>
                ) : (
                  <>
                    URL-vänlig version av sidtiteln. <span className="font-medium text-gray-600">Manuell redigering möjlig.</span> Endast små bokstäver, siffror och bindestreck.
                  </>
                )}
              </p>
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Innehåll
              </label>
              <ContentLanguageIndicator 
                contentField={formData.content}
                label="Innehåll"
                currentValue={getContentValue(formData.content)}
              />
              <ReactQuill
                theme="snow"
                value={getContentValue(formData.content)}
                onChange={(value) => setFormData({
                  ...formData,
                  content: setContentValue(formData.content, value)
                })}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Sidans innehåll..."
                className="bg-white"
              />
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="p-6 space-y-6">
            {/* Meta Title */}
            <div>
              <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-2">
                SEO Titel
              </label>
              <ContentLanguageIndicator 
                contentField={formData.metaTitle}
                label="SEO Titel"
                currentValue={getContentValue(formData.metaTitle)}
              />
              <input
                type="text"
                id="metaTitle"
                value={getContentValue(formData.metaTitle)}
                onChange={(e) => setFormData({
                  ...formData,
                  metaTitle: setContentValue(formData.metaTitle, e.target.value)
                })}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="SEO-optimerad titel för sökmotorer..."
                maxLength="60"
              />
              <p className="mt-1 text-xs text-gray-500">
                {getContentValue(formData.metaTitle).length}/60 tecken
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-2">
                SEO Beskrivning
              </label>
              <ContentLanguageIndicator 
                contentField={formData.metaDescription}
                label="SEO Beskrivning"
                currentValue={getContentValue(formData.metaDescription)}
              />
              <textarea
                id="metaDescription"
                rows="3"
                value={getContentValue(formData.metaDescription)}
                onChange={(e) => setFormData({
                  ...formData,
                  metaDescription: setContentValue(formData.metaDescription, e.target.value)
                })}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Kort beskrivning av sidan för sökmotorer..."
                maxLength="160"
              />
              <p className="mt-1 text-xs text-gray-500">
                {getContentValue(formData.metaDescription).length}/160 tecken
              </p>
            </div>

            {/* SEO Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">SEO Tips:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Använd relevanta nyckelord i titel och beskrivning</li>
                <li>• Håll titeln under 60 tecken och beskrivningen under 160 tecken</li>
                <li>• Gör titeln och beskrivningen unika för varje sida</li>
                <li>• Skriv för människor, inte bara sökmotorer</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Save reminder */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg">
          Sparar sida...
        </div>
      )}
    </div>
      )}
    </AppLayout>
  );
};

export default AdminPageEdit; 