import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { useTranslation } from '../../contexts/TranslationContext';
import toast from 'react-hot-toast';
import ProductMenu from '../../components/ProductMenu';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import AppLayout from '../../components/layout/AppLayout';
import ContentLanguageIndicator from '../../components/ContentLanguageIndicator';
import ProductGroupTab from '../../components/admin/ProductGroupTab';
import SortableImageGallery from '../../components/admin/SortableImageGallery';
import { saveProductGroupContent } from '../../utils/productGroups';

// Maximum size for image files (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Flag to disable default database operations
const USE_DEFAULT_DB = false;

function AdminProducts() {
  const { isAdmin, user } = useAuth();
  const { currentLanguage, getContentValue, setContentValue } = useContentTranslation();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'b2b', 'b2c', 'group'
  
  // Group autocomplete states
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupInput, setGroupInput] = useState('');
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [filteredGroups, setFilteredGroups] = useState([]);
  
  // B2B Image states
  const [b2bImageFile, setB2bImageFile] = useState(null);
  const [b2bImagePreview, setB2bImagePreview] = useState(null);
  const [eanPngFile, setEanPngFile] = useState(null);
  const [eanPngPreview, setEanPngPreview] = useState(null);
  const [eanSvgFile, setEanSvgFile] = useState(null);
  const [eanSvgPreview, setEanSvgPreview] = useState(null);
  
  // B2C Image states
  const [b2cImageFile, setB2cImageFile] = useState(null);
  const [b2cImagePreview, setB2cImagePreview] = useState(null);
  const [b2cGalleryFiles, setB2cGalleryFiles] = useState([]);
  const [b2cGalleryPreviews, setB2cGalleryPreviews] = useState([]);
  
  // Track existing vs new images
  const [existingB2cGallery, setExistingB2cGallery] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    sku: '',
    description: '',
    size: '',
    color: '',
    basePrice: 0,
    manufacturingCost: 0,
    isActive: true,
    eanCode: '',
    imageUrl: '',
    eanImagePngUrl: '',
    eanImageSvgUrl: '',
    b2bImageUrl: '',
    b2cImageUrl: '',
    b2cPrice: 0,
    availability: {
      b2b: true,
      b2c: true,
      b2bMinQuantity: 1,
      b2cMaxQuantity: 10
    },
    descriptions: {
      b2b: '',
      b2c: ''
    },
    weight: {
      value: 0,
      unit: 'g'
    },
    dimensions: {
      length: { value: 0, unit: 'mm' },
      width: { value: 0, unit: 'mm' },
      height: { value: 0, unit: 'mm' }
    },
    shipping: {
      sweden: { cost: 0, service: 'Standard' },
      nordic: { cost: 0, service: 'Nordic' },
      eu: { cost: 0, service: 'EU' },
      worldwide: { cost: 0, service: 'International' }
    }
  });
  const [filteredProduct, setFilteredProduct] = useState(null);
  const [groupContent, setGroupContent] = useState(null);

  // Load products from Firestore
  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching products from named database (b8s-reseller-db)...');
      
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = [];
      const groupsSet = new Set();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          ...data
        });
        
        // Collect unique groups for autocomplete
        if (data.group && data.group.trim()) {
          groupsSet.add(data.group.trim());
        }
      });
      
      // Sort products alphabetically
      productsData.sort((a, b) => {
        const nameA = getContentValue(a.name) || a.name || '';
        const nameB = getContentValue(b.name) || b.name || '';
        return nameA.localeCompare(nameB);
      });
      
      // Update available groups for autocomplete
      setAvailableGroups(Array.from(groupsSet).sort());
      
      console.log(`✅ Successfully loaded ${productsData.length} products from named DB`);
      console.log(`📝 Found ${groupsSet.size} unique product groups`);
      setProducts(productsData);
      setError('');
    } catch (err) {
      console.error('❌ Error fetching products from named DB:', err);
      setError('Failed to load products: ' + err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddNewClick = () => {
    setSelectedProduct(null);
    setFormData({
      id: '',
      name: '',
      sku: '',
      description: '',
      size: '',
      color: '',
      group: '',
      basePrice: 0,
      manufacturingCost: 0,
      isActive: true,
      eanCode: '',
      imageUrl: '',
      eanImagePngUrl: '',
      eanImageSvgUrl: '',
      b2bImageUrl: '',
      b2cImageUrl: '',
      b2cPrice: 0,
      availability: {
        b2b: true,
        b2c: true,
        b2bMinQuantity: 1,
        b2cMaxQuantity: 10
      },
      descriptions: {
        b2b: '',
        b2c: '',
        b2cMoreInfo: ''
      },
      weight: {
        value: 0,
        unit: 'g'
      },
      dimensions: {
        length: { value: 0, unit: 'mm' },
        width: { value: 0, unit: 'mm' },
        height: { value: 0, unit: 'mm' }
      },
      shipping: {
        sweden: { cost: 0, service: 'Standard' },
        nordic: { cost: 0, service: 'Nordic' },
        eu: { cost: 0, service: 'EU' },
        worldwide: { cost: 0, service: 'International' }
      }
    });
    
    // Reset all image states
    setB2bImageFile(null);
    setB2bImagePreview(null);
    setEanPngFile(null);
    setEanPngPreview(null);
    setEanSvgFile(null);
    setEanSvgPreview(null);
    setB2cImageFile(null);
    setB2cImagePreview(null);
    setB2cGalleryFiles([]);
    setB2cGalleryPreviews([]);
    
    // Reset group input for autocomplete
    setGroupInput('');
    
    // Reset group content
    setGroupContent(null);
    
    setIsAddingProduct(true);
  };

  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setFormData({
      id: product.id || '',
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      size: product.size || '',
      color: product.color || '',
      group: product.group || '',
      basePrice: product.basePrice || 0,
      manufacturingCost: product.manufacturingCost || 0,
      isActive: product.isActive ?? true,
      eanCode: product.eanCode || '',
      imageUrl: product.imageUrl || '',
      eanImagePngUrl: product.eanImagePngUrl || '',
      eanImageSvgUrl: product.eanImageSvgUrl || '',
      b2bImageUrl: product.b2bImageUrl || '',
      b2cImageUrl: product.b2cImageUrl || '',
      b2cPrice: product.b2cPrice || 0,
      availability: {
        b2b: product.availability?.b2b !== false,
        b2c: product.availability?.b2c !== false,
        b2bMinQuantity: product.availability?.b2bMinQuantity || 1,
        b2cMaxQuantity: product.availability?.b2cMaxQuantity || 10
      },
      descriptions: {
        b2b: product.descriptions?.b2b || '',
        b2c: product.descriptions?.b2c || '',
        b2cMoreInfo: product.descriptions?.b2cMoreInfo || ''
      },
      weight: {
        value: product.weight?.value || 0,
        unit: product.weight?.unit || 'g'
      },
      dimensions: {
        length: { 
          value: product.dimensions?.length?.value || 0, 
          unit: product.dimensions?.length?.unit || 'mm' 
        },
        width: { 
          value: product.dimensions?.width?.value || 0, 
          unit: product.dimensions?.width?.unit || 'mm' 
        },
        height: { 
          value: product.dimensions?.height?.value || 0, 
          unit: product.dimensions?.height?.unit || 'mm' 
        }
      },
      shipping: {
        sweden: { 
          cost: product.shipping?.sweden?.cost || 0, 
          service: product.shipping?.sweden?.service || 'Standard' 
        },
        nordic: { 
          cost: product.shipping?.nordic?.cost || 0, 
          service: product.shipping?.nordic?.service || 'Nordic' 
        },
        eu: { 
          cost: product.shipping?.eu?.cost || 0, 
          service: product.shipping?.eu?.service || 'EU' 
        },
        worldwide: { 
          cost: product.shipping?.worldwide?.cost || 0, 
          service: product.shipping?.worldwide?.service || 'International' 
        }
      }
    });
    
    // Reset all image states
    setB2bImageFile(null);
    setB2bImagePreview(product.b2bImageUrl || product.imageUrl || null);
    setEanPngFile(null);
    setEanPngPreview(product.eanImagePngUrl || null);
    setEanSvgFile(null);
    setEanSvgPreview(product.eanImageSvgUrl || null);
    setB2cImageFile(null);
    setB2cImagePreview(product.b2cImageUrl || null);
    setB2cGalleryFiles([]);
    setB2cGalleryPreviews([]);
    
    // Track existing images separately
    setExistingB2cGallery(product.b2cImageGallery || []);
    setImagesToDelete([]);
    
    // Set group input for autocomplete
    setGroupInput(product.group || '');
    
    // Reset group content (will be loaded by ProductGroupTab)
    setGroupContent(null);
    
    setIsAddingProduct(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle group input with autocomplete
  const handleGroupInputChange = (e) => {
    const value = e.target.value;
    setGroupInput(value);
    setFormData({ ...formData, group: value });
    
    // Filter available groups based on input
    if (value.trim()) {
      const filtered = availableGroups.filter(group => 
        group.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredGroups(filtered);
      setShowGroupSuggestions(filtered.length > 0);
    } else {
      setFilteredGroups([]);
      setShowGroupSuggestions(false);
    }
  };

  // Handle group selection from suggestions
  const handleGroupSelect = (selectedGroup) => {
    setGroupInput(selectedGroup);
    setFormData({ ...formData, group: selectedGroup });
    setShowGroupSuggestions(false);
  };

  // Handle group input focus
  const handleGroupFocus = () => {
    if (availableGroups.length > 0 && !groupInput.trim()) {
      setFilteredGroups(availableGroups);
      setShowGroupSuggestions(true);
    }
  };

  // Handle group input blur with delay to allow selection
  const handleGroupBlur = () => {
    setTimeout(() => setShowGroupSuggestions(false), 200);
  };

  // Upload image to Firebase Storage
  // Enhanced image upload with compression to reduce bandwidth costs
  const uploadImageToStorage = async (file, productId, imageType) => {
    try {
      const timestamp = Date.now();
      
      // Compress image to reduce bandwidth costs by 60-80%
      const compressedFile = await compressImageForUpload(file, imageType);
      
      const fileName = `${imageType}_${timestamp}_${compressedFile.name || file.name}`;
      const storageRef = ref(storage, `products/${productId}/${fileName}`);
      
      console.log(`📤 Uploading compressed ${imageType} to Firebase Storage...`);
      console.log(`🗜️ Size reduction: ${file.size} → ${compressedFile.size} bytes (${((1 - compressedFile.size/file.size) * 100).toFixed(1)}% smaller)`);
      
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log(`✅ ${imageType} uploaded successfully`);
      return downloadURL;
    } catch (error) {
      console.error(`❌ Error uploading ${imageType}:`, error);
      throw error;
    }
  };

  // Image compression utility to reduce Firebase hosting costs
  const compressImageForUpload = (file, imageType) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Different compression levels based on image type
        const compressionSettings = {
          'b2b': { maxWidth: 800, maxHeight: 800, quality: 0.85 },
          'b2c': { maxWidth: 1000, maxHeight: 1000, quality: 0.9 },
          'ean_png': { maxWidth: 400, maxHeight: 400, quality: 0.95 },
          'ean_svg': { maxWidth: 400, maxHeight: 400, quality: 0.95 },
          'default': { maxWidth: 800, maxHeight: 800, quality: 0.85 }
        };
        
        const settings = compressionSettings[imageType] || compressionSettings.default;
        
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > settings.maxWidth || height > settings.maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = settings.maxWidth;
            height = width / aspectRatio;
          } else {
            height = settings.maxHeight;
            width = height * aspectRatio;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // High-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to WebP for better compression (50% smaller than JPEG)
        canvas.toBlob(resolve, 'image/webp', settings.quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleB2bImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Bilden är för stor. Maximal storlek är ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Create a preview URL for the selected image
    const previewURL = URL.createObjectURL(file);
    setB2bImagePreview(previewURL);
    setB2bImageFile(file);
  };

  const handleB2cImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Bilden är för stor. Maximal storlek är ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Create a preview URL for the selected image
    const previewURL = URL.createObjectURL(file);
    setB2cImagePreview(previewURL);
    setB2cImageFile(file);
  };

  const handleB2cGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_IMAGE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length} filer är för stora. Maximal storlek är ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Create preview URLs for the selected images
    const previewURLs = files.map(file => URL.createObjectURL(file));
    setB2cGalleryPreviews(prev => [...prev, ...previewURLs]);
    setB2cGalleryFiles(prev => [...prev, ...files]);
  };

  const removeB2cGalleryImage = (index) => {
    setB2cGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    setB2cGalleryFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Remove existing image from gallery
  const removeExistingB2cImage = (index) => {
    const imageUrl = existingB2cGallery[index];
    
    // Add to deletion list
    setImagesToDelete(prev => [...prev, imageUrl]);
    
    // Remove from existing gallery
    setExistingB2cGallery(prev => prev.filter((_, i) => i !== index));
  };

  // Handle reordering of existing B2C gallery images
  const handleExistingB2cGalleryReorder = (reorderedImages) => {
    const reorderedUrls = reorderedImages.map(img => img.url);
    setExistingB2cGallery(reorderedUrls);
  };

  // Handle reordering of new B2C gallery images
  const handleNewB2cGalleryReorder = (reorderedImages) => {
    const reorderedPreviews = reorderedImages.map(img => img.url);
    const reorderedFiles = reorderedImages.map(img => img.file);
    setB2cGalleryPreviews(reorderedPreviews);
    setB2cGalleryFiles(reorderedFiles);
  };

  // Delete image from Firebase Storage
  const deleteImageFromStorage = async (imageUrl) => {
    try {
      // Extract the storage path from the URL
      const url = new URL(imageUrl);
      const pathStart = url.pathname.indexOf('/o/') + 3;
      const pathEnd = url.pathname.indexOf('?');
      const storagePath = decodeURIComponent(url.pathname.substring(pathStart, pathEnd));
      
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      console.log(`✅ Deleted image from storage: ${storagePath}`);
    } catch (error) {
      console.error('❌ Error deleting image from storage:', error);
      // Don't throw error - continue with form submission even if storage deletion fails
    }
  };

  const handleEanPngChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
      toast.error('Endast PNG och JPG-filer tillåtna för EAN-kod');
      return;
    }
    
    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Bilden är för stor. Maximal storlek är ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Create a preview URL for the selected image
    const previewURL = URL.createObjectURL(file);
    setEanPngPreview(previewURL);
    setEanPngFile(file);
  };

  const handleEanSvgChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.match(/image\/svg\+xml/)) {
      toast.error('Endast SVG-filer tillåtna för EAN-kod');
      return;
    }
    
    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Filen är för stor. Maximal storlek är ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Create a preview URL for the selected image
    const previewURL = URL.createObjectURL(file);
    setEanSvgPreview(previewURL);
    setEanSvgFile(file);
  };

  const handleB2cMoreInfoChange = (content) => {
    setFormData({
      ...formData,
      descriptions: {
        ...formData.descriptions,
        b2cMoreInfo: content
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || formData.basePrice <= 0) {
      toast.error('Vänligen fyll i alla obligatoriska fält');
      return;
    }
    
    try {
      setLoading(true);
      setUploading(true);
      
      let finalProductData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      
      // Generate product ID for new products (for storage path)
      const productId = selectedProduct ? selectedProduct.id : `prod_${Date.now()}`;
      
      // Upload images to Firebase Storage if new files are selected
      if (b2bImageFile) {
        console.log('📤 Uploading B2B image...');
        const b2bImageUrl = await uploadImageToStorage(b2bImageFile, productId, 'b2b');
        finalProductData.b2bImageUrl = b2bImageUrl;
      }
      
      if (eanPngFile) {
        console.log('📤 Uploading EAN PNG image...');
        const eanPngUrl = await uploadImageToStorage(eanPngFile, productId, 'ean_png');
        finalProductData.eanImagePngUrl = eanPngUrl;
      }
      
      if (eanSvgFile) {
        console.log('📤 Uploading EAN SVG image...');
        const eanSvgUrl = await uploadImageToStorage(eanSvgFile, productId, 'ean_svg');
        finalProductData.eanImageSvgUrl = eanSvgUrl;
      }
      
      if (b2cImageFile) {
        console.log('📤 Uploading B2C image...');
        const b2cImageUrl = await uploadImageToStorage(b2cImageFile, productId, 'b2c_main');
        finalProductData.b2cImageUrl = b2cImageUrl;
      }
      
      // Handle B2C gallery images (existing + new)
      // Use the reordered existing gallery from drag-and-drop
      let updatedGallery = [...existingB2cGallery]; // Start with reordered existing images
      
      // Upload new B2C gallery images and add them to the end
      if (b2cGalleryFiles.length > 0) {
        console.log(`📤 Uploading ${b2cGalleryFiles.length} new B2C gallery images...`);
        
        for (let i = 0; i < b2cGalleryFiles.length; i++) {
          const file = b2cGalleryFiles[i];
          const galleryUrl = await uploadImageToStorage(file, productId, `b2c_gallery_${Date.now()}_${i}`);
          updatedGallery.push(galleryUrl);
        }
      }
      
      // Delete images marked for deletion from Firebase Storage
      if (imagesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${imagesToDelete.length} images from Firebase Storage...`);
        for (const imageUrl of imagesToDelete) {
          await deleteImageFromStorage(imageUrl);
        }
      }
      
      // Update the gallery in the product data with the reordered array
      finalProductData.b2cImageGallery = updatedGallery;
      
      // Ensure name is always a multilingual object
      finalProductData.name = typeof finalProductData.name === 'string' ? { 'sv-SE': finalProductData.name } : finalProductData.name;
      
      if (!selectedProduct) {
        // Adding new product
        finalProductData.createdAt = serverTimestamp();
        
        // Create product in named database
        try {
          const namedDbRef = await addDoc(collection(db, 'products'), finalProductData);
          console.log("Product added to named DB with ID:", namedDbRef.id);
          toast.success('Produkt tillagd framgångsrikt');
        } catch (error) {
          console.error("Error adding product to named DB:", error);
          toast.error('Misslyckades med att lägga till produkt i databasen');
          return;
        }
      } else {
        // Updating existing product
        try {
          const docRef = doc(db, 'products', selectedProduct.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            await updateDoc(docRef, finalProductData);
            console.log("Updated product in named DB");
          } else {
            await setDoc(docRef, {
              ...finalProductData,
              createdAt: serverTimestamp()
            });
            console.log("Created product in named DB with specific ID");
          }
          
          toast.success('Produkt uppdaterad framgångsrikt');
        } catch (error) {
          console.error("Error updating product in named DB:", error);
          toast.error('Misslyckades med att uppdatera produkt');
          return;
        }
      }
      
      // Save group content if it exists and has been modified
      if (formData.group && groupContent && Object.keys(groupContent).length > 0) {
        try {
          console.log('💾 Saving group content for:', formData.group);
          console.log('💾 Group content:', groupContent);
          console.log('💾 User state:', user);
          console.log('💾 User UID:', user?.uid);
          
          // Try to get user UID from context, fallback to Firebase Auth directly
          let userUid = user?.uid;
          if (!userUid) {
            console.log('💾 No user in context, checking Firebase Auth directly...');
            const currentUser = auth.currentUser;
            userUid = currentUser?.uid;
            console.log('💾 Firebase Auth currentUser:', currentUser);
            console.log('💾 Firebase Auth currentUser UID:', userUid);
          }
          
          if (userUid) {
            await saveProductGroupContent(formData.group, groupContent, userUid);
            console.log('✅ Group content saved successfully');
            toast.success('Gruppinnehåll sparat');
          } else {
            console.log('⚠️ No user found in context or Firebase Auth, skipping group content save');
            console.log('⚠️ Debug - isAdmin:', isAdmin);
            console.log('⚠️ Debug - user object:', user);
            console.log('⚠️ Debug - auth.currentUser:', auth.currentUser);
            toast.error('Kunde inte spara gruppinnehåll - ingen användare hittades');
          }
        } catch (error) {
          console.error('❌ Error saving group content:', error);
          toast.error('Kunde inte spara gruppinnehåll');
          // Don't fail the whole operation, just log the error
        }
      }

      // Refresh products list
      await fetchProducts();
      setIsAddingProduct(false);
      
      // Clear file states
      setB2bImageFile(null);
      setB2bImagePreview(null);
      setEanPngFile(null);
      setEanSvgFile(null);
      setB2cImageFile(null);
      setB2cImagePreview(null);
      setB2cGalleryFiles([]);
      setB2cGalleryPreviews([]);
      setExistingB2cGallery([]);
      setImagesToDelete([]);
      
      // Clear group content
      setGroupContent(null);
      
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('Misslyckades med att spara produkt: ' + err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    console.log('🗑️ Starting deletion process for product ID:', productId);
    
    if (!window.confirm('Är du säker på att du vill ta bort denna produkt? Denna åtgärd kan inte ångras.')) {
      console.log('❌ User cancelled deletion');
      return;
    }
    
    try {
      setLoading(true);
      let deletionSuccessful = false;
      
      console.log('🔄 Attempting to delete from named database (b8s-reseller-db)...');
      
      // Delete from named database (b8s-reseller-db)
      try {
        const docRef = doc(db, 'products', productId);
        console.log('📄 Document reference created:', docRef.path);
        
        await deleteDoc(docRef);
        console.log('✅ Product successfully deleted from named DB');
        deletionSuccessful = true;
      } catch (error) {
        console.error('❌ Error deleting product from named DB:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'not-found') {
          console.log('ℹ️ Product was not found in named DB (already deleted or never existed)');
          deletionSuccessful = true; // Consider this a success
        } else {
          toast.error('Kunde inte ta bort produkten från databasen: ' + error.message);
          setLoading(false);
          return;
        }
      }
      
      if (deletionSuccessful) {
        console.log('🔄 Updating local state...');
        // Update local state - remove the product from the list
        setProducts(prevProducts => {
          const newProducts = prevProducts.filter(product => product.id !== productId);
          console.log('📊 Products before deletion:', prevProducts.length);
          console.log('📊 Products after deletion:', newProducts.length);
          return newProducts;
        });
        toast.success('Produkten har tagits bort');
        console.log('✅ Deletion process completed successfully');
      } else {
        console.log('❌ Deletion was not successful');
      }
      
    } catch (err) {
      console.error('💥 Unexpected error during deletion:', err);
      toast.error('Kunde inte ta bort produkten: ' + (err.message || 'Okänt fel'));
    } finally {
      setLoading(false);
      console.log('🏁 Deletion process finished');
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-6">
          <p>Du har inte behörighet att komma åt denna sida.</p>
          <Link to="/" className="text-blue-600 hover:underline">Tillbaka till Dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Produkthantering</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Hantera produkter i systemet</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                to="/admin" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                Tillbaka till Admin
              </Link>
              <button 
                onClick={handleAddNewClick}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                Lägg till Ny Produkt
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900 border-l-4 border-red-400 dark:border-red-600 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !isAddingProduct ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : isAddingProduct ? (
          /* Product Form with Tabs */
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {selectedProduct ? 'Redigera Produkt' : 'Lägg till Ny Produkt'}
                </h2>
                
                {/* Current Language Indicator */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Redigerar på:</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    currentLanguage === 'sv-SE' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                    currentLanguage === 'en-GB' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                    'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'
                  }`}>
                    {currentLanguage === 'sv-SE' ? '🇸🇪 Svenska' :
                     currentLanguage === 'en-GB' ? '🇬🇧 English (UK)' :
                     '🇺🇸 English (US)'}
                  </span>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex space-x-8">
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'general'
                      ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Allmänt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('b2b')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'b2b'
                      ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  B2B (Återförsäljare)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('b2c')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'b2c'
                      ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  B2C (Konsument)
                </button>
                {/* Group Tab - Only show when editing and has group */}
                {selectedProduct && formData.group && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('group')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'group'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {t('group_tab_label', 'Gruppinnehåll')}
                  </button>
                )}
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {/* Tab Content */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Product Name */}
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Produktnamn *
                    </label>
                    <ContentLanguageIndicator 
                      contentField={formData.name}
                      label="Produktnamn"
                      className="mb-2"
                    />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={getContentValue(formData.name)}
                      onChange={e => setFormData({
                        ...formData,
                        name: setContentValue(formData.name, e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  {/* SKU */}
                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                      SKU (Artikelnummer) *
                    </label>
                    <input
                      type="text"
                      id="sku"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="t.ex. B8S-4-re, B8S-2-tr"
                      required
                    />
                  </div>
                  
                  {/* Size */}
                  <div>
                    <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                      Storlek
                    </label>
                    <input
                      type="text"
                      id="size"
                      name="size"
                      value={formData.size}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="t.ex. Liten, Medium, Stor eller specifika mått"
                    />
                  </div>
                  
                  {/* Color */}
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                      Färg
                    </label>
                    <select
                      id="color"
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Välj färg...</option>
                      <option value="Transparent">Transparent</option>
                      <option value="Röd">Röd</option>
                      <option value="Fluorescerande">Fluorescerande</option>
                      <option value="Glitter">Glitter</option>
                    </select>
                  </div>
                  
                  {/* Group with Autocomplete */}
                  <div className="sm:col-span-2 relative">
                    <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
                      Produktgrupp
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="group"
                        name="group"
                        value={groupInput}
                        onChange={handleGroupInputChange}
                        onFocus={handleGroupFocus}
                        onBlur={handleGroupBlur}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="t.ex. B8Shield Individual, B8Shield 3-Pack, B8Shield Starter Kit"
                      />
                      
                      {/* Autocomplete Suggestions */}
                      {showGroupSuggestions && filteredGroups.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredGroups.map((group, index) => (
                            <div
                              key={index}
                              onClick={() => handleGroupSelect(group)}
                              className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-600 text-sm"
                            >
                              {group}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Skriv för att se befintliga grupper eller skapa en ny. Används för att gruppera produkter i butiken.
                    </p>
                  </div>
                  
                  {/* Base Price */}
                  <div>
                    <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-2">
                      Grundpris (SEK, exkl. moms) *
                    </label>
                    <input
                      type="number"
                      id="basePrice"
                      name="basePrice"
                      value={formData.basePrice}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  {/* Manufacturing Cost */}
                  <div>
                    <label htmlFor="manufacturingCost" className="block text-sm font-medium text-gray-700 mb-2">
                      Tillverkningskostnad (SEK)
                    </label>
                    <input
                      type="number"
                      id="manufacturingCost"
                      name="manufacturingCost"
                      value={formData.manufacturingCost}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  {/* Active Status */}
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                        Aktiv
                      </label>
                    </div>
                  </div>
                  
                  {/* Google Merchant Center Fields */}
                  <div className="sm:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Google Merchant Center Data</h3>
                    
                    {/* Weight */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vikt
                        </label>
                        <input
                          type="number"
                          value={formData.weight?.value || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            weight: {
                              ...formData.weight,
                              value: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.1"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enhet
                        </label>
                        <select
                          value={formData.weight?.unit || 'g'}
                          onChange={(e) => setFormData({
                            ...formData,
                            weight: {
                              ...formData.weight,
                              unit: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="g">gram (g)</option>
                          <option value="kg">kilogram (kg)</option>
                          <option value="oz">ounce (oz)</option>
                          <option value="lb">pound (lb)</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Dimensions */}
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-800 mb-3">Mått</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Length */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Längd
                          </label>
                          <input
                            type="number"
                            value={formData.dimensions?.length?.value || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              dimensions: {
                                ...formData.dimensions,
                                length: {
                                  ...formData.dimensions?.length,
                                  value: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.1"
                            placeholder="0"
                          />
                        </div>
                        
                        {/* Width */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bredd
                          </label>
                          <input
                            type="number"
                            value={formData.dimensions?.width?.value || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              dimensions: {
                                ...formData.dimensions,
                                width: {
                                  ...formData.dimensions?.width,
                                  value: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.1"
                            placeholder="0"
                          />
                        </div>
                        
                        {/* Height */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Höjd
                          </label>
                          <input
                            type="number"
                            value={formData.dimensions?.height?.value || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              dimensions: {
                                ...formData.dimensions,
                                height: {
                                  ...formData.dimensions?.height,
                                  value: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.1"
                            placeholder="0"
                          />
                        </div>
                        
                        {/* Unit */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enhet
                          </label>
                          <select
                            value={formData.dimensions?.length?.unit || 'mm'}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              setFormData({
                                ...formData,
                                dimensions: {
                                  length: { ...formData.dimensions?.length, unit: newUnit },
                                  width: { ...formData.dimensions?.width, unit: newUnit },
                                  height: { ...formData.dimensions?.height, unit: newUnit }
                                }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="mm">millimeter (mm)</option>
                            <option value="cm">centimeter (cm)</option>
                            <option value="in">tum (in)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Shipping Costs */}
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-800 mb-3">Fraktkostnader (SEK)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Sweden */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sverige
                          </label>
                          <input
                            type="number"
                            value={formData.shipping?.sweden?.cost || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              shipping: {
                                ...formData.shipping,
                                sweden: {
                                  ...formData.shipping?.sweden,
                                  cost: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                        
                        {/* Nordic */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Norden
                          </label>
                          <input
                            type="number"
                            value={formData.shipping?.nordic?.cost || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              shipping: {
                                ...formData.shipping,
                                nordic: {
                                  ...formData.shipping?.nordic,
                                  cost: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                        
                        {/* EU */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            EU
                          </label>
                          <input
                            type="number"
                            value={formData.shipping?.eu?.cost || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              shipping: {
                                ...formData.shipping,
                                eu: {
                                  ...formData.shipping?.eu,
                                  cost: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                        
                        {/* Worldwide */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Världen
                          </label>
                          <input
                            type="number"
                            value={formData.shipping?.worldwide?.cost || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              shipping: {
                                ...formData.shipping,
                                worldwide: {
                                  ...formData.shipping?.worldwide,
                                  cost: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Market Availability */}
                  <div className="sm:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Marknadstillgänglighet</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="b2bAvailable"
                            checked={formData.availability?.b2b || false}
                            onChange={(e) => setFormData({
                              ...formData,
                              availability: {
                                ...formData.availability,
                                b2b: e.target.checked
                              }
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="b2bAvailable" className="ml-2 block text-sm text-gray-700">
                            Tillgänglig för B2B (Återförsäljare)
                          </label>
                        </div>
                        
                        {formData.availability?.b2b && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Minsta orderkvantitet (B2B)
                            </label>
                            <input
                              type="number"
                              value={formData.availability?.b2bMinQuantity || 1}
                              onChange={(e) => setFormData({
                                ...formData,
                                availability: {
                                  ...formData.availability,
                                  b2bMinQuantity: parseInt(e.target.value) || 1
                                }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              min="1"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="b2cAvailable"
                            checked={formData.availability?.b2c || false}
                            onChange={(e) => setFormData({
                              ...formData,
                              availability: {
                                ...formData.availability,
                                b2c: e.target.checked
                              }
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="b2cAvailable" className="ml-2 block text-sm text-gray-700">
                            Tillgänglig för B2C (Konsumenter)
                          </label>
                        </div>
                        
                        {formData.availability?.b2c && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Max orderkvantitet (B2C)
                            </label>
                            <input
                              type="number"
                              value={formData.availability?.b2cMaxQuantity || 10}
                              onChange={(e) => setFormData({
                                ...formData,
                                availability: {
                                  ...formData.availability,
                                  b2cMaxQuantity: parseInt(e.target.value) || 10
                                }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              min="1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'b2b' && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* B2B Description */}
                  <div className="sm:col-span-2">
                    <ContentLanguageIndicator 
                      contentField={formData.descriptions?.b2b}
                      label="B2B Beskrivning (Teknisk information för återförsäljare)"
                    />
                    <textarea
                      value={getContentValue(formData.descriptions?.b2b)}
                      onChange={(e) => setFormData({
                        ...formData,
                        descriptions: {
                          ...formData.descriptions,
                          b2b: setContentValue(formData.descriptions?.b2b, e.target.value)
                        }
                      })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={currentLanguage === 'sv-SE' ? 
                        "Tekniska specifikationer, installationsanvisningar, etc." :
                        "Technical specifications, installation instructions, etc."
                      }
                    />
                  </div>
                  
                  {/* B2B Product Image */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      B2B Produktbild (Teknisk bild, Max 5MB)
                    </label>
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleB2bImageChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {b2bImagePreview && (
                        <div className="flex-shrink-0">
                          <img 
                            src={b2bImagePreview} 
                            alt="B2B Produktförhandsvisning" 
                            className="w-32 h-32 object-cover border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Tekniska bilder för återförsäljare (produktspecifikationer, förpackning, etc.)
                    </p>
                  </div>
                  
                  {/* EAN Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      EAN-kod
                    </label>
                    <input
                      type="text"
                      value={formData.eanCode || ''}
                      onChange={(e) => setFormData({ ...formData, eanCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="t.ex. 1234567890123"
                    />
                  </div>
                  
                  {/* EAN Code Image PNG/JPG */}
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      EAN-kod bild (PNG/JPG)
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleEanPngChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {eanPngPreview && (
                        <div className="flex-shrink-0">
                          <img 
                            src={eanPngPreview} 
                            alt="EAN-kod förhandsvisning" 
                            className="w-32 h-20 object-contain border border-gray-300 rounded-md bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EAN Code Image SVG */}
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      EAN-kod bild (SVG)
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/svg+xml"
                        onChange={handleEanSvgChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {eanSvgPreview && (
                        <div className="flex-shrink-0">
                          <img 
                            src={eanSvgPreview} 
                            alt="EAN-kod SVG förhandsvisning" 
                            className="w-32 h-20 object-contain border border-gray-300 rounded-md bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'b2c' && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* B2C Price */}
                  <div className="sm:col-span-2">
                    <label htmlFor="b2cPrice" className="block text-sm font-medium text-gray-700 mb-2">
                      B2C Pris (SEK, inkl. moms) *
                    </label>
                    <input
                      type="number"
                      id="b2cPrice"
                      name="b2cPrice"
                      value={formData.b2cPrice}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      min="0"
                      step="0.01"
                      placeholder="Konsumentpris inklusive moms"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Detta pris visas för konsumenter på shop.b8shield.com och inkluderar 25% moms
                    </p>
                  </div>
                  
                  {/* B2C Description */}
                  <div className="sm:col-span-2">
                    <ContentLanguageIndicator 
                      contentField={formData.descriptions?.b2c}
                      label="B2C Beskrivning (Konsumentvänlig beskrivning)"
                    />
                    <textarea
                      value={getContentValue(formData.descriptions?.b2c)}
                      onChange={(e) => setFormData({
                        ...formData,
                        descriptions: {
                          ...formData.descriptions,
                          b2c: setContentValue(formData.descriptions?.b2c, e.target.value)
                        }
                      })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder={currentLanguage === 'sv-SE' ? 
                        "Marknadsföringstext, fördelar för konsumenten, användningsområden..." :
                        "Marketing text, consumer benefits, use cases..."
                      }
                    />
                  </div>

                  {/* B2C More Info (WYSIWYG) */}
                  <div className="sm:col-span-2">
                    <ContentLanguageIndicator 
                      contentField={formData.descriptions?.b2cMoreInfo}
                      label="Mer Information (Detaljerad produktinformation)"
                      className="mb-2"
                    />
                    <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
                      <ReactQuill
                        value={getContentValue(formData.descriptions?.b2cMoreInfo)}
                        onChange={(content) => setFormData({
                          ...formData,
                          descriptions: {
                            ...formData.descriptions,
                            b2cMoreInfo: setContentValue(formData.descriptions?.b2cMoreInfo, content)
                          }
                        })}
                        modules={{
                          toolbar: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'color': [] }, { 'background': [] }],
                            ['link', 'image'],
                            ['clean']
                          ]
                        }}
                        theme="snow"
                        placeholder={currentLanguage === 'sv-SE' ? 
                          "Lägg till detaljerad produktinformation här..." :
                          "Add detailed product information here..."
                        }
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {currentLanguage === 'sv-SE' ? 
                        "Använd editorn för att lägga till detaljerad produktinformation, specifikationer, instruktioner, etc." :
                        "Use the editor to add detailed product information, specifications, instructions, etc."
                      }
                    </p>
                  </div>
                  
                  {/* B2C Main Image */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      B2C Huvudbild (Lifestyle/Marketing bild, Max 5MB)
                    </label>
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleB2cImageChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      />
                      {b2cImagePreview && (
                        <div className="flex-shrink-0">
                          <img 
                            src={b2cImagePreview} 
                            alt="B2C Produktförhandsvisning" 
                            className="w-32 h-32 object-cover border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Lifestyle-bilder för konsumenter (användning, miljö, action shots, etc.)
                    </p>
                  </div>
                  
                  {/* B2C Image Gallery */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      B2C Bildgalleri (Flera lifestyle-bilder, Max 5MB per bild)
                    </label>
                    <div className="space-y-4">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleB2cGalleryChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      />
                      
                      {/* Existing Images - Sortable */}
                      {existingB2cGallery.length > 0 && (
                        <SortableImageGallery
                          images={existingB2cGallery.map((url, index) => ({
                            id: `existing-${index}`,
                            url: url
                          }))}
                          onReorder={handleExistingB2cGalleryReorder}
                          onRemove={(id) => {
                            const index = parseInt(id.split('-')[1]);
                            removeExistingB2cImage(index);
                          }}
                          label="Befintliga bilder:"
                          itemLabel="Befintlig"
                          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4"
                        />
                      )}
                      
                      {/* New Images Preview - Sortable */}
                      {b2cGalleryPreviews.length > 0 && (
                        <SortableImageGallery
                          images={b2cGalleryPreviews.map((preview, index) => ({
                            id: `new-${index}`,
                            url: preview,
                            file: b2cGalleryFiles[index]
                          }))}
                          onReorder={handleNewB2cGalleryReorder}
                          onRemove={(id) => {
                            const index = parseInt(id.split('-')[1]);
                            removeB2cGalleryImage(index);
                          }}
                          label="Nya bilder att ladda upp:"
                          itemLabel="Ny"
                          className="grid grid-cols-2 md:grid-cols-4 gap-4"
                        />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Ytterligare bilder som visar produkten i användning, olika vinklar, etc.
                    </p>
                  </div>
                </div>
              )}

              {/* Group Tab */}
              {activeTab === 'group' && (
                <div className="space-y-6">
                  <ProductGroupTab 
                    productGroup={formData.group}
                    onContentChange={(field, value) => {
                      console.log('Group content changed:', field, value);
                    }}
                    onGroupContentUpdate={(content) => {
                      console.log('📝 Group content updated:', content);
                      setGroupContent(content);
                    }}
                  />
                </div>
              )}

              {/* Form Actions */}
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="flex items-center">
                      <span className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></span>
                      Laddar upp bilder...
                    </span>
                  ) : loading ? (
                    <span className="flex items-center">
                      <span className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></span>
                      Sparar...
                    </span>
                  ) : (
                    'Spara Produkt'
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Product List */
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Produktlista</h2>
                <div className="w-full sm:w-64">
                  <ProductMenu 
                    products={products} 
                    selectedProduct={filteredProduct} 
                    onProductSelect={(product) => setFilteredProduct(product)} 
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Produkt & Detaljer
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pris & Status
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      EAN & Bilder
                    </th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 md:px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Inga produkter hittades
                      </td>
                    </tr>
                  ) : (
                    (filteredProduct ? [filteredProduct] : products).map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        {/* Column 1: Product & Details */}
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-start">
                            {(product.imageUrl || product.b2bImageUrl || product.b2cImageUrl) ? (
                              <img 
                                src={product.imageUrl || product.b2bImageUrl || product.b2cImageUrl} 
                                alt={getContentValue(product.name)} 
                                className="w-16 h-16 mr-4 object-cover rounded-md border border-gray-200 dark:border-gray-600 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 mr-4 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-600 flex-shrink-0">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Ingen bild</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{getContentValue(product.name)}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">SKU: <span className="font-mono">{product.sku || 'Ej angivet'}</span></div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {product.size && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300" style={{fontSize: '10px'}}>
                                    {product.size}
                                  </span>
                                )}
                                {product.color && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300" style={{fontSize: '10px'}}>
                                    {product.color}
                                  </span>
                                )}
                                {product.group && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300" style={{fontSize: '10px'}}>
                                    {product.group}
                                  </span>
                                )}
                              </div>
                              {/* Translation status indicators */}
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400" style={{fontSize: '10px'}}>{t('översättningar_label', 'Översättningar:')}</span>
                                {/* B2B Status */}
                                {(() => {
                                  const b2bDescription = product.descriptions?.b2b;
                                  let completedLanguages = 0;
                                  
                                  if (typeof b2bDescription === 'string') {
                                    completedLanguages = b2bDescription.length > 0 ? 1 : 0;
                                  } else if (typeof b2bDescription === 'object' && b2bDescription) {
                                    completedLanguages = ['sv-SE', 'en-GB', 'en-US'].filter(lang => 
                                      b2bDescription[lang] && b2bDescription[lang].length > 0
                                    ).length;
                                  }
                                  
                                  const statusColor = completedLanguages === 3 ? 'bg-green-500' :
                                                     completedLanguages >= 2 ? 'bg-blue-500' :
                                                     completedLanguages >= 1 ? 'bg-yellow-500' :
                                                     'bg-gray-300';
                                  
                                  return (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-600 dark:text-gray-400 font-medium" style={{fontSize: '10px'}}>{t('b2b_label', 'B2B')}</span>
                                      <div className={`w-2 h-2 rounded-full ${statusColor}`} title={t('b2b_translation_status', 'B2B: {{count}}/3 språk', {count: completedLanguages})}></div>
                                    </div>
                                  );
                                })()}
                                
                                {/* B2C Status */}
                                {(() => {
                                  const b2cDescription = product.descriptions?.b2c;
                                  let completedLanguages = 0;
                                  
                                  if (typeof b2cDescription === 'string') {
                                    completedLanguages = b2cDescription.length > 0 ? 1 : 0;
                                  } else if (typeof b2cDescription === 'object' && b2cDescription) {
                                    completedLanguages = ['sv-SE', 'en-GB', 'en-US'].filter(lang => 
                                      b2cDescription[lang] && b2cDescription[lang].length > 0
                                    ).length;
                                  }
                                  
                                  const statusColor = completedLanguages === 3 ? 'bg-green-500' :
                                                     completedLanguages >= 2 ? 'bg-blue-500' :
                                                     completedLanguages >= 1 ? 'bg-yellow-500' :
                                                     'bg-gray-300';
                                  
                                  return (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-600 dark:text-gray-400 font-medium" style={{fontSize: '10px'}}>{t('b2c_label', 'B2C')}</span>
                                      <div className={`w-2 h-2 rounded-full ${statusColor}`} title={t('b2c_translation_status', 'B2C: {{count}}/3 språk', {count: completedLanguages})}></div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Price & Status */}
                        <td className="px-4 md:px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                              {product.basePrice?.toFixed(2)} SEK
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Kostnad: {product.manufacturingCost?.toFixed(2)} SEK
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              product.isActive 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' 
                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                            }`}>
                              {product.isActive ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </div>
                        </td>

                        {/* Column 3: EAN & Images */}
                        <td className="px-4 md:px-6 py-4">
                          <div className="text-sm">
                            {product.eanCode ? (
                              <div className="font-mono text-xs text-gray-900 dark:text-gray-100 mb-1">{product.eanCode}</div>
                            ) : (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ingen EAN-kod</div>
                            )}
                            {(product.eanImagePngUrl || product.eanImageSvgUrl) && (
                              <div className="flex gap-1 mt-1">
                                {product.eanImagePngUrl && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                    PNG
                                  </span>
                                )}
                                {product.eanImageSvgUrl && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                    SVG
                                  </span>
                                )}
                              </div>
                            )}
                            {/* B2B/B2C Availability indicators */}
                            <div className="flex gap-1 mt-2">
                              {product.availability?.b2b && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                                  B2B
                                </span>
                              )}
                              {product.availability?.b2c && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                                  B2C
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 4: Actions */}
                        <td className="px-4 md:px-6 py-4 text-right">
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => handleEditClick(product)} 
                              disabled={loading}
                              className="min-h-[32px] inline-flex items-center px-4 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Redigera
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product.id)} 
                              disabled={loading}
                              className="min-h-[32px] inline-flex items-center px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 border border-red-300 dark:border-red-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? 'Tar bort...' : 'Ta bort'}
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
        )}
      </div>
    </AppLayout>
  );
}

export default AdminProducts; 