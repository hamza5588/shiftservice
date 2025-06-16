import React from 'react';
import { Invoice } from '@/lib/types';

// Company details - these will be used as defaults if not provided in the invoice
const COMPANY_INFO = {
  name: 'Secufy BV',
  kvk: '94486786',
  address: 'Soetendaalseweg 32c',
  postal: '3036ER',
  city: 'Rotterdam',
  phone: '0685455793',
  email: 'vraagje@secufy.nl',
  bankAccount: 'NL11 ABNA 0137 7274 61',
  btwNumber: 'NL004445566B01'
};

interface InvoiceTemplateProps {
  invoice: Invoice;
}

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

  // Parse shift details from invoice text
  const parseShiftDetails = () => {
    const lines = invoice.factuur_text?.split('\n') || [];
    const shiftDetails = [];
    let subtotal = 0;
    let vatAmount = 0;
    let total = 0;
    
    console.log('Parsing invoice text for invoice:', invoice.factuurnummer);
    console.log('Raw invoice text:', invoice.factuur_text);
    
    // Find the start of the shift details section
    const shiftDetailsStartIndex = lines.findIndex(line => 
      line.trim() === 'UREN\tLOCATIE\tTARIEF\tDATUM\tTOTAAL'
    );
    
    if (shiftDetailsStartIndex === -1) {
      console.log('Could not find shift details header');
      return { shiftDetails: [], subtotal: 0, vatAmount: 0, total: 0 };
    }
    
    console.log('Found shift details header at index:', shiftDetailsStartIndex);
    
    // Process lines after the header until we hit the subtotal
    for (let i = shiftDetailsStartIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Stop if we hit the subtotal section
      if (line.startsWith('Subtotaal')) {
        const amountStr = line.split('€')[1]?.trim();
        if (amountStr) {
          subtotal = parseFloat(amountStr.replace(',', '.'));
        }
        continue;
      }
      
      // Skip if we're in the totals section
      if (line.startsWith('Btw') || line.startsWith('Totaal')) {
        continue;
      }
      
      console.log('Processing line:', line);
      
      // Parse shift line
      const parts = line.split('\t');
      console.log('Split parts:', parts);
      
      if (parts.length >= 5) {
        const [uren, locatie, tarief, datum, totaal] = parts;
        
        // Convert string values to numbers
        const hours = parseFloat(uren.replace(',', '.'));
        const rate = parseFloat(tarief.replace('€', '').replace(',', '.').trim());
        const amount = parseFloat(totaal.replace('€', '').replace(',', '.').trim());
        
        console.log('Parsed values:', { hours, rate, amount });
        
        if (!isNaN(hours) && !isNaN(rate) && !isNaN(amount)) {
          const shiftDetail = {
            uren: hours,
            locatie: locatie,
            tarief: rate,
            datum: datum,
            totaal: amount
          };
          shiftDetails.push(shiftDetail);
          subtotal += amount; // Add to subtotal as we process each shift
          console.log('Added shift detail:', shiftDetail, 'Current shiftDetails length:', shiftDetails.length, 'Current shiftDetails:', shiftDetails);
        }
      } else if (parts.length === 4) {
        // Handle case where date is missing
        const [uren, locatie, tarief, totaal] = parts;
        
        // Convert string values to numbers
        const hours = parseFloat(uren.replace(',', '.'));
        const rate = parseFloat(tarief.replace('€', '').replace(',', '.').trim());
        const amount = parseFloat(totaal.replace('€', '').replace(',', '.').trim());
        
        console.log('Parsed values (4 parts):', { hours, rate, amount });
        
        if (!isNaN(hours) && !isNaN(rate) && !isNaN(amount)) {
          const shiftDetail = {
            uren: hours,
            locatie: locatie,
            tarief: rate,
            datum: invoice.shift_date || '',
            totaal: amount
          };
          shiftDetails.push(shiftDetail);
          subtotal += amount; // Add to subtotal as we process each shift
          console.log('Added shift detail (4 parts):', shiftDetail, 'Current shiftDetails length:', shiftDetails.length, 'Current shiftDetails:', shiftDetails);
        }
      }
    }
    
    // Calculate VAT and total
    vatAmount = subtotal * 0.21;
    total = subtotal + vatAmount;
    
    // If we couldn't parse any shifts but have invoice amounts, use those
    if (subtotal === 0 && invoice.bedrag) {
      total = invoice.bedrag;
      vatAmount = total / 1.21 * 0.21;
      subtotal = total - vatAmount;
    }
    
    console.log('Final parsed details:', { shiftDetails, subtotal, vatAmount, total });
    return { shiftDetails, subtotal, vatAmount, total };
  };

  const { shiftDetails, subtotal, vatAmount, total } = parseShiftDetails();

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
          <div className="bg-[#F4B740] p-4 mb-4 inline-block min-w-[120px] text-center">
            <div className="text-white font-bold text-xl">SECUFY</div>
          </div>
          <div className="text-sm">
            <p className="mb-1">{COMPANY_INFO.kvk}</p>
            <p className="mb-1">{COMPANY_INFO.address}</p>
            <p className="mb-1">{COMPANY_INFO.postal} {COMPANY_INFO.city}</p>
            <p className="mb-1">{COMPANY_INFO.phone}</p>
            <p className="mb-1">{COMPANY_INFO.email}</p>
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
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 font-bold">UREN</th>
              <th className="text-left py-2 font-bold">LOCATIE</th>
              <th className="text-left py-2 font-bold">TARIEF</th>
              <th className="text-left py-2 font-bold">DATUM</th>
              <th className="text-right py-2 font-bold">TOTAAL</th>
            </tr>
          </thead>
          <tbody>
            {shiftDetails.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-2">{formatHours(item.uren)}</td>
                <td className="py-2">{item.locatie}</td>
                <td className="py-2">{formatCurrency(item.tarief)}</td>
                <td className="py-2">{item.datum}</td>
                <td className="py-2 text-right">{formatCurrency(item.totaal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {/* Payment Details */}
      <div className="mt-8 pt-8 border-t border-gray-300">
        <h2 className="font-bold mb-2">BETALINGSGEGEVENS:</h2>
        <p>Bank: {COMPANY_INFO.bankAccount}</p>
        <p>Ten name van: {COMPANY_INFO.name}</p>
        <p>Btw nummer: {COMPANY_INFO.btwNumber}</p>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="font-bold">BEDANKT VOOR UW KLANDIZIE</p>
      </div>
    </div>
  );
};

export default InvoiceTemplate; 