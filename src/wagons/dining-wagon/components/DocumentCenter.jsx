import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  DocumentTextIcon,
  PhotoIcon,
  DocumentArrowUpIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  DocumentTextIcon as DocumentTextSolid,
  PhotoIcon as PhotoSolid
} from '@heroicons/react/24/solid';
import { db, storage } from '../../../firebase/config';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const DocumentCenter = ({ contactId, contactName, isOpen, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Document categories with restaurant theme
  const documentCategories = [
    { id: 'contract', name: 'Kontrakt', icon: DocumentTextIcon, color: 'blue' },
    { id: 'proposal', name: 'Förslag', icon: DocumentTextIcon, color: 'green' },
    { id: 'invoice', name: 'Fakturor', icon: DocumentTextIcon, color: 'yellow' },
    { id: 'meeting-notes', name: 'Mötesanteckningar', icon: DocumentTextIcon, color: 'purple' },
    { id: 'presentation', name: 'Presentationer', icon: PhotoIcon, color: 'pink' },
    { id: 'technical', name: 'Teknisk Info', icon: DocumentTextIcon, color: 'indigo' },
    { id: 'communication', name: 'Kommunikation', icon: DocumentTextIcon, color: 'gray' },
    { id: 'other', name: 'Övrigt', icon: FolderIcon, color: 'orange' }
  ];

  // Load documents for this contact
  useEffect(() => {
    if (!contactId) return;

    setLoading(true);
    // 🚂 WAGON TRICK: Use simple query without orderBy to avoid needing composite index
    const q = query(
      collection(db, 'customerDocuments'),
      where('contactId', '==', contactId)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const docsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // 🚂 WAGON TRICK: Sort client-side since we removed orderBy from query
        const sortedDocs = docsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateB - dateA; // Newest first
        });
        setDocuments(sortedDocs);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading documents:', error);
        toast.error('Kunde inte ladda dokument');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [contactId]);

  // Handle file upload
  const handleFileUpload = async (files) => {
    if (!contactId || !files.length) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        // Validate file
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast.error(`Fil ${file.name} är för stor (max 10MB)`);
          return null;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        // 🚂 WAGON TRICK: Use existing marketing-materials path to avoid new storage rules
        const filePath = `marketing-materials/customers/${contactId}/crm-documents/${filename}`;

        // Upload to Firebase Storage
        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        // Save metadata to Firestore
        const docData = {
          contactId,
          contactName,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          category: selectedCategory || 'other',
          downloadUrl: downloadURL,
          storagePath: filePath,
          createdAt: new Date(),
          uploadedBy: 'current-user' // TODO: Get from auth context
        };

        await addDoc(collection(db, 'customerDocuments'), docData);

        toast.success(`${file.name} uppladdad`);
        return docData;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Kunde inte ladda upp ${file.name}`);
        return null;
      }
    });

    await Promise.all(uploadPromises);
    setUploading(false);
    setSelectedCategory('');
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
    event.target.value = ''; // Reset input
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Delete document
  const handleDeleteDocument = async (document) => {
    if (!confirm(`Är du säker på att du vill ta bort "${document.fileName}"?`)) {
      return;
    }

    try {
      // Delete from Firebase Storage
      const storageRef = ref(storage, document.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'customerDocuments', document.id));

      toast.success('Dokument borttaget');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Kunde inte ta bort dokument');
    }
  };

  // Download document
  const handleDownloadDocument = (document) => {
    window.open(document.downloadUrl, '_blank');
  };

  // Get file type icon
  const getFileIcon = (fileType, fileName) => {
    if (fileType.startsWith('image/')) {
      return PhotoSolid;
    } else if (fileType.includes('pdf')) {
      return DocumentTextSolid;
    } else if (fileType.includes('word') || fileName.toLowerCase().includes('.doc')) {
      return DocumentTextSolid;
    } else if (fileType.includes('excel') || fileName.toLowerCase().includes('.xls')) {
      return DocumentTextSolid;
    } else {
      return DocumentTextSolid;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Group documents by category
  const documentsByCategory = documents.reduce((acc, doc) => {
    const category = doc.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FolderIcon className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Dokumentarkiv</h2>
                <p className="text-orange-100 dark:text-orange-200">{contactName}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full max-h-[calc(90vh-100px)]">
          {/* Upload Area */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dokumentkategori
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
              >
                <option value="">Välj kategori...</option>
                {documentCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Släpp filer här eller klicka för att välja
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Stöder PDF, Word, Excel, bilder och mer (max 10MB per fil)
              </p>
              
              <label className="bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium cursor-pointer inline-flex items-center space-x-2 transition-colors">
                <PlusIcon className="h-5 w-5" />
                <span>Välj Filer</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="*/*"
                />
              </label>
              
              {uploading && (
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 dark:border-orange-400 mx-auto"></div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">Laddar upp...</p>
                </div>
              )}
            </div>
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Laddar dokument...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FolderIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-lg font-medium">Inga dokument än</p>
                <p className="text-sm">Ladda upp filer för att komma igång</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(documentsByCategory).map(([categoryId, categoryDocs]) => {
                  const category = documentCategories.find(c => c.id === categoryId) || 
                                   { name: 'Övrigt', color: 'gray', icon: FolderIcon };
                  
                  return (
                    <div key={categoryId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <category.icon className={`h-5 w-5 text-${category.color}-600 mr-2`} />
                        {category.name} ({categoryDocs.length})
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryDocs.map((document) => {
                          const FileIcon = getFileIcon(document.fileType, document.fileName);
                          
                          return (
                            <div key={document.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                              <div className="flex items-start space-x-3">
                                <FileIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                                
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={document.fileName}>
                                    {document.fileName}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {formatFileSize(document.fileSize)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {document.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'Okänt datum'}
                                  </p>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleDownloadDocument(document)}
                                    className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 p-2 rounded-lg transition-colors"
                                    title="Ladda ner"
                                  >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                  </button>
                                  
                                  <button
                                    onClick={() => window.open(document.downloadUrl, '_blank')}
                                    className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 p-2 rounded-lg transition-colors"
                                    title="Visa"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDeleteDocument(document)}
                                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 p-2 rounded-lg transition-colors"
                                    title="Ta bort"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Totalt {documents.length} dokument
              </p>
              <button
                onClick={onClose}
                className="bg-gray-600 dark:bg-gray-500 hover:bg-gray-700 dark:hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCenter; 