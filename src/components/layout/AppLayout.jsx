import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// 🚂 WAGON SYSTEM: Import wagon registry for menu items
import wagonRegistry from '../../wagons/WagonRegistry.js';

// Icons
import { 
  HomeIcon, 
  ShoppingCartIcon, 
  ShoppingBagIcon,
  UserIcon, 
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  PhoneIcon,
  CubeIcon,
  MegaphoneIcon,
  SparklesIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

const AppLayout = ({ children }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 🚂 WAGON SYSTEM: State for wagon menu items
  const [wagonMenuItems, setWagonMenuItems] = useState([]);
  
  const isAdmin = userProfile?.role === 'admin';

  // 🚂 WAGON SYSTEM: Load wagon menu items
  useEffect(() => {
    const loadWagonMenuItems = async () => {
      try {
        // Check if we have a current user for permission checking
        if (currentUser) {
          const menuItems = await wagonRegistry.getAdminMenuItems(currentUser.uid);
          setWagonMenuItems(menuItems);
          console.log(`🚂 AppLayout: Loaded ${menuItems.length} wagon menu items for user ${currentUser.uid}`);
        } else {
          // Fallback to sync version for non-authenticated users
          const menuItems = wagonRegistry.getAdminMenuItemsSync();
          setWagonMenuItems(menuItems);
          console.log(`🚂 AppLayout: Loaded ${menuItems.length} wagon menu items (no user permissions)`);
        }
      } catch (error) {
        console.error('Error loading wagon menu items:', error);
        // Fallback to sync version on error
        const menuItems = wagonRegistry.getAdminMenuItemsSync();
        setWagonMenuItems(menuItems);
      }
    };

    // Small delay to ensure wagons are discovered first
    const timer = setTimeout(loadWagonMenuItems, 100);
    return () => clearTimeout(timer);
  }, [currentUser]);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinks = [
    {
      name: 'Dashboard',
      path: '/',
      icon: HomeIcon,
    },
    {
      name: 'Produktkatalog',
      path: '/products',
      icon: CubeIcon,
    },
    {
      name: 'Marknadsföringsmaterial',
      path: '/marketing',
      icon: MegaphoneIcon,
    },
    {
      name: 'Lägg en beställning',
      path: '/order',
      icon: ShoppingCartIcon,
    },
    {
      name: 'Orderhistorik',
      path: '/orders',
      icon: ClipboardDocumentListIcon,
    },
    {
      name: 'Kontakt & Support',
      path: '/contact',
      icon: PhoneIcon,
    },
    {
      name: 'Profil',
      path: '/profile',
      icon: UserIcon,
    }
  ];
  
  const adminNavLinks = [
    {
      name: 'Admin Dashboard',
      path: '/admin',
      icon: ChartBarIcon,
      description: 'Översikt och statistik',
    },
    {
      name: 'Kunder',
      path: '/admin/users',
      icon: UsersIcon,
      description: 'Hantera användare',
    },
    {
      name: 'Ordrar',
      path: '/admin/orders',
      icon: ClipboardDocumentListIcon,
      description: 'Hantera beställningar',
    },
    {
      name: 'Produkter',
      path: '/admin/products',
      icon: CubeIcon,
      description: 'Hantera produkter',
    },
    {
      name: 'Marknadsföring',
      path: '/admin/marketing',
      icon: MegaphoneIcon,
      description: 'Hantera marknadsföringsmaterial',
    },
    {
      name: 'Affiliates',
      path: '/admin/affiliates',
      icon: UsersIcon,
      description: 'Hantera affiliate-partners',
    },
    {
      name: 'Inställningar',
      path: '/admin/settings',
      icon: Cog6ToothIcon,
      description: 'Systeminställningar',
    }
  ];
  
  // Function to check if current path is in admin section
  const isAdminSection = location.pathname.startsWith('/admin');
  
  // Function to get parent path for breadcrumb
  const getParentPath = (path) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return '/';
    return '/' + parts.slice(0, -1).join('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 bg-white shadow-sm">
          <div className="flex flex-shrink-0 items-center px-4 py-6">
            <Link to="/" className="flex items-center">
              <img
                src="/images/JPH_logo.webp" 
                alt="JPH Innovation AB Logo"
                className="h-10 w-auto"
              />
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="mt-5 flex flex-grow flex-col">
            <nav className="flex-1 space-y-1 px-2 pb-4">
              {/* Show either admin or regular nav based on current section */}
              {isAdminSection ? (
                <>
                  {/* Back to main dashboard for admin section */}
                  <Link
                    to="/"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900 mb-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Tillbaka till Dashboard
                  </Link>
                  
                  {/* Admin Navigation */}
                  {adminNavLinks.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive(item.path)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isActive(item.path) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </Link>
                  ))}

                  {/* 🚂 WAGON SYSTEM: Auto-generated wagon menu items */}
                  {wagonMenuItems.length > 0 && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-2 text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center">
                            <CpuChipIcon className="h-4 w-4 mr-1" />
                            AI Vagnar
                          </span>
                        </div>
                      </div>
                      
                      {wagonMenuItems.map((item) => (
                        <Link
                          key={`wagon-${item.wagonId}`}
                          to={item.path}
                          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                            isActive(item.path)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <SparklesIcon className="mr-3 h-5 w-5 flex-shrink-0 text-blue-500" />
                          <div>
                            <div>{item.title}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Regular Navigation */}
                  {navLinks.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive(item.path)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          isActive(item.path) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  ))}
                  
                  {/* Admin Section Link for admin users */}
                  {isAdmin && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">Admin</span>
                        </div>
                      </div>
                      
                      <Link
                        to="/admin"
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActive('/admin')
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ChartBarIcon
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            isActive('/admin') ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                          aria-hidden="true"
                        />
                        Gå till Admin Panel
                      </Link>
                    </>
                  )}
                </>
              )}
            </nav>
          </div>
          
          {/* User Profile Section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {userProfile?.companyName?.charAt(0)?.toUpperCase() || 
                   currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">
                  {userProfile?.companyName || currentUser?.email}
                </div>
                <div className="truncate text-sm text-gray-500">
                  {currentUser?.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-auto flex-shrink-0 bg-white p-1 text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile header */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow md:hidden">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1 items-center pl-3">
              <div className="flex w-full items-center">
                <Link to="/">
                  <img
                    src="/images/JPH_logo.webp" 
                    alt="JPH Innovation AB Logo"
                    className="h-8 w-auto"
                  />
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <button
                  onClick={handleLogout}
                  className="relative p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Logga ut</span>
                  <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-75" 
              aria-hidden="true"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              
              <div className="flex flex-shrink-0 items-center px-4">
                <Link to="/">
                  <img
                    src="/images/JPH_logo.webp" 
                    alt="JPH Innovation AB Logo"
                    className="h-8 w-auto"
                  />
                </Link>
              </div>
              <div className="mt-5 h-0 flex-1 overflow-y-auto">
                <nav className="space-y-1 px-2">
                  {navLinks.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive(item.path)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon
                        className={`mr-4 h-6 w-6 flex-shrink-0 ${
                          isActive(item.path) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  ))}
                  
                  {isAdmin && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">Admin</span>
                        </div>
                      </div>
                      
                      {adminNavLinks.map((item) => (
                        <Link
                          key={item.name}
                          to={item.path}
                          className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                            isActive(item.path)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <item.icon
                            className={`mr-4 h-6 w-6 flex-shrink-0 ${
                              isActive(item.path) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                            }`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      ))}
                    </>
                  )}
                </nav>
              </div>
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {userProfile?.companyName?.charAt(0)?.toUpperCase() || 
                       currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {userProfile?.companyName || currentUser?.email}
                    </div>
                    <div className="truncate text-sm text-gray-500">
                      {currentUser?.email}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        )}
        
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 