import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase/config';

// Admin-only document management utilities
// These documents are NOT visible to customers - only to admins

export const getFileType = (fileName) => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  const fileTypes = {
    // Images
    'jpg': 'image',
    'jpeg': 'image', 
    'png': 'image',
    'gif': 'image',
    'webp': 'image',
    'svg': 'image',
    
    // Videos
    'mp4': 'video',
    'mov': 'video',
    'avi': 'video',
    'webm': 'video',
    'mkv': 'video',
    
    // Documents
    'pdf': 'document',
    'doc': 'document',
    'docx': 'document',
    'txt': 'document',
    'rtf': 'document',
    
    // Other
    'zip': 'archive',
    'rar': 'archive'
  };
  
  return fileTypes[extension] || 'other';
};

export const getFileIcon = (fileType) => {
  const icons = {
    'image': '🖼️',
    'video': '🎥',
    'document': '📄',
    'archive': '📦',
    'other': '📁'
  };
  
  return icons[fileType] || '📁';
};

export const isValidFileType = (fileName) => {
  const validExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'mp4', 'mov', 'avi', 'webm', 'mkv',
    'pdf', 'doc', 'docx', 'txt', 'rtf',
    'zip', 'rar'
  ];
  
  const extension = fileName.toLowerCase().split('.').pop();
  return validExtensions.includes(extension);
};

// Upload admin document for specific customer
export const uploadAdminDocument = async (customerId, file, documentData, uploadedBy) => {
  try {
    if (!isValidFileType(file.name)) {
      throw new Error('Filtypen stöds inte');
    }

    // Upload file to Firebase Storage (admin-only location)
    const storageRef = ref(storage, `admin-documents/customers/${customerId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save metadata to admin-only collection
    const docData = {
      customerId,
      fileName: file.name,
      fileType: getFileType(file.name),
      fileSize: file.size,
      downloadUrl: downloadURL,
      storagePath: snapshot.ref.fullPath,
      category: documentData.category || 'dokument',
      title: documentData.title || file.name,
      description: documentData.description || '',
      notes: documentData.notes || '',
      uploadedBy,
      uploadedAt: serverTimestamp(),
      isAdminOnly: true,
      isActive: true
    };

    const docRef = await addDoc(collection(db, 'adminCustomerDocuments'), docData);
    
    return {
      id: docRef.id,
      ...docData,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('Error uploading admin document:', error);
    throw error;
  }
};

// Get all admin documents for a specific customer
export const getAdminDocuments = async (customerId) => {
  try {
    const q = query(
      collection(db, 'adminCustomerDocuments'),
      where('customerId', '==', customerId),
      where('isActive', '==', true),
      orderBy('uploadedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return documents;
  } catch (error) {
    console.error('Error fetching admin documents:', error);
    throw error;
  }
};

// Update admin document metadata
export const updateAdminDocument = async (documentId, updateData) => {
  try {
    const docRef = doc(db, 'adminCustomerDocuments', documentId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating admin document:', error);
    throw error;
  }
};

// Delete admin document
export const deleteAdminDocument = async (documentId) => {
  try {
    // First get the document to get storage path
    const docRef = doc(db, 'adminCustomerDocuments', documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const docData = docSnap.data();
      
      // Delete from Firebase Storage
      if (docData.storagePath) {
        const storageRef = ref(storage, docData.storagePath);
        await deleteObject(storageRef);
      }
      
      // Delete from Firestore
      await deleteDoc(docRef);
    }
  } catch (error) {
    console.error('Error deleting admin document:', error);
    throw error;
  }
};

// Download file helper
export const downloadFile = async (downloadUrl, fileName) => {
  try {
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

// Format file size helper
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 