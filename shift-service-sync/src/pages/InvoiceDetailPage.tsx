import React from 'react';
import { InvoiceDetail } from '../components/invoice/InvoiceDetail';

export const InvoiceDetailPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Invoice Details</h1>
      <InvoiceDetail />
    </div>
  );
}; 