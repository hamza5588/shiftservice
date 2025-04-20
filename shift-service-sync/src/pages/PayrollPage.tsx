import React from 'react';
import { PayrollDashboard } from '../components/payroll/PayrollDashboard';

export const PayrollPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Payroll Management</h1>
      <PayrollDashboard />
    </div>
  );
}; 