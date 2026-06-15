import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, getDoc, updateDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { useShopId } from '../../contexts/ShopContext';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  Page,
  Card,
  CardSection,
  RightRail,
  Button,
  StatusPill,
  DataTable,
  MetricsBar,
  toneForOrderStatus,
} from '../../components/admin/ui';
import {
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  EyeIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

const AdminB2CCustomerEdit = () => {
  const { customerId } = useParams();
  const shopId = useShopId();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    postalCode: '',
    country: 'SE',
    marketingConsent: false,
    emailVerified: false,
    customerSegment: 'new',
    preferredLang: 'sv-SE'
  });
  const [errors, setErrors] = useState({});

  // Load customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        console.log('Fetching B2C customer:', customerId);

        const customerDoc = await getDoc(doc(db, 'b2cCustomers', customerId));

        if (!customerDoc.exists()) {
          toast.error('B2C-kund hittades inte');
          navigate('/admin/b2c-customers');
          return;
        }

        const customerData = customerDoc.data();
        setCustomer({ id: customerDoc.id, ...customerData });

        // Populate form data
        setFormData({
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          email: customerData.email || '',
          phone: customerData.phone || '',
          address: customerData.address || '',
          apartment: customerData.apartment || '',
          city: customerData.city || '',
          postalCode: customerData.postalCode || '',
          country: customerData.country || 'SE',
          marketingConsent: customerData.marketingConsent || false,
          emailVerified: customerData.emailVerified || false,
          customerSegment: customerData.customerSegment || 'new',
          preferredLang: customerData.preferredLang || 'sv-SE'
        });

        // Load customer orders
        await loadCustomerOrders();

      } catch (error) {
        console.error('Error fetching B2C customer:', error);
        toast.error('Kunde inte hämta kunddata');
        navigate('/admin/b2c-customers');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId, navigate]);

  // Load customer orders
  const loadCustomerOrders = async () => {
    try {
      setOrdersLoading(true);
      console.log('Loading orders for B2C customer:', customerId);

      // First, get customer email to search for orders by email as well
      const customerDoc = await getDoc(doc(db, 'b2cCustomers', customerId));
      const customerData = customerDoc.data();
      const customerEmail = customerData?.email;

      console.log('Customer email:', customerEmail);

      const orders = [];

      // Query 1: Orders with b2cCustomerId (account orders)
      const ordersWithAccountQuery = query(
        collection(db, 'orders'),
        where('shopId', '==', shopId),
        where('b2cCustomerId', '==', customerId)
      );

      const accountOrdersSnapshot = await getDocs(ordersWithAccountQuery);
      accountOrdersSnapshot.forEach(doc => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Query 2: Orders by email (guest orders) - only if customer email exists
      if (customerEmail) {
        const ordersWithEmailQuery = query(
          collection(db, 'orders'),
          where('shopId', '==', shopId),
          where('source', '==', 'b2c'),
          where('customerInfo.email', '==', customerEmail)
        );

        const emailOrdersSnapshot = await getDocs(ordersWithEmailQuery);
        emailOrdersSnapshot.forEach(doc => {
          const orderData = { id: doc.id, ...doc.data() };
          // Only add if not already in orders array (avoid duplicates)
          if (!orders.some(order => order.id === orderData.id)) {
            orders.push(orderData);
          }
        });
      }

      // Sort by creation date (newest first)
      orders.sort((a, b) => {
        if (a.createdAt?.seconds && b.createdAt?.seconds) {
          return b.createdAt.seconds - a.createdAt.seconds;
        }
        return 0;
      });

      console.log(`Found ${orders.length} total orders for customer (account + email)`);
      setCustomerOrders(orders);

    } catch (error) {
      console.error('Error loading customer orders:', error);
      toast.error('Kunde inte ladda kundordrar');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Förnamn är obligatoriskt';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Efternamn är obligatoriskt';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-post är obligatorisk';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ogiltig e-postadress';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Adress är obligatorisk';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Stad är obligatorisk';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postnummer är obligatoriskt';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Vänligen korrigera felen i formuläret');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        ...formData,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'b2cCustomers', customerId), updateData);

      // Update local state
      setCustomer(prev => ({ ...prev, ...updateData }));

      toast.success('B2C-kundprofil uppdaterad framgångsrikt');

    } catch (error) {
      console.error('Error updating B2C customer:', error);
      toast.error(`Kunde inte uppdatera profil: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = () => {
    if (!customer) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!customer) return;

    try {
      setDeleting(true);
      setShowDeleteModal(false);

      console.log('🗑️ Starting complete deletion of B2C customer:', customerId);

      // Call Firebase Function to handle complete deletion
      console.log('🔥 Calling Firebase Function for complete B2C customer deletion...');
      try {
        const deleteB2CCustomer = httpsCallable(functions, 'deleteB2CCustomerAccountV2');
        const result = await deleteB2CCustomer({ customerId });
        console.log('✅ Firebase Function completed successfully:', result);
      } catch (functionError) {
        console.error('❌ Firebase Function failed:', functionError);
        throw new Error(`Firebase Function error: ${functionError.message}`);
      }

      toast.success(`B2C-kund "${customer.firstName} ${customer.lastName}" har tagits bort permanent`);
      navigate('/admin/b2c-customers');

    } catch (error) {
      console.error('❌ Error deleting B2C customer:', error);
      toast.error(`Kunde inte ta bort kund: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Aldrig';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd MMM yyyy HH:mm', { locale: sv });
    } catch (error) {
      return 'Ogiltigt datum';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(amount || 0);
  };

  const handleSendVerificationEmail = async () => {
    if (!customer) return;

    try {
      setSaving(true);
      const sendCustomEmailVerification = httpsCallable(functions, 'sendCustomEmailVerification');
      await sendCustomEmailVerification({
        customerInfo: {
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
          email: customer.email
        },
        firebaseAuthUid: customer.firebaseAuthUid || 'admin-resend',
        source: 'admin_resend',
        language: customer.language || 'sv-SE'
      });
      toast.success('Verifieringsmejl skickat till kunden!');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(`Kunde inte skicka verifieringsmejl: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const inputErrCls = inputCls + ' border-admin-critical-dot';
  const checkboxCls = 'h-4 w-4 rounded-[4px] border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]';
  const errCls = 'mt-1 text-[12px] text-admin-critical-text';

  if (loading) {
    return (
      <AppLayout>
        <Page title="Redigera B2C-kund" back={{ to: '/admin/b2c-customers', label: 'B2C-kunder' }}>
          <Card className="px-6 py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent" />
            <p className="mt-3 text-[13px] text-admin-text-muted">Laddar B2C-kunddata…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <Page title="Redigera B2C-kund" back={{ to: '/admin/b2c-customers', label: 'B2C-kunder' }}>
          <Card className="px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-admin-text">B2C-kund hittades inte</h2>
            <div className="mt-4">
              <Button as={Link} to="/admin/b2c-customers" variant="secondary">
                Tillbaka till B2C-kundlista
              </Button>
            </div>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  // ── Derivations for the order list + stats ──
  const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const avgOrder = customerOrders.length > 0 ? totalSpent / customerOrders.length : 0;
  const lastOrderDate = customerOrders.length > 0
    ? customerOrders.reduce((latest, order) => {
        if (!order.createdAt) return latest;
        const orderDate = order.createdAt.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt);
        return (!latest || orderDate > latest) ? orderDate : latest;
      }, null)
    : null;

  const orderColumns = [
    {
      key: 'order',
      header: 'Order',
      render: (order) => (
        <span className="font-medium text-admin-text">{order.orderNumber}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <StatusPill tone={toneForOrderStatus(order.status)}>{order.status}</StatusPill>
      ),
    },
    {
      key: 'total',
      header: 'Belopp',
      render: (order) => <span className="tabular-nums">{formatCurrency(order.total)}</span>,
    },
    {
      key: 'date',
      header: 'Datum',
      render: (order) => (
        <span className="text-admin-text-muted">{formatDate(order.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Åtgärder',
      render: (order) => (
        <Link
          to={`/admin/orders/${order.id}`}
          className="inline-flex items-center gap-1 text-admin-text hover:underline"
        >
          <EyeIcon className="h-4 w-4" />
          Visa
        </Link>
      ),
    },
  ];

  const headerActions = (
    <>
      <Button
        variant="destructive"
        onClick={handleDeleteCustomer}
        disabled={deleting}
      >
        <TrashIcon className="h-4 w-4" />
        {deleting ? 'Tar bort…' : 'Ta bort kund'}
      </Button>
      <Button as={Link} to="/admin/b2c-customers" variant="secondary">
        Tillbaka till lista
      </Button>
    </>
  );

  const verificationPill = customer.emailVerified ? (
    <StatusPill tone="success">
      <CheckCircleIcon className="h-3.5 w-3.5" />
      E-post verifierad
    </StatusPill>
  ) : (
    <StatusPill tone="warning">
      <XCircleIcon className="h-3.5 w-3.5" />
      E-post ej verifierad
    </StatusPill>
  );

  return (
    <AppLayout>
      <Page
        title="Redigera B2C-kund"
        subtitle={`${customer.firstName} ${customer.lastName} · ${customer.email}`}
        titleAdornment={verificationPill}
        back={{ to: '/admin/b2c-customers', label: 'B2C-kunder' }}
        actions={headerActions}
      >
        <form onSubmit={handleSubmit}>
          <RightRail
            main={
              <>
                {/* Personal Information */}
                <CardSection title="Personlig information" bodyClassName="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className={labelCls}>Förnamn *</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={errors.firstName ? inputErrCls : inputCls}
                      />
                      {errors.firstName && <p className={errCls}>{errors.firstName}</p>}
                    </div>

                    <div>
                      <label htmlFor="lastName" className={labelCls}>Efternamn *</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={errors.lastName ? inputErrCls : inputCls}
                      />
                      {errors.lastName && <p className={errCls}>{errors.lastName}</p>}
                    </div>
                  </div>
                </CardSection>

                {/* Contact Information */}
                <CardSection title="Kontaktinformation" bodyClassName="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="email" className={labelCls}>E-postadress *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={errors.email ? inputErrCls : inputCls}
                      />
                      {errors.email && <p className={errCls}>{errors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="phone" className={labelCls}>Telefonnummer</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </CardSection>

                {/* Address Information */}
                <CardSection title="Adressinformation" bodyClassName="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label htmlFor="address" className={labelCls}>Adress *</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={errors.address ? inputErrCls : inputCls}
                      />
                      {errors.address && <p className={errCls}>{errors.address}</p>}
                    </div>

                    <div>
                      <label htmlFor="apartment" className={labelCls}>Lägenhetsnummer</label>
                      <input
                        type="text"
                        id="apartment"
                        name="apartment"
                        value={formData.apartment}
                        onChange={handleInputChange}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label htmlFor="postalCode" className={labelCls}>Postnummer *</label>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className={errors.postalCode ? inputErrCls : inputCls}
                      />
                      {errors.postalCode && <p className={errCls}>{errors.postalCode}</p>}
                    </div>

                    <div>
                      <label htmlFor="city" className={labelCls}>Stad *</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={errors.city ? inputErrCls : inputCls}
                      />
                      {errors.city && <p className={errCls}>{errors.city}</p>}
                    </div>

                    <div>
                      <label htmlFor="country" className={labelCls}>Land</label>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className={inputCls}
                      >
                        <option value="SE">Sverige</option>
                        <option value="NO">Norge</option>
                        <option value="DK">Danmark</option>
                        <option value="FI">Finland</option>
                        <option value="DE">Tyskland</option>
                        <option value="US">USA</option>
                      </select>
                    </div>
                  </div>
                </CardSection>

                {/* Customer Orders */}
                <CardSection
                  title={`Kundordrar (${customerOrders.length})`}
                  bodyClassName="space-y-4"
                >
                  <DataTable
                    columns={orderColumns}
                    rows={customerOrders}
                    rowKey={(order) => order.id}
                    loading={ordersLoading}
                    empty="Denna kund har inte lagt några ordrar än."
                  />
                </CardSection>

                {/* Save bar */}
                <div className="flex justify-end gap-2">
                  <Button as={Link} to="/admin/b2c-customers" variant="secondary">
                    Avbryt
                  </Button>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Sparar…' : 'Spara ändringar'}
                  </Button>
                </div>
              </>
            }
            rail={
              <>
                {/* E-mail verification */}
                <CardSection title="E-postverifiering" bodyClassName="space-y-3">
                  <div>{verificationPill}</div>
                  {!customer.emailVerified && (
                    <Button
                      variant="primary"
                      onClick={handleSendVerificationEmail}
                      disabled={saving}
                      title="Skicka verifieringsmejl till kunden"
                    >
                      {saving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                          Skickar…
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-4 w-4" />
                          Skicka verifiering
                        </>
                      )}
                    </Button>
                  )}
                </CardSection>

                {/* Customer settings — consent + segment + language */}
                <CardSection title="Kundinställningar" bodyClassName="space-y-4">
                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
                    <input
                      type="checkbox"
                      id="marketingConsent"
                      name="marketingConsent"
                      checked={formData.marketingConsent}
                      onChange={handleInputChange}
                      className={checkboxCls}
                    />
                    Marknadsföring tillåten
                  </label>

                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
                    <input
                      type="checkbox"
                      id="emailVerified"
                      name="emailVerified"
                      checked={formData.emailVerified}
                      onChange={handleInputChange}
                      className={checkboxCls}
                    />
                    E-post verifierad
                  </label>

                  <div>
                    <label htmlFor="customerSegment" className={labelCls}>Kundsegment</label>
                    <select
                      id="customerSegment"
                      name="customerSegment"
                      value={formData.customerSegment}
                      onChange={handleInputChange}
                      className={inputCls}
                    >
                      <option value="new">Ny Kund</option>
                      <option value="repeat">Återkommande Kund</option>
                      <option value="vip">VIP Kund</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="preferredLang" className={labelCls}>Föredragen språk</label>
                    <select
                      id="preferredLang"
                      name="preferredLang"
                      value={formData.preferredLang}
                      onChange={handleInputChange}
                      className={inputCls}
                    >
                      <option value="sv-SE">Svenska (SE)</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                    </select>
                  </div>
                </CardSection>

                {/* Customer statistics */}
                <CardSection title="Kundstatistik" bodyClassName="space-y-4">
                  <MetricsBar
                    metrics={[
                      { key: 'orders', label: 'Totala ordrar', value: customerOrders.length },
                      { key: 'spent', label: 'Total spenderat', value: formatCurrency(totalSpent) },
                    ]}
                  />
                  <MetricsBar
                    metrics={[
                      { key: 'avg', label: 'Genomsnittlig order', value: formatCurrency(avgOrder) },
                      { key: 'last', label: 'Senaste order', value: formatDate(lastOrderDate) },
                    ]}
                  />
                  <dl className="space-y-2 text-[13px]">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-admin-text-muted">Registrerad</dt>
                      <dd className="text-right text-admin-text">{formatDate(customer.createdAt)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-admin-text-muted">Senast uppdaterad</dt>
                      <dd className="text-right text-admin-text">{formatDate(customer.updatedAt)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-admin-text-muted">Senaste inloggning</dt>
                      <dd className="text-right text-admin-text">{formatDate(customer.lastLoginAt)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-admin-text-muted">Källa</dt>
                      <dd className="text-right text-admin-text">{customer.source || 'B2C Checkout'}</dd>
                    </div>
                  </dl>
                </CardSection>
              </>
            }
          />
        </form>
      </Page>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Ta bort B2C-kund"
        customerName={`${customer?.firstName} ${customer?.lastName}`}
        customerEmail={customer?.email}
        confirmationText="TA BORT"
        loading={deleting}
      />
    </AppLayout>
  );
};

export default AdminB2CCustomerEdit;
