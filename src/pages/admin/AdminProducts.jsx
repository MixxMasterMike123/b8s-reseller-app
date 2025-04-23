import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, defaultDb } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

function AdminProducts() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    manufacturingCost: 0,
    defaultMargin: 35,
    isActive: true,
    size: '',
  });

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
    });
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
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || formData.basePrice <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      const productData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      
      if (!selectedProduct) {
        // Adding new product
        productData.createdAt = serverTimestamp();
        
        // Create product in named database
        let namedDbRef;
        try {
          // Use addDoc instead of setDoc with auto-generated ID
          namedDbRef = await addDoc(collection(db, 'products'), productData);
          console.log("Product added to named DB with ID:", namedDbRef.id);
        } catch (error) {
          console.error("Error adding product to named DB:", error);
          toast.error('Failed to add product to primary database');
          setLoading(false);
          return;
        }
        
        // Create product in default database
        try {
          if (namedDbRef) {
            // Use the same ID for consistency
            await setDoc(doc(defaultDb, 'products', namedDbRef.id), productData);
          } else {
            await addDoc(collection(defaultDb, 'products'), productData);
          }
        } catch (error) {
          console.error("Error adding product to default DB:", error);
          // Continue with the app flow - show warning instead of error
          toast.warning('Product added to primary database only. Some features may be limited.');
        }
        
        toast.success('Product added successfully');
      } else {
        // Updating existing product
        // First check if the product exists in named database
        try {
          const docRef = doc(db, 'products', selectedProduct.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // Update the existing document
            await updateDoc(docRef, productData);
            console.log("Updated product in named DB");
          } else {
            // Create document with the specific ID if it doesn't exist
            await setDoc(docRef, {
              ...productData,
              createdAt: serverTimestamp()
            });
            console.log("Created product in named DB with specific ID");
          }
        } catch (error) {
          console.error("Error updating product in named DB:", error);
          toast.error('Failed to update product in primary database');
          setLoading(false);
          return;
        }
        
        // Also handle default database
        try {
          const defaultDocRef = doc(defaultDb, 'products', selectedProduct.id);
          const defaultDocSnap = await getDoc(defaultDocRef);
          
          if (defaultDocSnap.exists()) {
            await updateDoc(defaultDocRef, productData);
            console.log("Updated product in default DB");
          } else {
            await setDoc(defaultDocRef, {
              ...productData,
              createdAt: serverTimestamp()
            });
            console.log("Created product in default DB with specific ID");
          }
        } catch (error) {
          console.error("Error updating product in default DB:", error);
          // Continue with app flow - show warning instead of error
          toast.warning('Product updated in primary database only. Some features may be limited.');
        }
        
        toast.success('Product updated successfully');
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
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete from named database
      try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await deleteDoc(docRef);
          console.log("Deleted product from named DB");
        }
      } catch (error) {
        console.error("Error deleting product from named DB:", error);
      }
      
      // Delete from default database
      try {
        const defaultDocRef = doc(defaultDb, 'products', productId);
        const defaultDocSnap = await getDoc(defaultDocRef);
        if (defaultDocSnap.exists()) {
          await deleteDoc(defaultDocRef);
          console.log("Deleted product from default DB");
        }
      } catch (error) {
        console.error("Error deleting product from default DB:", error);
      }
      
      toast.success('Product deleted successfully');
      
      // Update local state
      setProducts(products.filter(product => product.id !== productId));
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error('Failed to delete product');
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
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
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.description}</div>
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
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)} 
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
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