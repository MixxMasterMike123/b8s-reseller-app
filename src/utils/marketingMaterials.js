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
  const icons = {
    'image': '🖼️',
    'video': '🎥',
    'document': '📄',
    'archive': '📦',
    'other': '📎'
  };
  
  return icons[fileType] || '📎';
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
    const response = await fetch(downloadURL);
    const blob = await response.blob();
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}; 