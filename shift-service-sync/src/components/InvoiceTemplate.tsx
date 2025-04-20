import React, { useEffect, useState } from 'react';
import { Invoice } from '@/lib/types';

// Import logo directly as a static asset
import logo from '../assets/logo.jpg';

// Company information configuration
const COMPANY_INFO = {
  name: "Secufy Security Services",
  kvk: "94486786",
  address: "Soetendalseweg 32c",
  postcode: "3036ER",
  city: "Rotterdam",
  phone: "0685455793",
  email: "vraagje@secufy.nl",
  bank: "NL11 ABNA 0137 7274"
};

interface InvoiceTemplateProps {
  invoice: Invoice;
  isPdf?: boolean;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, isPdf = false }) => {
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    // Get the absolute URL for the logo
    const getLogoUrl = async () => {
      try {
        // Import the logo dynamically
        const logoModule = await import('../assets/logo.jpg');
        setLogoUrl(logoModule.default);
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    };

    getLogoUrl();
  }, []);

  // Helper function to safely format currency
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '€ 0,00';
    try {
      return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount).replace(',', '.');
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '€ 0,00';
    }
  };

  // Helper function to safely format hours
  const formatHours = (hours: number | undefined) => {
    if (hours === undefined) return '0.00';
    try {
      return hours.toFixed(2).replace(',', '.');
    } catch (error) {
      console.error('Error formatting hours:', error);
      return '0.00';
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Parse the factuur_text to get the breakdown details
  const parseFactuurText = (text: string) => {
    const lines = text.split('\n');
    const breakdown: Record<string, { hours: number; rate: number; total: number }> = {};
    let subtotal = 0;
    let vatAmount = 0;
    let total = 0;
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [period, details] = line.split(':');
        const trimmedPeriod = period.toLowerCase().trim();
        
        // Handle summary lines
        if (trimmedPeriod === 'subtotal') {
          const amount = details.match(/€([\d.]+)/)?.[1];
          if (amount) subtotal = parseFloat(amount);
          return;
        }
        if (trimmedPeriod === 'vat' || trimmedPeriod === 'btw') {
          const amount = details.match(/€([\d.]+)/)?.[1];
          if (amount) vatAmount = parseFloat(amount);
          return;
        }
        if (trimmedPeriod === 'total') {
          const amount = details.match(/€([\d.]+)/)?.[1];
          if (amount) total = parseFloat(amount);
          return;
        }
        
        // Extract hours, rate, and total using regex
        const matches = details.match(/([\d.]+)h x €([\d.]+) = €([\d.]+)/);
        if (matches) {
          const [_, hours, rate, total] = matches;
          breakdown[trimmedPeriod] = {
            hours: parseFloat(hours),
            rate: parseFloat(rate),
            total: parseFloat(total)
          };
        }
      }
    });

    // If VAT amount is 0 but we have total and subtotal, calculate VAT
    if (vatAmount === 0 && total > 0 && subtotal > 0) {
      vatAmount = total - subtotal;
    }
    
    return { breakdown, subtotal, vatAmount, total };
  };

  const { breakdown, subtotal, vatAmount, total } = parseFactuurText(invoice.factuur_text);

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-6">FACTUUR</h1>
          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <h2 className="font-bold">DATUM</h2>
              <p>{formatDate(invoice.factuurdatum)}</p>
            </div>
            <div>
              <h2 className="font-bold">FACTUURNUMMER</h2>
              <p>{invoice.factuurnummer || '-'}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div 
            style={{
              display: 'inline-block',
              backgroundColor: '#F4B740',
              padding: '16px',
              marginBottom: '16px',
              width: '120px',
              height: '60px',
              textAlign: 'center'
            }}
          >
            <img
              src={logo}
              alt={COMPANY_INFO.name}
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto'
              }}
              crossOrigin="anonymous"
            />
          </div>
          <div style={{ marginTop: '16px', fontSize: '14px' }}>
            <p style={{ margin: '4px 0' }}>{COMPANY_INFO.kvk}</p>
            <p style={{ margin: '4px 0' }}>{COMPANY_INFO.address}</p>
            <p style={{ margin: '4px 0' }}>{COMPANY_INFO.postcode} {COMPANY_INFO.city}</p>
            <p style={{ margin: '4px 0' }}>{COMPANY_INFO.phone}</p>
            <p style={{ margin: '4px 0' }}>{COMPANY_INFO.email}</p>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="mb-8">
        <h2 className="font-bold mb-2">FACTUUR AAN:</h2>
        <p className="font-bold">{invoice.opdrachtgever_naam || '-'}</p>
        <p>KVK: {invoice.kvk_nummer || '-'}</p>
        <p>{invoice.adres || '-'}</p>
        <p>{invoice.postcode || '-'}, {invoice.stad || '-'}</p>
        <p>Tel: {invoice.telefoon || '-'}</p>
        <p>Email: {invoice.email || '-'}</p>
      </div>

      {/* Invoice Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">UREN</th>
            <th className="text-left py-2">LOCATIE</th>
            <th className="text-left py-2">TARIEF</th>
            <th className="text-left py-2">DATUM</th>
            <th className="text-right py-2">TOTAAL</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(breakdown)
            .filter(([_, data]) => data.hours > 0)
            .map(([period, data], index) => (
              <tr key={index} className="border-b">
                <td className="py-2">{formatHours(data.hours)}</td>
                <td className="py-2">{invoice.locatie || '-'}</td>
                <td className="py-2">{formatCurrency(data.rate)}</td>
                <td className="py-2">{formatDate(invoice.shift_date)}</td>
                <td className="py-2 text-right">{formatCurrency(data.total)}</td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span>Subtotaal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Btw (21%)</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Totaal</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-12">
        <h3 className="font-bold mb-2">BEDANKT VOOR UW KLANDIZIE</h3>
        <p className="text-sm">Alle bedragen gelieve over te maken op rekeningnummer {COMPANY_INFO.bank}</p>
      </div>
    </div>
  );
};

export default InvoiceTemplate; 