import React from 'react';
import { InvoiceList } from '../components/invoice/InvoiceList';

export const InvoicesPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>
      <InvoiceList />
    </div>
  );
}; 



