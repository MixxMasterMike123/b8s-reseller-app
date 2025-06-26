import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ProductMenu from '../../components/ProductMenu';

// Maximum size for Base64 images (1MB)
const MAX_IMAGE_SIZE = 1 * 1024 * 1024; 

// Flag to disable default database operations
const USE_DEFAULT_DB = false;

function AdminProducts() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [eanPngFile, setEanPngFile] = useState(null);
  const [eanPngPreview, setEanPngPreview] = useState(null);
  const [eanSvgFile, setEanSvgFile] = useState(null);
  const [eanSvgPreview, setEanSvgPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    manufacturingCost: 0,
    isActive: true,
    size: '',
    imageData: '', // We'll store the base64 image data here
  });
  const [filteredProduct, setFilteredProduct] = useState(null);

  // Load products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log('📥 Fetching products from named database: b8s-reseller-db');
        
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = [];

        querySnapshot.forEach((doc) => {
          console.log('📄 Found product:', doc.id, doc.data().name);
          productsData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Sort products by name (default sorting)
        productsData.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        console.log('📊 Total products fetched:', productsData.length);
        setProducts(productsData);
      } catch (err) {
        console.error('❌ Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddNewClick = () => {
    setSelectedProduct(null);
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      manufacturingCost: 0,
      isActive: true,
      size: '',
      imageData: '',
      eanCode: '',
      eanImagePng: '',
      eanImageSvg: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setEanPngFile(null);
    setEanPngPreview(null);
    setEanSvgFile(null);
    setEanSvgPreview(null);
    setIsAddingProduct(true);
  };

  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      basePrice: product.basePrice || 0,
      manufacturingCost: product.manufacturingCost || 0,
      isActive: product.isActive !== false,
      size: product.size || '',
      imageData: product.imageData || '',
      eanCode: product.eanCode || '',
      eanImagePng: product.eanImagePng || '',
      eanImageSvg: product.eanImageSvg || '',
    });
    setImageFile(null);
    setImagePreview(product.imageData || null);
    setEanPngFile(null);
    setEanPngPreview(product.eanImagePng || null);
    setEanSvgFile(null);
    setEanSvgPreview(product.eanImageSvg || null);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Bilden är för stor. Maximal storlek är ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Create a preview URL for the selected image
    const previewURL = URL.createObjectURL(file);
    setImagePreview(previewURL);
    setImageFile(file);
    
    // Read the file as base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, imageData: reader.result });
    };
    reader.onerror = () => {
      toast.error('Kunde inte läsa bildfilen');
    };
    reader.readAsDataURL(file);
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
    
    // Read the file as base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, eanImagePng: reader.result });
    };
    reader.onerror = () => {
      toast.error('Kunde inte läsa EAN-bildfilen');
    };
    reader.readAsDataURL(file);
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
    
    // Read the file as base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, eanImageSvg: reader.result });
    };
    reader.onerror = () => {
      toast.error('Kunde inte läsa EAN SVG-filen');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || formData.basePrice <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      const finalProductData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      
      if (!selectedProduct) {
        // Adding new product
        finalProductData.createdAt = serverTimestamp();
        
        // Create product in named database
        let namedDbRef;
        try {
          // Use addDoc instead of setDoc with auto-generated ID
          namedDbRef = await addDoc(collection(db, 'products'), finalProductData);
          console.log("Product added to named DB with ID:", namedDbRef.id);
          
          // Show success message for primary DB
          toast.success('Product added successfully');
          

        } catch (error) {
          console.error("Error adding product to named DB:", error);
          toast.error('Failed to add product to database');
          setLoading(false);
          return;
        }
      } else {
        // Updating existing product
        try {
          // First check if the product exists in named database
          const docRef = doc(db, 'products', selectedProduct.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // Update the existing document
            await updateDoc(docRef, finalProductData);
            console.log("Updated product in named DB");
          } else {
            // Create document with the specific ID if it doesn't exist
            await setDoc(docRef, {
              ...finalProductData,
              createdAt: serverTimestamp()
            });
            console.log("Created product in named DB with specific ID");
          }
          
          // Show success message for primary DB
          toast.success('Product updated successfully');
          

        } catch (error) {
          console.error("Error updating product in named DB:", error);
          toast.error('Failed to update product');
          setLoading(false);
          return;
        }
      }
      
      // Refresh products list
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = [];
      
      querySnapshot.forEach((doc) => {
        productsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort products by name (default sorting)
      productsData.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setProducts(productsData);
      setIsAddingProduct(false);
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('Failed to save product');
    } finally {
      setLoading(false);
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
      <div className="p-6">
        <p>Du har inte behörighet att komma åt denna sida.</p>
        <Link to="/" className="text-blue-600 hover:underline">Tillbaka till Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produkthantering</h1>
            <p className="mt-1 text-sm text-gray-600">Hantera produkter i systemet</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link 
              to="/admin" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Tillbaka till Admin
            </Link>
            <button 
              onClick={() => {
                setSelectedProduct(null);
                setFormData({
                  name: 'B8Shield Röd',
                  description: 'B8Shield Röd skydd för smartphones',
                  basePrice: 71.2,
                  manufacturingCost: 10,
                  isActive: true,
                  size: '',
                  imageData: '',
                });
                setImageFile(null);
                setImagePreview(null);
                setIsAddingProduct(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Lägg till Röd Produkt
            </button>
            <button 
              onClick={handleAddNewClick}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Lägg till Ny Produkt
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !isAddingProduct ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : isAddingProduct ? (
        /* Product Form */
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {selectedProduct ? 'Redigera Produkt' : 'Lägg till Ny Produkt'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Produktnamn *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              
              {/* Product Image */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produktbild (Max 1MB)
                </label>
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {imagePreview && (
                    <div className="flex-shrink-0">
                      <img 
                        src={imagePreview} 
                        alt="Produktförhandsvisning" 
                        className="w-32 h-32 object-cover border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Observera: Bilder lagras som Base64-data direkt i databasen. 
                  Håll bilderna små (under 1MB) för bättre prestanda.
                </p>
              </div>
              
                             {/* Description */}
               <div className="sm:col-span-2">
                 <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                   Beskrivning
                 </label>
                 <textarea
                   id="description"
                   name="description"
                   value={formData.description}
                   onChange={handleInputChange}
                   rows="3"
                   className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                 ></textarea>
               </div>

               {/* EAN Code */}
               <div className="sm:col-span-2">
                 <label htmlFor="eanCode" className="block text-sm font-medium text-gray-700 mb-2">
                   EAN-kod
                 </label>
                 <input
                   type="text"
                   id="eanCode"
                   name="eanCode"
                   value={formData.eanCode}
                   onChange={handleInputChange}
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
                disabled={loading}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-medium text-gray-900">Produktlista</h2>
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produkt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storlek
                  </th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Pris
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     EAN-kod
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Status
                   </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                                 {products.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                       Inga produkter hittades
                     </td>
                   </tr>
                ) : (
                  (filteredProduct ? [filteredProduct] : products).map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.imageData ? (
                            <img 
                              src={product.imageData} 
                              alt={product.name} 
                              className="w-12 h-12 mr-4 object-cover rounded-md border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 mr-4 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200">
                              <span className="text-xs text-gray-500">Ingen bild</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.size || 'Ej angivet'}</div>
                      </td>
                                             <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-gray-900">{product.basePrice?.toFixed(2)} SEK</div>
                         <div className="text-sm text-gray-500">Kostnad: {product.manufacturingCost?.toFixed(2)} SEK</div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-gray-900">{product.eanCode || 'Ej angivet'}</div>
                         {(product.eanImagePng || product.eanImageSvg) && (
                           <div className="text-xs text-gray-500 mt-1">
                             {product.eanImagePng && 'PNG '}
                             {product.eanImageSvg && 'SVG'}
                           </div>
                         )}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleEditClick(product)} 
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-900 mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Redigera
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)} 
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Tar bort...' : 'Ta bort'}
                        </button>
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
  );
}

export default AdminProducts; 