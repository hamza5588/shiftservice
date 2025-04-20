import axios from 'axios';
import { API_URL } from '../config/api';

export interface PayrollPeriod {
  period: number;
  start_date: string;
  end_date: string;
  hours: number;
  base_rate: number;
  total_amount: number;
  travel_costs: number;
  allowances: {
    telephone: number;
    meal: number;
    de_minimis: number;
    wkr: number;
  };
}

export interface PayrollDocument {
  filename: string;
  upload_date: string;
  employee_id: number;
}

class PayrollService {
  async getPayrollData(year: number): Promise<PayrollPeriod[]> {
    const response = await axios.get(`${API_URL}/verloning?year=${year}`);
    return response.data;
  }

  async exportPayrollData(year: number): Promise<Blob> {
    const response = await axios.get(`${API_URL}/verloning/export?year=${year}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async uploadPayrollDocument(employeeId: number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('employee_id', employeeId.toString());
    formData.append('file', file);
    
    await axios.post(`${API_URL}/verloning/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  async listPayrollDocuments(employeeId: number): Promise<PayrollDocument[]> {
    const response = await axios.get(`${API_URL}/verloning/uploads?employee_id=${employeeId}`);
    return response.data;
  }

  async downloadPayrollDocument(employeeId: number, filename?: string): Promise<Blob> {
    const url = filename 
      ? `${API_URL}/verloning/download/${employeeId}/${filename}`
      : `${API_URL}/verloning/download/${employeeId}`;
    
    const response = await axios.get(url, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const payrollService = new PayrollService(); 