import React from 'react';
import { Invoice } from '@/lib/types';
import logoImage from '../logo/logo.jpg';

interface InvoiceTemplateProps {
  invoice: Invoice;
}

// Company details - these will be used as defaults if not provided in the invoice
const COMPANY_INFO = {
  name: 'Secufy BV',
  kvk: '94486786',
  address: 'Soetendaalseweg 32c',
  postal: '3036ER',
  city: 'Rotterdam',
  phone: '0685455793',
  email: 'vraagje@secufy.nl',
  bankAccount: 'NL11 ABNA 0137 7274 61'
};

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice }) => {
  console.log('InvoiceTemplate received invoice:', {
    id: invoice.id,
    factuurnummer: invoice.factuurnummer,
    factuur_text: invoice.factuur_text,
    opdrachtgever_naam: invoice.opdrachtgever_naam,
    locatie: invoice.locatie,
    bedrag: invoice.bedrag,
    status: invoice.status,
    breakdown: invoice.breakdown
  });

  // Helper function to safely format currency
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || isNaN(amount)) return '€ 0,00';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Helper function to safely format hours
  const formatHours = (hours: number | undefined) => {
    if (hours === undefined || isNaN(hours)) return '0,0';
    return hours.toFixed(1).replace('.', ',');
  };

  // Helper function to format date
  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    try {
      const [year, month, day] = date.split('-');
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

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
              <p>{invoice.factuurnummer}</p>
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
              width: 'auto',
              minWidth: '120px',
              textAlign: 'center'
            }}
          >
            <img
              src={logoImage}
              alt="Secufy Logo"
              style={{ 
                width: '120px',
                height: '40px',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto'
              }}
            />
          </div>
          <div style={{ marginTop: '16px', fontSize: '14px' }}>
            <p style={{ margin: '4px 0' }}>94486786</p>
            <p style={{ margin: '4px 0' }}>Soetendalseweg 32c</p>
            <p style={{ margin: '4px 0' }}>3036ER Rotterdam</p>
            <p style={{ margin: '4px 0' }}>0685455793</p>
            <p style={{ margin: '4px 0' }}>vraagje@secufy.nl</p>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="mb-8">
        <h2 className="font-bold mb-2">FACTUUR AAN:</h2>
        <p className="font-bold">{invoice.opdrachtgever_naam}</p>
        <p>KVK: {invoice.kvk_nummer}</p>
        <p>{invoice.adres}</p>
        <p>{invoice.postcode} {invoice.stad}</p>
        <p>Tel: {invoice.telefoon}</p>
        <p>Email: {invoice.email}</p>
      </div>

      {/* Invoice Details */}
      <div className="mb-8">
        <h2 className="font-bold mb-2">FACTUUR DETAILS:</h2>
        <p>Periode: {formatDate(invoice.shift_date)} - {formatDate(invoice.shift_date_end)}</p>
        <p>Locatie: {invoice.locatie}</p>
      </div>

      {/* Invoice Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">UREN</th>
            <th className="text-left py-2">TYPE</th>
            <th className="text-left py-2">TARIEF</th>
            <th className="text-right py-2">TOTAAL</th>
          </tr>
        </thead>
        <tbody>
          {invoice.breakdown && Object.entries(invoice.breakdown).map(([type, data]) => (
            data.hours > 0 && (
              <tr key={type} className="border-b">
                <td className="py-2">{formatHours(data.hours)}</td>
                <td className="py-2">{type.charAt(0).toUpperCase() + type.slice(1)}</td>
                <td className="py-2">{formatCurrency(data.rate)}</td>
                <td className="py-2 text-right">{formatCurrency(data.total)}</td>
              </tr>
            )
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span>Subtotaal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>BTW (21%)</span>
            <span>{formatCurrency(invoice.vat_amount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Totaal</span>
            <span>{formatCurrency(invoice.bedrag)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-12">
        <h3 className="font-bold mb-2">BEDANKT VOOR UW KLANDIZIE</h3>
        <p className="text-sm">Alle bedragen gelieve over te maken op rekeningnummer NL11 ABNA 0137 7274 61</p>
      </div>
    </div>
  );
};

export default InvoiceTemplate; 