import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

// File type configurations
export const ALLOWED_FILE_TYPES = {
  'application/pdf': { icon: 'DocumentIcon', label: 'PDF', color: 'text-red-500' },
  'application/msword': { icon: 'DocumentIcon', label: 'DOC', color: 'text-blue-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'DocumentIcon', label: 'DOCX', color: 'text-blue-500' },
  'application/vnd.ms-excel': { icon: 'DocumentIcon', label: 'XLS', color: 'text-green-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'DocumentIcon', label: 'XLSX', color: 'text-green-500' },
  'text/plain': { icon: 'DocumentIcon', label: 'TXT', color: 'text-gray-500' },
  'application/zip': { icon: 'DocumentIcon', label: 'ZIP', color: 'text-purple-500' },
  'application/x-zip-compressed': { icon: 'DocumentIcon', label: 'ZIP', color: 'text-purple-500' }
};

// File size limits (in bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_PAGE = 10;

// Validate file before upload
export const validateFile = (file) => {
  const errors = [];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`Filen är för stor. Maximal storlek: ${formatFileSize(MAX_FILE_SIZE)}`);
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES[file.type]) {
    errors.push('Filtypen stöds inte. Tillåtna filtyper: PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP');
  }

  return errors;
};

// Format file size for display
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Upload file to Firebase Storage
export const uploadFile = async (file, pageId, userId) => {
  try {
    // Validate file
    const errors = validateFile(file);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `pages/${pageId}/attachments/${fileName}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Return file data
    return {
      id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      displayName: file.name,
      url: downloadURL,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      uploadedBy: userId,
      downloads: 0,
      isPublic: true,
      storagePath: storagePath
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

// Delete file from Firebase Storage
export const deleteFile = async (storagePath) => {
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error('File deletion error:', error);
    throw error;
  }
};

// Get file type info
export const getFileTypeInfo = (mimeType) => {
  return ALLOWED_FILE_TYPES[mimeType] || { 
    icon: 'DocumentIcon', 
    label: 'FILE', 
    color: 'text-gray-500' 
  };
};

// Generate file preview (for supported types)
export const generateFilePreview = (file) => {
  // For now, return null - we can add preview generation later
  // (PDF thumbnails, document previews, etc.)
  return null;
}; 