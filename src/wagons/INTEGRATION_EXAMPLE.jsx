// INTEGRATION_EXAMPLE.jsx - How to integrate wagon system with minimal core app changes
// This shows the ONLY changes needed in core B8Shield app

import React, { useEffect, useState } from 'react';
import wagonRegistry from './WagonRegistry.js';

/**
 * STEP 1: Initialize wagons in App.jsx
 * Add these 3 lines to your main App.jsx:
 */
function App() {
  useEffect(() => {
    // ONLY 1 LINE NEEDED: Auto-discover all wagons
    wagonRegistry.discoverWagons();
  }, []);

  // Rest of your existing App.jsx remains unchanged
  return (
    <div>
      {/* Your existing app content */}
    </div>
  );
}

/**
 * STEP 2: Add wagon routes to your router
 * In your main routing component, add this:
 */
function AppRoutes() {
  const [wagonRoutes, setWagonRoutes] = useState([]);

  useEffect(() => {
    // ONLY 2 LINES NEEDED: Get all wagon routes
    const routes = wagonRegistry.getRoutes();
    setWagonRoutes(routes);
  }, []);

  return (
    <Routes>
      {/* Your existing routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/products" element={<Products />} />
      
      {/* ONLY 1 BLOCK NEEDED: Auto-generated wagon routes */}
      {wagonRoutes.map(({ path, component: Component, adminOnly, private: isPrivate }) => (
        <Route 
          key={path} 
          path={path}
          element={
            isPrivate ? (
              adminOnly ? (
                <AdminRoute><Component /></AdminRoute>
              ) : (
                <PrivateRoute><Component /></PrivateRoute>
              )
            ) : (
              <Component />
            )
          }
        />
      ))}
    </Routes>
  );
}

/**
 * STEP 3: Add wagon menu items to admin navigation
 * In your AdminLayout.jsx or navigation component:
 */
function AdminNavigation() {
  const [wagonMenuItems, setWagonMenuItems] = useState([]);

  useEffect(() => {
    // ONLY 2 LINES NEEDED: Get all wagon menu items
    const menuItems = wagonRegistry.getAdminMenuItems();
    setWagonMenuItems(menuItems);
  }, []);

  return (
    <nav>
      {/* Your existing menu items */}
      <NavItem to="/admin/dashboard">Dashboard</NavItem>
      <NavItem to="/admin/products">Produkter</NavItem>
      <NavItem to="/admin/orders">Beställningar</NavItem>
      
      {/* ONLY 1 BLOCK NEEDED: Auto-generated wagon menu items */}
      {wagonMenuItems.map(({ title, path, icon, wagonId }) => (
        <NavItem key={wagonId} to={path} icon={icon}>
          {title}
        </NavItem>
      ))}
    </nav>
  );
}

/**
 * STEP 4: Add wagon integrations to existing pages (OPTIONAL)
 * In AdminProducts.jsx, add this to get AI generation buttons:
 */
function AdminProducts() {
  const [productIntegrations, setProductIntegrations] = useState([]);

  useEffect(() => {
    // ONLY 2 LINES NEEDED: Get integrations for this page
    const integrations = wagonRegistry.getIntegrationHooks('admin-product-edit');
    setProductIntegrations(integrations);
  }, []);

  const handleEditProduct = (product) => {
    // Your existing product editing logic
    console.log('Editing product:', product);
  };

  return (
    <div>
      <h1>Produkthantering</h1>
      
      {products.map(product => (
        <div key={product.id} className="product-row">
          <span>{product.name}</span>
          
          {/* Your existing buttons */}
          <button onClick={() => handleEditProduct(product)}>
            Redigera
          </button>
          
          {/* ONLY 1 BLOCK NEEDED: Auto-generated wagon integrations */}
          {productIntegrations.map(({ component: IntegrationComponent, wagonId }) => (
            <IntegrationComponent 
              key={wagonId}
              product={product}
              onContentGenerated={(content) => {
                // Handle AI-generated content
                console.log('AI content generated:', content);
                // You could auto-update the product description here
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * STEP 5: Access wagon services from anywhere (OPTIONAL)
 * Any component can use wagon services:
 */
function AnyComponent() {
  const generateAIContent = async (productData) => {
    // ONLY 2 LINES NEEDED: Use wagon service
    const writersWagonService = wagonRegistry.getWagonService('writers-wagon', 'generateContent');
    const result = await writersWagonService('dual-content', productData);
    
    console.log('Generated content:', result);
    return result;
  };

  return (
    <div>
      <button onClick={() => generateAIContent({ name: 'Test Product' })}>
        Generate AI Content
      </button>
    </div>
  );
}

/**
 * STEP 6: Check wagon status (OPTIONAL)
 * Health check and debugging:
 */
function WagonStatus() {
  const [wagonStats, setWagonStats] = useState(null);

  useEffect(() => {
    // ONLY 1 LINE NEEDED: Get wagon statistics
    setWagonStats(wagonRegistry.getStats());
  }, []);

  return (
    <div>
      <h3>Connected Wagons: {wagonStats?.total || 0}</h3>
      <p>AI Content: {wagonRegistry.hasWagon('writers-wagon') ? '✅' : '❌'}</p>
      <p>Analytics: {wagonRegistry.hasWagon('analytics-wagon') ? '✅' : '❌'}</p>
    </div>
  );
}

/**
 * SUMMARY: Total core app changes needed
 * 
 * Files to modify:
 * 1. App.jsx - Add 1 line: wagonRegistry.discoverWagons()
 * 2. Routes.jsx - Add 4 lines for wagon routes
 * 3. AdminNavigation.jsx - Add 4 lines for wagon menu items
 * 4. AdminProducts.jsx (optional) - Add 4 lines for integrations
 * 
 * To remove a wagon:
 * 1. Delete the wagon directory (e.g., /writers-wagon)
 * 2. That's it! No core app changes needed.
 * 
 * To disable a wagon:
 * 1. Set enabled: false in wagon manifest
 * 2. That's it! Wagon is automatically disconnected.
 */

export default {
  App,
  AppRoutes,
  AdminNavigation,
  AdminProducts,
  AnyComponent,
  WagonStatus
}; 