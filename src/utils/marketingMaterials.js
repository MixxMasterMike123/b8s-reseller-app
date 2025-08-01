import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
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

// File type detection and validation
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
  // Using proper SVG icons instead of emojis as per B8Shield rules
  const icons = {
    'image': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    'video': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    'document': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    'archive': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    'other': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    )
  };
  
  return icons[fileType] || icons['other'];
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

// Generic Marketing Materials Functions
export const uploadGenericMaterial = async (file, materialData) => {
  try {
    if (!isValidFileType(file.name)) {
      throw new Error('Filtypen stöds inte');
    }

    // Upload file to Firebase Storage
    const storageRef = ref(storage, `marketing-materials/generic/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save metadata to Firestore
    const materialDoc = {
      name: materialData.name || file.name,
      description: materialData.description || '',
      fileName: file.name,
      fileType: getFileType(file.name),
      fileSize: file.size,
      downloadURL: downloadURL,
      storagePath: snapshot.ref.fullPath,
      category: materialData.category || 'allmänt',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'marketingMaterials'), materialDoc);
    
    return {
      id: docRef.id,
      ...materialDoc,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error uploading generic material:', error);
    throw error;
  }
};

export const getGenericMaterials = async () => {
  try {
    const q = query(
      collection(db, 'marketingMaterials'), 
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const materials = [];
    querySnapshot.forEach((doc) => {
      materials.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return materials;
  } catch (error) {
    console.error('Error fetching generic materials:', error);
    throw error;
  }
};

export const getGenericMaterialById = async (materialId) => {
  try {
    const materialRef = doc(db, 'marketingMaterials', materialId);
    const materialSnap = await getDoc(materialRef);
    
    if (materialSnap.exists()) {
      return {
        id: materialSnap.id,
        ...materialSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching generic material by ID:', error);
    throw error;
  }
};

export const updateGenericMaterial = async (materialId, updates) => {
  try {
    const materialRef = doc(db, 'marketingMaterials', materialId);
    await updateDoc(materialRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating generic material:', error);
    throw error;
  }
};

export const deleteGenericMaterial = async (materialId) => {
  try {
    // Get material data to delete from storage
    const materialRef = doc(db, 'marketingMaterials', materialId);
    const materialSnap = await getDoc(materialRef);
    
    if (materialSnap.exists()) {
      const materialData = materialSnap.data();
      
      // Delete from Firebase Storage
      if (materialData.storagePath) {
        const storageRef = ref(storage, materialData.storagePath);
        await deleteObject(storageRef);
      }
      
      // Delete from Firestore
      await deleteDoc(materialRef);
    }
  } catch (error) {
    console.error('Error deleting generic material:', error);
    throw error;
  }
};

// Customer-Specific Marketing Materials Functions
export const uploadCustomerMaterial = async (customerId, file, materialData) => {
  try {
    if (!isValidFileType(file.name)) {
      throw new Error('Filtypen stöds inte');
    }

    // Upload file to Firebase Storage
    const storageRef = ref(storage, `marketing-materials/customers/${customerId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save metadata to Firestore subcollection
    const materialDoc = {
      name: materialData.name || file.name,
      description: materialData.description || '',
      fileName: file.name,
      fileType: getFileType(file.name),
      fileSize: file.size,
      downloadURL: downloadURL,
      storagePath: snapshot.ref.fullPath,
      category: materialData.category || 'kundspecifikt',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(
      collection(db, 'users', customerId, 'marketingMaterials'), 
      materialDoc
    );
    
    return {
      id: docRef.id,
      ...materialDoc,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error uploading customer material:', error);
    throw error;
  }
};

export const getCustomerMaterials = async (customerId) => {
  try {
    const q = query(
      collection(db, 'users', customerId, 'marketingMaterials'), 
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const materials = [];
    querySnapshot.forEach((doc) => {
      materials.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return materials;
  } catch (error) {
    console.error('Error fetching customer materials:', error);
    throw error;
  }
};

export const getCustomerMaterialById = async (customerId, materialId) => {
  try {
    const materialRef = doc(db, 'users', customerId, 'marketingMaterials', materialId);
    const materialSnap = await getDoc(materialRef);
    
    if (materialSnap.exists()) {
      return {
        id: materialSnap.id,
        ...materialSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching customer material by ID:', error);
    throw error;
  }
};

export const updateCustomerMaterial = async (customerId, materialId, updates) => {
  try {
    const materialRef = doc(db, 'users', customerId, 'marketingMaterials', materialId);
    await updateDoc(materialRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating customer material:', error);
    throw error;
  }
};

export const deleteCustomerMaterial = async (customerId, materialId) => {
  try {
    // Get material data to delete from storage
    const materialRef = doc(db, 'users', customerId, 'marketingMaterials', materialId);
    const materialSnap = await getDoc(materialRef);
    
    if (materialSnap.exists()) {
      const materialData = materialSnap.data();
      
      // Delete from Firebase Storage
      if (materialData.storagePath) {
        const storageRef = ref(storage, materialData.storagePath);
        await deleteObject(storageRef);
      }
      
      // Delete from Firestore
      await deleteDoc(materialRef);
    }
  } catch (error) {
    console.error('Error deleting customer material:', error);
    throw error;
  }
};

// Auto-populate from products
export const populateFromProducts = async () => {
  try {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const materialsToAdd = [];
    
    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      
      // Add main product image if exists
      if (product.imageData) {
        materialsToAdd.push({
          name: `${product.name} - Produktbild`,
          description: `Produktbild för ${product.name}`,
          fileName: `${product.name}_product.jpg`,
          fileType: 'image',
          downloadURL: product.imageData,
          category: 'produktbilder',
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          sourceType: 'product',
          sourceId: doc.id
        });
      }
      

    });
    
    // Add all materials to Firestore
    const promises = materialsToAdd.map(material => 
      addDoc(collection(db, 'marketingMaterials'), material)
    );
    
    await Promise.all(promises);
    return materialsToAdd.length;
  } catch (error) {
    console.error('Error populating from products:', error);
    throw error;
  }
};

// File download helper
export const downloadFile = async (downloadURL, fileName) => {
  try {
    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = downloadURL;
    link.download = fileName;
    link.target = '_blank'; // Open in new tab to avoid CORS issues
    link.rel = 'noopener noreferrer';
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}; 