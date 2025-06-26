import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, defaultDb } from '../../firebase/config';
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    manufacturingCost: 0,
    defaultMargin: 35,
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
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = [];

        querySnapshot.forEach((doc) => {
          productsData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        setProducts(productsData);
      } catch (err) {
        console.error('Error fetching products:', err);
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
      defaultMargin: 35,
      isActive: true,
      size: '',
      imageData: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setIsAddingProduct(true);
  };

  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      basePrice: product.basePrice || 0,
      manufacturingCost: product.manufacturingCost || 0,
      defaultMargin: product.defaultMargin || 35,
      isActive: product.isActive !== false,
      variants: product.variants || [],
      size: product.size || '',
      imageData: product.imageData || '',
    });
    setImageFile(null);
    setImagePreview(product.imageData || null);
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
      toast.error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
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
      toast.error('Failed to read image file');
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
          
          // Only attempt to add to default DB if flag is enabled
          if (USE_DEFAULT_DB && namedDbRef) {
            try {
              // Use the same ID for consistency
              await setDoc(doc(defaultDb, 'products', namedDbRef.id), finalProductData);
              console.log("Product added to default DB");
            } catch (error) {
              console.log("Skipping default DB update due to permissions");
            }
          }
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
          
          // Only attempt to update default DB if flag is enabled
          if (USE_DEFAULT_DB) {
            try {
              const defaultDocRef = doc(defaultDb, 'products', selectedProduct.id);
              const defaultDocSnap = await getDoc(defaultDocRef);
              
              if (defaultDocSnap.exists()) {
                await updateDoc(defaultDocRef, finalProductData);
                console.log("Updated product in default DB");
              } else {
                await setDoc(defaultDocRef, {
                  ...finalProductData,
                  createdAt: serverTimestamp()
                });
                console.log("Created product in default DB with specific ID");
              }
            } catch (error) {
              console.log("Skipping default DB update due to permissions");
            }
          }
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
    if (!window.confirm('Är du säker på att du vill ta bort denna produkt? Denna åtgärd kan inte ångras.')) {
      return;
    }
    
    try {
      setLoading(true);
      let deletionSuccessful = false;
      
      // Delete from named database
      try {
        const docRef = doc(db, 'products', productId);
        await deleteDoc(docRef);
        console.log("Product deleted from named DB");
        deletionSuccessful = true;
      } catch (error) {
        console.error("Error deleting product from named DB:", error);
        // Only show error if it's not a "document not found" error
        if (error.code !== 'not-found') {
          toast.error('Kunde inte ta bort produkten från databasen');
          setLoading(false);
          return;
        } else {
          console.log("Product was already deleted from named DB");
          deletionSuccessful = true;
        }
      }
      
      // Only attempt to delete from default DB if flag is enabled
      if (USE_DEFAULT_DB) {
        try {
          const defaultDocRef = doc(defaultDb, 'products', productId);
          await deleteDoc(defaultDocRef);
          console.log("Product deleted from default DB");
        } catch (error) {
          console.log("Skipping default DB delete due to permissions or document not found:", error.code);
        }
      }
      
      if (deletionSuccessful) {
        // Update local state - remove the product from the list
        setProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
        toast.success('Produkten har tagits bort');
      }
      
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error('Kunde inte ta bort produkten: ' + (err.message || 'Okänt fel'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p>You don't have permission to access this page.</p>
        <Link to="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <div className="flex gap-4">
          <Link to="/admin" className="px-4 py-2 bg-gray-600 text-white rounded">
            Back to Admin
          </Link>
          <button 
            onClick={() => {
              // Pre-fill form with Red product data
              setSelectedProduct(null);
              setFormData({
                name: 'B8Shield Röd',
                description: 'B8Shield Red protection for smartphones',
                basePrice: 71.2,
                manufacturingCost: 10,
                defaultMargin: 35,
                isActive: true,
                size: '',
                imageData: '',
              });
              setImageFile(null);
              setImagePreview(null);
              setIsAddingProduct(true);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded mr-2"
          >
            Add Red Product
          </button>
          <button 
            onClick={handleAddNewClick}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Add New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {loading && !isAddingProduct ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : isAddingProduct ? (
        <div className="bg-white shadow-md rounded p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2">Product Name*</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-2">Size</label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. Small, Medium, Large or specific dimensions"
                />
              </div>
              
              <div>
                <label className="block mb-2">Base Price (SEK, excluding VAT)*</label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-2">Manufacturing Cost (SEK)</label>
                <input
                  type="number"
                  name="manufacturingCost"
                  value={formData.manufacturingCost}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block mb-2">Default Margin (%)</label>
                <input
                  type="number"
                  name="defaultMargin"
                  value={formData.defaultMargin}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  min="0"
                  max="100"
                />
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>
              
              <div className="md:col-span-2">
                <label className="block mb-2">Product Image (Max 1MB)</label>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="border p-2 rounded"
                  />
                  {imagePreview && (
                    <div className="mt-2 md:mt-0">
                      <img 
                        src={imagePreview} 
                        alt="Product preview" 
                        className="w-40 h-40 object-cover border rounded"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Images are stored as Base64 data directly in the database.
                  Keep images small (under 1MB) for better performance.
                </p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-4">
              <button
                type="button"
                onClick={() => setIsAddingProduct(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></span>
                    Saving...
                  </span>
                ) : (
                  'Save Product'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-medium">Product Listing</h2>
              <div className="w-full sm:w-64">
                <ProductMenu 
                  products={products} 
                  selectedProduct={filteredProduct} 
                  onProductSelect={(product) => setFilteredProduct(product)} 
                />
              </div>
            </div>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                (filteredProduct ? [filteredProduct] : products).map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {product.imageData ? (
                          <img 
                            src={product.imageData} 
                            alt={product.name} 
                            className="w-10 h-10 mr-3 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 mr-3 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                            No img
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.size || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.basePrice?.toFixed(2)} SEK</div>
                      <div className="text-sm text-gray-500">Cost: {product.manufacturingCost?.toFixed(2)} SEK</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.defaultMargin}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEditClick(product)} 
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        disabled={loading}
                      >
                        Redigera
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)} 
                        className="text-red-600 hover:text-red-900"
                        disabled={loading}
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
      )}
    </div>
  );
}

export default AdminProducts; 