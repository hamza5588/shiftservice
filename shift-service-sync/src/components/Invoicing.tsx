import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceCreate } from '../lib/types';
import { createInvoice, getInvoices, updateInvoice, deleteInvoiceByNumber } from '../lib/api';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const Invoicing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newInvoice, setNewInvoice] = useState<Partial<InvoiceCreate>>({
    opdrachtgever_id: 0,
    opdrachtgever_naam: '',
    locatie: '',
    factuurdatum: format(new Date(), 'yyyy-MM-dd'),
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    shift_date_end: format(new Date(), 'yyyy-MM-dd'),
    bedrag: 0,
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      setInvoices(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch invoices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createInvoice(newInvoice as InvoiceCreate);
      await fetchInvoices();
      setNewInvoice({
        opdrachtgever_id: 0,
        opdrachtgever_naam: '',
        locatie: '',
        factuurdatum: format(new Date(), 'yyyy-MM-dd'),
        shift_date: format(new Date(), 'yyyy-MM-dd'),
        shift_date_end: format(new Date(), 'yyyy-MM-dd'),
        bedrag: 0,
      });
      setError(null);
    } catch (err) {
      setError('Failed to create invoice');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewInvoice(prev => ({
      ...prev,
      [name]: name === 'bedrag' || name === 'opdrachtgever_id' ? Number(value) : value
    }));
  };

  const handleDeleteInvoice = async (factuurnummer: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${factuurnummer}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      await deleteInvoiceByNumber(factuurnummer);
      await fetchInvoices();
      
      setSuccessMessage(`Successfully deleted invoice ${factuurnummer}`);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Invoices</h1>
      
      {/* Create Invoice Form */}
      <form onSubmit={handleCreateInvoice} className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Create New Invoice</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">Client ID</label>
            <input
              type="number"
              name="opdrachtgever_id"
              value={newInvoice.opdrachtgever_id}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Client Name</label>
            <input
              type="text"
              name="opdrachtgever_naam"
              value={newInvoice.opdrachtgever_naam}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Location</label>
            <input
              type="text"
              name="locatie"
              value={newInvoice.locatie}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Amount</label>
            <input
              type="number"
              name="bedrag"
              value={newInvoice.bedrag}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Invoice Date</label>
            <input
              type="date"
              name="factuurdatum"
              value={newInvoice.factuurdatum}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Shift Start Date</label>
            <input
              type="date"
              name="shift_date"
              value={newInvoice.shift_date}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Shift End Date</label>
            <input
              type="date"
              name="shift_date_end"
              value={newInvoice.shift_date_end}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Invoice
        </button>
      </form>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      {/* Invoices List */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b">Invoice Number</th>
              <th className="px-6 py-3 border-b">Client</th>
              <th className="px-6 py-3 border-b">Date</th>
              <th className="px-6 py-3 border-b">Amount</th>
              <th className="px-6 py-3 border-b">Status</th>
              <th className="px-6 py-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-6 py-4 border-b">{invoice.factuurnummer}</td>
                <td className="px-6 py-4 border-b">{invoice.opdrachtgever_naam}</td>
                <td className="px-6 py-4 border-b">
                  {format(new Date(invoice.factuurdatum), 'dd MMM yyyy', { locale: nl })}
                </td>
                <td className="px-6 py-4 border-b">€{invoice.bedrag.toFixed(2)}</td>
                <td className="px-6 py-4 border-b">{invoice.status}</td>
                <td className="px-6 py-4 border-b">
                  <button
                    onClick={() => handleDeleteInvoice(invoice.factuurnummer)}
                    className="text-red-600 hover:text-red-800"
                    disabled={loading}
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoicing; 