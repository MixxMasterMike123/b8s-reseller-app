import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MentionNotifications from '../../wagons/dining-wagon/components/MentionNotifications';
import LanguageSwitcher from '../LanguageSwitcher';
import DarkModeToggle from '../DarkModeToggle';
import { useTranslation } from '../../contexts/TranslationContext';
import ImpersonationBanner from '../auth/ImpersonationBanner';

// 🚂 WAGON SYSTEM: Import wagon registry for menu items
import wagonRegistry from '../../wagons/WagonRegistry.js';

// Icons
import {
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  CubeIcon,
  MegaphoneIcon,
  SparklesIcon,
  CpuChipIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

const AppLayout = ({ children }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 🚂 WAGON SYSTEM: State for admin wagon menu items
  const [wagonMenuItems, setWagonMenuItems] = useState([]);

  const isAdmin = userProfile?.role === 'admin';

  // 🚂 WAGON SYSTEM: Load admin wagon menu items
  useEffect(() => {
    const loadWagonMenuItems = async () => {
      try {
        // Load admin menu items
        if (currentUser) {
          const adminMenuItems = await wagonRegistry.getAdminMenuItems(currentUser.uid);
          setWagonMenuItems(adminMenuItems);
          console.log(`🚂 AppLayout: Loaded ${adminMenuItems.length} admin wagon menu items for user ${currentUser.uid}`);
        } else {
          // Fallback to sync version for non-authenticated users
          const adminMenuItems = wagonRegistry.getAdminMenuItemsSync();
          setWagonMenuItems(adminMenuItems);
          console.log(`🚂 AppLayout: Loaded ${adminMenuItems.length} admin wagon menu items (no user permissions)`);
        }
      } catch (error) {
        console.error('Error loading wagon menu items:', error);
        // Fallback to sync version on error
        const adminMenuItems = wagonRegistry.getAdminMenuItemsSync();
        setWagonMenuItems(adminMenuItems);
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

  const adminNavLinks = [
    {
      name: t('nav.admin_dashboard', 'Admin Dashboard'),
      path: '/admin',
      icon: ChartBarIcon,
      description: t('nav.admin_dashboard_desc', 'Översikt och statistik'),
    },
    {
      name: t('nav.admin_customers', 'B2B Kunder och Admins'),
      path: '/admin/users',
      icon: UsersIcon,
      description: t('nav.admin_customers_desc', 'Hantera B2B-kunder och administratörer'),
    },
    {
      name: t('nav.admin_b2c_customers', 'B2C Kunder'),
      path: '/admin/b2c-customers',
      icon: UsersIcon,
      description: t('nav.admin_b2c_customers_desc', 'Hantera konsumentkunder'),
    },
    {
      name: t('nav.admin_orders', 'Ordrar'),
      path: '/admin/orders',
      icon: ClipboardDocumentListIcon,
      description: t('nav.admin_orders_desc', 'Hantera beställningar'),
    },
    {
      name: t('nav.admin_products', 'Produkter'),
      path: '/admin/products',
      icon: CubeIcon,
      description: t('nav.admin_products_desc', 'Hantera produkter'),
    },
    {
      name: t('nav.admin_storefront', 'Butik'),
      path: '/admin/storefront',
      icon: BuildingStorefrontIcon,
      description: t('nav.admin_storefront_desc', 'Utseende och innehåll för din webbutik'),
    },
    {
      name: t('nav.admin_marketing', 'Marknadsföring'),
      path: '/admin/marketing',
      icon: MegaphoneIcon,
      description: t('nav.admin_marketing_desc', 'Hantera marknadsföringsmaterial'),
    },
    // 🛒 Google Shopping admin removed — Google Merchant feature cut (POD shops don't need it).
    {
      name: t('nav.admin_pages', 'Sidor'),
      path: '/admin/pages',
      icon: DocumentTextIcon,
      description: t('nav.admin_pages_desc', 'Hantera webbsidor och innehåll'),
    },
    // 🇸🇪 SE-ONLY LAUNCH: Translations admin hidden — single-language (Swedish)
    // for now. The runtime i18n engine stays active (Swedish via fallbacks).
    // Re-enable this menu item (and the route in App.jsx + the footer
    // LanguageCurrencySelector) to offer internationalization later.
    // {
    //   name: t('nav.admin_translations', 'Översättningar'),
    //   path: '/admin/translations',
    //   icon: LanguageIcon,
    //   description: t('nav.admin_translations_desc', 'Hantera språk och översättningar'),
    // },
    {
      name: t('nav.admin_affiliates', 'Affiliates'),
      path: '/admin/affiliates',
      icon: UsersIcon,
      description: t('nav.admin_affiliates_desc', 'Hantera affiliate-partners'),
    },
    {
      name: t('nav.admin_settings', 'Inställningar'),
      path: '/admin/settings',
      icon: Cog6ToothIcon,
      description: t('nav.admin_settings_desc', 'Systeminställningar'),
    }
  ];
  
  // Function to get parent path for breadcrumb
  const getParentPath = (path) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return '/';
    return '/' + parts.slice(0, -1).join('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* P4.3: non-dismissible operator-impersonation banner (only renders when
          a session is active). Sits above the whole admin shell. */}
      <ImpersonationBanner />
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex grow flex-col overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
          <div className="flex shrink-0 items-center px-4 py-6">
            <Link to="/admin" className="flex items-center">
              <img
                src="/images/JPH_logo.webp" 
                alt="JPH Innovation AB Logo"
                className="h-10 w-auto"
              />
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="mt-5 flex grow flex-col">
            <nav className="flex-1 space-y-1 px-2 pb-4">
              {/* Admin Navigation */}
              {adminNavLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(item.path)
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 shrink-0 ${
                      isActive(item.path) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                  </div>
                </Link>
              ))}

              {/* 🚂 WAGON SYSTEM: Auto-generated wagon menu items */}
              {wagonMenuItems.length > 0 && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white dark:bg-gray-800 px-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold flex items-center">
                        <CpuChipIcon className="h-4 w-4 mr-1" />
                        {t('nav.ai_wagons', 'AI Vagnar')}
                      </span>
                    </div>
                  </div>

                  {wagonMenuItems.map((item) => (
                    <Link
                      key={`wagon-${item.wagonId}`}
                      to={item.path}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive(item.path)
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      <SparklesIcon className="mr-3 h-5 w-5 shrink-0 text-blue-500 dark:text-blue-400" />
                      <div>
                        <div>{item.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
          
          {/* User Profile Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {userProfile?.companyName?.charAt(0)?.toUpperCase() || 
                   currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {userProfile?.companyName || currentUser?.email}
                </div>
                <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                  {currentUser?.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-auto shrink-0 bg-white dark:bg-gray-800 p-1 text-gray-400 dark:text-gray-500 rounded-full hover:text-gray-500 dark:hover:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop and Mobile header */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Desktop header - hidden on mobile */}
        <div className="sticky top-0 z-20 hidden md:flex h-16 shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-1 justify-end px-6">
            <div className="flex items-center space-x-4">
              {/* Admin tools for desktop */}
              {isAdmin && (
                <MentionNotifications />
              )}
              
              {/* Dark Mode Toggle */}
              <DarkModeToggle />
              
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              <div className="flex items-center space-x-3">
                <div className="shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {userProfile?.companyName?.charAt(0)?.toUpperCase() || 
                     currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {userProfile?.companyName || currentUser?.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-gray-400 hover:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  title={t('nav.logout', 'Logga ut')}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex h-16 shrink-0 bg-white dark:bg-gray-800 shadow-sm md:hidden">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <span className="sr-only">{t('nav.open_sidebar', 'Open sidebar')}</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1 items-center pl-3">
              <div className="flex w-full items-center">
                <Link to="/admin">
                  <img
                    src="/images/JPH_logo.webp" 
                    alt="JPH Innovation AB Logo"
                    className="h-8 w-auto"
                  />
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Admin tools for mobile */}
              {isAdmin && (
                <MentionNotifications />
              )}
              
              {/* Dark Mode Toggle */}
              <DarkModeToggle />
              
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              <div className="shrink-0">
                <button
                  onClick={handleLogout}
                  className="relative p-1 text-gray-400 hover:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <span className="sr-only">{t('nav.logout', 'Logga ut')}</span>
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
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="sr-only">{t('nav.close_sidebar', 'Close sidebar')}</span>
                  <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              
              <div className="flex shrink-0 items-center px-4">
                <Link to="/admin">
                  <img
                    src="/images/JPH_logo.webp" 
                    alt="JPH Innovation AB Logo"
                    className="h-8 w-auto"
                  />
                </Link>
              </div>
              <div className="mt-5 h-0 flex-1 overflow-y-auto">
                <nav className="space-y-1 px-2">
                  {/* Admin Navigation */}
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
                        className={`mr-4 h-6 w-6 shrink-0 ${
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
                            {t('nav.ai_wagons', 'AI Vagnar')}
                          </span>
                        </div>
                      </div>

                      {wagonMenuItems.map((item) => (
                        <Link
                          key={`wagon-${item.wagonId}`}
                          to={item.path}
                          className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                            isActive(item.path)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <SparklesIcon className="mr-4 h-6 w-6 shrink-0 text-blue-500" />
                          <div>
                            <div>{item.title}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </nav>
              </div>
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="shrink-0">
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
            
            <div className="w-14 shrink-0" aria-hidden="true">
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