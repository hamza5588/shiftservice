import React, { useEffect, useState } from 'react';
import { PayrollEntry, PayrollPeriod } from '../../types/invoice';
import { invoiceService } from '../../services/invoiceService';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export const PayrollList: React.FC = () => {
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (periods.length > 0) {
      loadPayrollEntries();
    }
  }, [selectedYear, selectedPeriod, periods]);

  const loadPeriods = async () => {
    try {
      const data = await invoiceService.getPayrollPeriods();
      setPeriods(data);
    } catch (err) {
      console.error('Failed to load periods:', err);
    }
  };

  const loadPayrollEntries = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getPayrollEntries(selectedYear, selectedPeriod || undefined);
      setPayrollEntries(data);
    } catch (err) {
      setError('Failed to load payroll entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, employeeId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await invoiceService.uploadPayrollDocument(employeeId, file);
      await loadPayrollEntries();
    } catch (err) {
      console.error('Failed to upload payroll document:', err);
    }
  };

  const handleDownload = async (employeeId: string, filename: string) => {
    try {
      const blob = await invoiceService.downloadPayrollDocument(employeeId, filename);
      invoiceService.downloadBlobAsFile(blob, filename);
    } catch (err) {
      console.error('Failed to download payroll document:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payroll</CardTitle>
        <div className="flex gap-4">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedPeriod?.toString() || ''}
            onValueChange={(value) => setSelectedPeriod(value ? parseInt(value) : null)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Periods</SelectItem>
              {periods
                .filter((period) => period.year === selectedYear)
                .map((period) => (
                  <SelectItem key={period.id} value={period.period_number.toString()}>
                    Period {period.period_number}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead>Bonuses</TableHead>
              <TableHead>Allowances</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.employee_id}</TableCell>
                <TableCell>
                  {periods.find((p) => p.id === entry.period_id)?.period_number}
                </TableCell>
                <TableCell>{entry.total_hours}</TableCell>
                <TableCell>{formatCurrency(entry.base_salary)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p>Evening: {formatCurrency(entry.evening_bonus)}</p>
                    <p>Night: {formatCurrency(entry.night_bonus)}</p>
                    <p>Weekend: {formatCurrency(entry.weekend_bonus)}</p>
                    <p>Holiday: {formatCurrency(entry.holiday_bonus)}</p>
                    <p>New Year: {formatCurrency(entry.new_year_bonus)}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p>Phone: {formatCurrency(entry.phone_allowance)}</p>
                    <p>Meal: {formatCurrency(entry.meal_allowance)}</p>
                    <p>Travel: {formatCurrency(entry.travel_allowance)}</p>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(entry.total_amount)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, entry.employee_id)}
                      className="hidden"
                      id={`upload-${entry.id}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById(`upload-${entry.id}`)?.click()}
                    >
                      Upload Payslip
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const files = await invoiceService.listPayrollDocuments(entry.employee_id);
                        if (files.length === 1) {
                          handleDownload(entry.employee_id, files[0]);
                        } else if (files.length > 1) {
                          // Show a dialog to select which file to download
                          const selectedFile = window.prompt(
                            'Select file to download:\n' + files.join('\n')
                          );
                          if (selectedFile) {
                            handleDownload(entry.employee_id, selectedFile);
                          }
                        }
                      }}
                    >
                      Download Payslip
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}; 