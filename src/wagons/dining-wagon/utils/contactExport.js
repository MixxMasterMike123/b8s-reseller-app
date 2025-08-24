/**
 * Contact Export Utilities for The Dining Wagon™
 * 
 * Provides CSV export functionality for contacts in formats compatible
 * with email marketing platforms like Sender.net
 */

import toast from 'react-hot-toast';

/**
 * Export contacts to CSV format compatible with Sender.net
 * 
 * Sender.net CSV format typically includes:
 * - Email (required)
 * - First Name
 * - Last Name  
 * - Company
 * - Phone
 * - Country
 * - Custom fields for segmentation
 */
export const exportContactsToCSV = (contacts, options = {}) => {
  try {
    // Filter out contacts without email addresses
    const contactsWithEmail = contacts.filter(contact => contact.email && contact.email.trim());
    
    if (contactsWithEmail.length === 0) {
      toast.error('Inga kontakter med e-postadresser hittades för export');
      return;
    }

    // Define CSV headers for Sender.net compatibility
    const csvHeaders = [
      'Email',           // Required by most email platforms
      'First Name',      // Contact person first name
      'Last Name',       // Contact person last name  
      'Company',         // Company name
      'Phone',           // Phone number
      'Country',         // Country
      'Status',          // CRM status for segmentation
      'Priority',        // Priority level for segmentation
      'Source',          // Lead source
      'Tags',            // Tags for segmentation (comma-separated)
      'Notes',           // Additional notes
      'Created Date',    // When contact was added
      'Last Activity',   // Last activity date
      'Margin',          // Customer margin for B2B segmentation
      'Active Customer'  // Whether they're an active B2B customer
    ];

    // Convert contacts to CSV rows
    const csvData = contactsWithEmail.map(contact => {
      // Split contact person into first/last name
      const contactPerson = contact.contactPerson || '';
      const nameParts = contactPerson.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Format dates
      const formatDate = (dateField) => {
        if (!dateField) return '';
        try {
          if (dateField.toDate && typeof dateField.toDate === 'function') {
            return dateField.toDate().toLocaleDateString('sv-SE');
          }
          if (typeof dateField === 'string') {
            return new Date(dateField).toLocaleDateString('sv-SE');
          }
          if (dateField instanceof Date) {
            return dateField.toLocaleDateString('sv-SE');
          }
          return '';
        } catch (error) {
          return '';
        }
      };

      // Format tags as comma-separated string
      const tags = Array.isArray(contact.tags) ? contact.tags.join(', ') : '';

      // Map status to readable format
      const statusMapping = {
        'ej_kontaktad': 'Ej kontaktad',
        'kontaktad': 'Kontaktad', 
        'dialog': 'Dialog',
        'af': 'ÅF',
        'closed': 'Stängd',
        'prospect': 'Prospect',
        'active': 'Aktiv',
        'inactive': 'Inaktiv'
      };

      const status = statusMapping[contact.status] || contact.status || 'Okänd';

      // Priority mapping
      const priorityMapping = {
        'high': 'Hög',
        'medium': 'Medium', 
        'low': 'Låg'
      };
      const priority = priorityMapping[contact.priority] || contact.priority || 'Medium';

      // Source mapping
      const sourceMapping = {
        'manual': 'Manuell',
        'import': 'Import',
        'web': 'Webb',
        'referral': 'Referens',
        'campaign': 'Kampanj'
      };
      const source = sourceMapping[contact.source] || contact.source || 'Manuell';

      return [
        contact.email,
        firstName,
        lastName,
        contact.companyName || '',
        contact.phone || contact.phoneNumber || '',
        contact.country || '',
        status,
        priority,
        source,
        tags,
        (contact.notes || '').replace(/[\r\n]/g, ' '), // Remove line breaks from notes
        formatDate(contact.createdAt),
        formatDate(contact.lastActivityAt || contact.updatedAt),
        contact.marginal || '',
        contact.active === true ? 'Ja' : 'Nej'
      ];
    });

    // Create CSV content with proper escaping
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const fieldStr = String(field || '');
        if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
          return `"${fieldStr.replace(/"/g, '""')}"`;
        }
        return fieldStr;
      }).join(','))
      .join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = options.filename || `dining-wagon-contacts-${timestamp}.csv`;

    // Create and trigger download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Success message
    const exportedCount = contactsWithEmail.length;
    const totalCount = contacts.length;
    const skippedCount = totalCount - exportedCount;
    
    let message = `🍽️ ${exportedCount} kontakter exporterade till CSV!`;
    if (skippedCount > 0) {
      message += ` (${skippedCount} kontakter utan e-post hoppades över)`;
    }
    
    toast.success(message);
    
    return {
      success: true,
      exportedCount,
      skippedCount,
      filename
    };

  } catch (error) {
    console.error('Error exporting contacts:', error);
    toast.error('Kunde inte exportera kontakter till CSV');
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Export contacts in a simplified format for quick email lists
 */
export const exportEmailListCSV = (contacts, options = {}) => {
  try {
    // Filter contacts with email addresses
    const contactsWithEmail = contacts.filter(contact => contact.email && contact.email.trim());
    
    if (contactsWithEmail.length === 0) {
      toast.error('Inga kontakter med e-postadresser hittades');
      return;
    }

    // Simple format: Email, Name, Company
    const csvHeaders = ['Email', 'Namn', 'Företag'];
    
    const csvData = contactsWithEmail.map(contact => [
      contact.email,
      contact.contactPerson || '',
      contact.companyName || ''
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = options.filename || `dining-wagon-emails-${timestamp}.csv`;

    // Download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`🍽️ ${contactsWithEmail.length} e-postadresser exporterade!`);
    
    return {
      success: true,
      exportedCount: contactsWithEmail.length
    };

  } catch (error) {
    console.error('Error exporting email list:', error);
    toast.error('Kunde inte exportera e-postlista');
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get export statistics without performing export
 */
export const getExportStats = (contacts) => {
  const total = contacts.length;
  const withEmail = contacts.filter(contact => contact.email && contact.email.trim()).length;
  const withoutEmail = total - withEmail;
  
  const byStatus = contacts.reduce((acc, contact) => {
    const status = contact.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const byCountry = contacts.reduce((acc, contact) => {
    const country = contact.country || 'Okänt';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  return {
    total,
    withEmail,
    withoutEmail,
    byStatus,
    byCountry
  };
};
