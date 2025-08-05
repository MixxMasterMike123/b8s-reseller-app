import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
import { 
  ArrowLeftIcon, 
  DocumentArrowUpIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const AdminAffiliatePayout = () => {
  const { affiliateId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
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
      
      const result = await processAffiliatePayout(affiliateId, payoutData);
      
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Laddar affiliate-data...</span>
        </div>
      </AppLayout>
    );
  }

  if (!affiliate) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Affiliate hittades inte</p>
        </div>
      </AppLayout>
    );
  }

  const earningsSummary = calculateEarningsSummary(affiliate.stats, []);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <Link 
              to="/admin/affiliates" 
              className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">Betala Affiliate</h1>
              <p className="text-gray-600 dark:text-gray-400">Behandla betalning för {affiliate.name}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Affiliate Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Affiliate Information</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Namn</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{affiliate.name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Affiliate-kod</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{affiliate.affiliateCode}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">E-post</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{affiliate.email}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Provision</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{affiliate.commissionRate}%</p>
                </div>
              </div>
            </div>

            {/* Earnings Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Intäktsöversikt</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Totala intäkter</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(earningsSummary.totalEarnings)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Nuvarande saldo</span>
                  <span className="font-bold text-green-600">{formatCurrency(earningsSummary.currentBalance)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tidigare utbetalningar</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(earningsSummary.totalPaidOut)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Antal utbetalningar</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{earningsSummary.payoutCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div className="flex items-center mb-6">
                <BanknotesIcon className="h-8 w-8 text-green-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Behandla Betalning</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Payout Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Utbetalningsbelopp *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={affiliate.stats?.balance || 0}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.payoutAmount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">SEK</span>
                    </div>
                  </div>
                  {errors.payoutAmount && (
                    <p className="mt-1 text-sm text-red-600">{errors.payoutAmount}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Maximalt belopp: {formatCurrency(affiliate.stats?.balance || 0)}
                  </p>
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fakturanummer *
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="t.ex. INV-2024-001"
                  />
                  {errors.invoiceNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber}</p>
                  )}
                </div>

                {/* Invoice File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fakturafil (PDF) *
                  </label>
                  <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg ${
                    errors.invoiceFile ? 'border-red-300' : 'border-gray-300'
                  }`}>
                    <div className="space-y-1 text-center">
                      <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="invoice-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">Endast PDF upp till 10MB</p>
                      
                      {invoiceFile && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-900 dark:text-gray-100">{invoiceFile.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(invoiceFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {errors.invoiceFile && (
                    <p className="mt-1 text-sm text-red-600">{errors.invoiceFile}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Anteckningar (valfritt)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    placeholder="Ytterligare information om betalningen..."
                  />
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Viktigt att veta</h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Detta kommer att nollställa affiliate-saldot</li>
                          <li>Totala intäkter kommer att bevaras för statistik</li>
                          <li>Åtgärden kan inte ångras</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Link
                    to="/admin/affiliates"
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    Avbryt
                  </Link>
                  
                  <button
                    type="submit"
                    disabled={processing || uploading}
                    className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-green-500 dark:focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Laddar upp faktura...
                      </>
                    ) : processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Behandlar betalning...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Bekräfta betalning
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminAffiliatePayout; 