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
      // B2B reseller function retired (2026-06-15) — this entry now manages
      // platform administrators only (the B2B-customer tab is hidden in
      // AdminUsers). B2C customers have their own entry below.
      name: t('nav.admin_admins', 'Administratörer'),
      path: '/admin/users',
      icon: UsersIcon,
      description: t('nav.admin_admins_desc', 'Hantera administratörer'),
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
    <div className="min-h-screen bg-admin-bg text-admin-text [font-size:13px] [line-height:20px]">
      {/* P4.3: non-dismissible operator-impersonation banner (only renders when
          a session is active). Sits above the whole admin shell. */}
      <ImpersonationBanner />
      {/* Desktop Sidebar — Admin Neutral: calm light surface, flat, single-line
          nav items (descriptions dropped for the Shopify minimalist feel),
          accent only on the active item. */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-60 md:flex-col">
        <div className="flex grow flex-col overflow-y-auto border-r border-admin-border bg-admin-surface">
          <div className="flex shrink-0 items-center px-5 py-5">
            <Link to="/admin" className="flex items-center">
              <img
                src="/images/JPH_logo.webp"
                alt="JPH Innovation AB Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Navigation Links — Polaris metrics: 40px item height, 20px icons,
              8px icon→label gap, 13px medium label, active = subtle gray fill. */}
          <div className="flex grow flex-col">
            <nav className="flex-1 space-y-0.5 px-3 pb-4 text-[13px]">
              {/* Admin Navigation */}
              {adminNavLinks.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    title={item.description}
                    className={`group flex h-10 items-center gap-2 rounded-[var(--radius-admin-el)] px-3 font-medium transition-colors ${
                      active
                        ? 'bg-admin-surface-2 text-admin-text'
                        : 'text-admin-text-muted hover:bg-admin-surface-2 hover:text-admin-text'
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 shrink-0 ${
                        active ? 'text-admin-text' : 'text-admin-text-muted group-hover:text-admin-text'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* 🚂 WAGON SYSTEM: Auto-generated wagon menu items */}
              {wagonMenuItems.length > 0 && (
                <>
                  <div className="px-3 pt-5 pb-1">
                    <span className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-admin-text-faint">
                      <CpuChipIcon className="mr-1.5 h-3.5 w-3.5" />
                      {t('nav.ai_wagons', 'AI Vagnar')}
                    </span>
                  </div>

                  {wagonMenuItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={`wagon-${item.wagonId}`}
                        to={item.path}
                        title={item.description}
                        className={`group flex h-10 items-center gap-2 rounded-[var(--radius-admin-el)] px-3 font-medium transition-colors ${
                          active
                            ? 'bg-admin-surface-2 text-admin-text'
                            : 'text-admin-text-muted hover:bg-admin-surface-2 hover:text-admin-text'
                        }`}
                      >
                        <SparklesIcon className="h-5 w-5 shrink-0 text-admin-text-muted group-hover:text-admin-text" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
          </div>

          {/* User Profile Section */}
          <div className="border-t border-admin-border p-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-admin-primary)] text-sm font-semibold text-white">
                  {userProfile?.companyName?.charAt(0)?.toUpperCase() ||
                   currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-admin-text">
                  {userProfile?.companyName || currentUser?.email}
                </div>
                <div className="truncate text-xs text-admin-text-faint">
                  {currentUser?.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title={t('nav.logout', 'Logga ut')}
                className="ml-auto shrink-0 rounded-full p-1.5 text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop and Mobile header */}
      <div className="md:pl-60 flex flex-col flex-1">
        {/* Desktop header - hidden on mobile */}
        <div className="sticky top-0 z-20 hidden md:flex h-14 shrink-0 bg-admin-surface border-b border-admin-border">
          <div className="flex flex-1 justify-end px-6">
            <div className="flex items-center gap-3">
              {/* Admin tools for desktop */}
              {isAdmin && (
                <MentionNotifications />
              )}

              {/* Dark Mode Toggle */}
              <DarkModeToggle />

              {/* Language Switcher */}
              <LanguageSwitcher />

              <div className="flex items-center gap-2 pl-1">
                <div className="shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-admin-primary)] text-sm font-semibold text-white">
                    {userProfile?.companyName?.charAt(0)?.toUpperCase() ||
                     currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-medium text-admin-text">
                    {userProfile?.companyName || currentUser?.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-full p-1.5 text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
                  title={t('nav.logout', 'Logga ut')}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex h-14 shrink-0 bg-admin-surface border-b border-admin-border md:hidden">
          <button
            type="button"
            className="border-r border-admin-border px-4 text-admin-text-muted hover:text-admin-text focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-admin-primary)] md:hidden"
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
                  className="relative p-1.5 text-admin-text-faint hover:text-admin-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
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
          <div className="fixed inset-0 z-40 flex md:hidden text-[13px]">
            <div
              className="fixed inset-0 bg-black/40"
              aria-hidden="true"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-admin-surface pt-5 pb-4">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="sr-only">{t('nav.close_sidebar', 'Close sidebar')}</span>
                  <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>

              <div className="flex shrink-0 items-center px-5">
                <Link to="/admin">
                  <img
                    src="/images/JPH_logo.webp"
                    alt="JPH Innovation AB Logo"
                    className="h-8 w-auto"
                  />
                </Link>
              </div>
              <div className="mt-5 h-0 flex-1 overflow-y-auto">
                <nav className="space-y-0.5 px-3">
                  {/* Admin Navigation */}
                  {adminNavLinks.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`group flex h-11 items-center gap-2 rounded-[var(--radius-admin-el)] px-3 font-medium ${
                          active
                            ? 'bg-admin-surface-2 text-admin-text'
                            : 'text-admin-text-muted hover:bg-admin-surface-2 hover:text-admin-text'
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 ${
                            active ? 'text-admin-text' : 'text-admin-text-muted group-hover:text-admin-text'
                          }`}
                          aria-hidden="true"
                        />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}

                  {/* 🚂 WAGON SYSTEM: Auto-generated wagon menu items */}
                  {wagonMenuItems.length > 0 && (
                    <>
                      <div className="px-3 pt-5 pb-1">
                        <span className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-admin-text-faint">
                          <CpuChipIcon className="mr-1.5 h-3.5 w-3.5" />
                          {t('nav.ai_wagons', 'AI Vagnar')}
                        </span>
                      </div>

                      {wagonMenuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                          <Link
                            key={`wagon-${item.wagonId}`}
                            to={item.path}
                            className={`group flex h-11 items-center gap-2 rounded-[var(--radius-admin-el)] px-3 font-medium ${
                              active
                                ? 'bg-admin-surface-2 text-admin-text'
                                : 'text-admin-text-muted hover:bg-admin-surface-2 hover:text-admin-text'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <SparklesIcon className="h-5 w-5 shrink-0 text-admin-text-muted group-hover:text-admin-text" />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                    </>
                  )}
                </nav>
              </div>
              <div className="border-t border-admin-border p-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-admin-primary)] text-sm font-semibold text-white">
                      {userProfile?.companyName?.charAt(0)?.toUpperCase() ||
                       currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-admin-text">
                      {userProfile?.companyName || currentUser?.email}
                    </div>
                    <div className="truncate text-xs text-admin-text-faint">
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

        {/* Canvas + ONE shared content container. The <Page> primitive adds the
            page header + vertical rhythm but NOT its own max-width/centering, so
            redesigned pages aren't double-boxed; not-yet-redesigned pages still
            get this container for width + padding. Polaris uses a wide content
            column on a light canvas. */}
        <main className="flex-1">
          <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 