import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { payrollService, PayrollPeriod } from '../../services/payrollService';
import { formatCurrency } from '../../lib/utils';

export const PayrollDashboard: React.FC = () => {
  const [payrollData, setPayrollData] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadPayrollData();
  }, [selectedYear]);

  const loadPayrollData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await payrollService.getPayrollData(selectedYear);
      setPayrollData(data);
    } catch (err) {
      setError('Failed to load payroll data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await payrollService.exportPayrollData(selectedYear);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export payroll data:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payroll Dashboard</h2>
        <div className="flex gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border rounded px-2 py-1"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button onClick={handleExport}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {payrollData.map((period) => (
          <Card key={period.period}>
            <CardHeader>
              <CardTitle>Period {period.period}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span>{new Date(period.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>End Date:</span>
                  <span>{new Date(period.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hours:</span>
                  <span>{period.hours}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Rate:</span>
                  <span>{formatCurrency(period.base_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Travel Costs:</span>
                  <span>{formatCurrency(period.travel_costs)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(period.total_amount)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold">Allowances:</h4>
                  <div className="flex justify-between">
                    <span>Telephone:</span>
                    <span>{formatCurrency(period.allowances.telephone)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Meal:</span>
                    <span>{formatCurrency(period.allowances.meal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>De-minimis:</span>
                    <span>{formatCurrency(period.allowances.de_minimis)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WKR:</span>
                    <span>{formatCurrency(period.allowances.wkr)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}; 