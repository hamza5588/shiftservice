import axios from 'axios';
import { Invoice, InvoiceItem, PayrollEntry, PayrollPeriod } from '../types/invoice';
import { API_URL } from '../config/api';

// Add axios interceptor to include auth token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

class InvoiceService {
  // Invoice endpoints
  async getInvoices(params?: URLSearchParams): Promise<Invoice[]> {
    const url = params ? `${API_URL}/facturen/?${params.toString()}` : `${API_URL}/facturen/`;
    const response = await axios.get(url);
    return response.data;
  }

  async getInvoice(id: number): Promise<Invoice> {
    const response = await axios.get(`${API_URL}/facturen/${id}`);
    return response.data;
  }

  async createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
    const response = await axios.post(`${API_URL}/facturen/`, invoice);
    return response.data;
  }

  async updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice> {
    const response = await axios.put(`${API_URL}/facturen/${id}`, invoice);
    return response.data;
  }

  async deleteInvoice(id: number): Promise<void> {
    await axios.delete(`${API_URL}/facturen/${id}`);
  }

  async markAsPaid(id: number): Promise<Invoice> {
    const response = await axios.post(`${API_URL}/facturen/${id}/mark-paid`);
    return response.data;
  }

  // Payroll endpoints
  async getPayrollEntries(year?: number, period?: number): Promise<PayrollEntry[]> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (period) params.append('period', period.toString());
    
    const response = await axios.get(`${API_URL}/verloning/?${params.toString()}`);
    return response.data;
  }

  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    const response = await axios.get(`${API_URL}/verloning/periods`);
    return response.data;
  }

  async uploadPayrollDocument(employeeId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employee_id', employeeId);
    
    await axios.post(`${API_URL}/verloning/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async downloadPayrollDocument(employeeId: string, filename: string): Promise<Blob> {
    const response = await axios.get(`${API_URL}/verloning/download/${employeeId}/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async listPayrollDocuments(employeeId: string): Promise<string[]> {
    const response = await axios.get(`${API_URL}/verloning/download/${employeeId}`);
    return response.data;
  }

  // PDF Export
  async exportInvoicesToPDF(): Promise<Blob> {
    const response = await axios.get(`${API_URL}/pdf-export/facturen`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Helper function to download a blob as a file
  downloadBlobAsFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async getPayrollData(params: URLSearchParams): Promise<any> {
    const response = await axios.get(`${API_URL}/verloning/?${params.toString()}`);
    return response.data;
  }

  async exportPayrollData(periodId: number): Promise<Blob> {
    const response = await axios.get(`${API_URL}/verloning/export/${periodId}`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const invoiceService = new InvoiceService(); 