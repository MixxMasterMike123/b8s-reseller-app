import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useShopId } from '../../contexts/ShopContext';
import AppLayout from '../../components/layout/AppLayout';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import {
  processAffiliatePayout,
  uploadInvoicePDF,
  formatCurrency,
  validateInvoiceNumber,
  calculateEarningsSummary
} from '../../utils/affiliatePayouts';
import { toast } from 'react-hot-toast';
import { Page, Card, CardSection, RightRail, Button } from '../../components/admin/ui';
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const AdminAffiliatePayout = () => {
  const { affiliateId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const shopId = useShopId();

  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [payoutAmount, setPayoutAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAffiliateData();
  }, [affiliateId]);

  const fetchAffiliateData = async () => {
    try {
      const affiliateRef = doc(db, 'affiliates', affiliateId);
      const affiliateSnap = await getDoc(affiliateRef);

      if (affiliateSnap.exists()) {
        const affiliateData = { id: affiliateSnap.id, ...affiliateSnap.data() };
        setAffiliate(affiliateData);

        // Pre-fill payout amount with current balance
        const currentBalance = affiliateData.stats?.balance || 0;
        setPayoutAmount(currentBalance.toString());
      } else {
        toast.error('Affiliate hittades inte');
        navigate('/admin/affiliates');
      }
    } catch (error) {
      console.error('Error fetching affiliate:', error);
      toast.error('Kunde inte hämta affiliate-data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate payout amount
    const amount = parseFloat(payoutAmount);
    if (!payoutAmount || isNaN(amount) || amount <= 0) {
      newErrors.payoutAmount = 'Ange ett giltigt belopp';
    } else if (amount > (affiliate?.stats?.balance || 0)) {
      newErrors.payoutAmount = 'Beloppet kan inte vara större än nuvarande saldo';
    }

    // Validate invoice number
    const invoiceError = validateInvoiceNumber(invoiceNumber);
    if (invoiceError) {
      newErrors.invoiceNumber = invoiceError;
    }

    // Validate invoice file
    if (!invoiceFile) {
      newErrors.invoiceFile = 'Välj en fakturafil (PDF)';
    } else if (invoiceFile.type !== 'application/pdf') {
      newErrors.invoiceFile = 'Endast PDF-filer är tillåtna';
    } else if (invoiceFile.size > 10 * 1024 * 1024) {
      newErrors.invoiceFile = 'Filen är för stor (max 10MB)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setInvoiceFile(file);

    // Clear file error when new file is selected
    if (file && errors.invoiceFile) {
      setErrors(prev => ({ ...prev, invoiceFile: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check if user is authenticated
    if (!currentUser || !currentUser.uid) {
      toast.error('Du måste vara inloggad för att behandla betalningar');
      return;
    }

    setProcessing(true);

    try {
      // Upload invoice PDF
      setUploading(true);
      const uploadResult = await uploadInvoicePDF(invoiceFile, affiliateId, invoiceNumber);
      setUploading(false);

      // Process payout
      const payoutData = {
        payoutAmount: parseFloat(payoutAmount),
        invoiceNumber: invoiceNumber.trim(),
        invoiceUrl: uploadResult.url,
        invoiceFileName: uploadResult.fileName,
        notes: notes.trim(),
        processedBy: currentUser.uid
      };

      const result = await processAffiliatePayout(affiliateId, payoutData, shopId);

      toast.success(`Betalning på ${formatCurrency(payoutData.payoutAmount)} har behandlats!`);
      navigate('/admin/affiliates');

    } catch (error) {
      console.error('Error processing payout:', error);
      toast.error(error.message || 'Ett fel uppstod vid behandling av betalningen');
      setUploading(false);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Page title="Betala Affiliate" back={{ to: '/admin/affiliates', label: 'Affiliates' }}>
          <Card className="px-6 py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent" />
            <p className="mt-3 text-[13px] text-admin-text-muted">Laddar affiliate-data…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  if (!affiliate) {
    return (
      <AppLayout>
        <Page title="Betala Affiliate" back={{ to: '/admin/affiliates', label: 'Affiliates' }}>
          <Card className="px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-admin-text">Affiliate hittades inte</h2>
            <div className="mt-4">
              <Button as={Link} to="/admin/affiliates" variant="secondary">Tillbaka till affiliates</Button>
            </div>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  const earningsSummary = calculateEarningsSummary(affiliate.stats, []);

  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';
  const errorCls = 'mt-1 text-[12px] text-admin-critical-text';

  // Right-rail summary row.
  const SummaryRow = ({ label, value, strong, accent }) => (
    <div className="flex items-baseline justify-between gap-4 py-1 text-[13px]">
      <span className="text-admin-text-muted">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-admin-text' : accent ? 'text-admin-success-text' : 'text-admin-text'}`}>{value}</span>
    </div>
  );

  return (
    <AppLayout>
      <Page
        title="Betala Affiliate"
        subtitle={`Behandla betalning för ${affiliate.name}`}
        back={{ to: '/admin/affiliates', label: 'Affiliates' }}
      >
        <form onSubmit={handleSubmit}>
          <RightRail
            main={
              <>
                {/* Payout form */}
                <CardSection title="Behandla betalning" bodyClassName="space-y-5">
                  {/* Payout Amount */}
                  <div>
                    <label className={labelCls}>Utbetalningsbelopp *</label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={affiliate.stats?.balance || 0}
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className={`${inputCls} pr-12 ${errors.payoutAmount ? 'border-admin-critical-dot' : ''}`}
                        placeholder="0.00"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-[12px] text-admin-text-muted">SEK</span>
                      </div>
                    </div>
                    {errors.payoutAmount && (
                      <p className={errorCls}>{errors.payoutAmount}</p>
                    )}
                    <p className={helpCls}>
                      Maximalt belopp: {formatCurrency(affiliate.stats?.balance || 0)}
                    </p>
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className={labelCls}>Fakturanummer *</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className={`${inputCls} max-w-xs ${errors.invoiceNumber ? 'border-admin-critical-dot' : ''}`}
                      placeholder="t.ex. INV-2024-001"
                    />
                    {errors.invoiceNumber && (
                      <p className={errorCls}>{errors.invoiceNumber}</p>
                    )}
                  </div>

                  {/* Invoice File Upload */}
                  <div>
                    <label className={labelCls}>Fakturafil (PDF) *</label>
                    <div className={`flex justify-center rounded-[var(--radius-admin-el)] border-2 border-dashed px-6 pb-6 pt-5 ${
                      errors.invoiceFile ? 'border-admin-critical-dot' : 'border-admin-border'
                    }`}>
                      <div className="space-y-1 text-center">
                        <DocumentArrowUpIcon className="mx-auto h-10 w-10 text-admin-text-faint" />
                        <div className="flex justify-center text-[13px] text-admin-text-muted">
                          <label htmlFor="invoice-upload" className="relative cursor-pointer rounded-[var(--radius-admin-el)] font-medium text-admin-text hover:opacity-70 focus-within:outline-hidden">
                            <span>Ladda upp faktura</span>
                            <input
                              id="invoice-upload"
                              name="invoice-upload"
                              type="file"
                              accept=".pdf"
                              className="sr-only"
                              onChange={handleFileChange}
                            />
                          </label>
                          <p className="pl-1">eller dra och släpp</p>
                        </div>
                        <p className="text-[12px] text-admin-text-faint">Endast PDF upp till 10MB</p>

                        {invoiceFile && (
                          <div className="mt-2 rounded-[var(--radius-admin-el)] bg-admin-surface-2 p-2">
                            <p className="text-[13px] text-admin-text">{invoiceFile.name}</p>
                            <p className="text-[12px] text-admin-text-muted">
                              {(invoiceFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {errors.invoiceFile && (
                      <p className={errorCls}>{errors.invoiceFile}</p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={labelCls}>Anteckningar (valfritt)</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={inputCls}
                      placeholder="Ytterligare information om betalningen..."
                    />
                  </div>

                  {/* Warning */}
                  <div className="rounded-[var(--radius-admin-el)] border border-admin-caution-dot bg-admin-caution-bg p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-admin-caution-text" />
                      <div className="ml-3">
                        <h3 className="text-[13px] font-semibold text-admin-caution-text">Viktigt att veta</h3>
                        <div className="mt-2 text-[13px] text-admin-caution-text">
                          <ul className="list-disc space-y-1 pl-5">
                            <li>Detta kommer att nollställa affiliate-saldot</li>
                            <li>Totala intäkter kommer att bevaras för statistik</li>
                            <li>Åtgärden kan inte ångras</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardSection>

                {/* Save bar */}
                <div className="flex justify-end gap-2">
                  <Button as={Link} to="/admin/affiliates" variant="secondary">
                    Avbryt
                  </Button>
                  <Button type="submit" variant="primary" disabled={processing || uploading}>
                    {uploading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                        Laddar upp faktura…
                      </>
                    ) : processing ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                        Behandlar betalning…
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        Bekräfta betalning
                      </>
                    )}
                  </Button>
                </div>
              </>
            }
            rail={
              <>
                {/* Affiliate info */}
                <CardSection title="Affiliate" bodyClassName="space-y-3 text-[13px]">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Namn</div>
                    <div className="font-medium text-admin-text">{affiliate.name}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Affiliate-kod</div>
                    <div className="text-admin-text">{affiliate.affiliateCode}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">E-post</div>
                    <div className="break-words text-admin-text">{affiliate.email}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">Provision</div>
                    <div className="text-admin-text">{affiliate.commissionRate}%</div>
                  </div>
                </CardSection>

                {/* Earnings summary */}
                <CardSection title="Intäktsöversikt" bodyClassName="space-y-0.5">
                  <SummaryRow label="Totala intäkter" value={formatCurrency(earningsSummary.totalEarnings)} strong />
                  <SummaryRow label="Nuvarande saldo" value={formatCurrency(earningsSummary.currentBalance)} accent />
                  <SummaryRow label="Tidigare utbetalningar" value={formatCurrency(earningsSummary.totalPaidOut)} />
                  <SummaryRow label="Antal utbetalningar" value={earningsSummary.payoutCount} />
                </CardSection>
              </>
            }
          />
        </form>
      </Page>
    </AppLayout>
  );
};

export default AdminAffiliatePayout;
