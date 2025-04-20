import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Download, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Payroll() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'all'>('all');

  // Query for payroll data
  const { data: payrollData, isLoading } = useQuery({
    queryKey: ['payroll', selectedYear],
    queryFn: () => payrollApi.getAll(selectedYear),
  });

  // Filter by period if needed
  const filteredPayroll = payrollData?.filter(entry => {
    if (selectedPeriod === 'all') return true;
    return entry.period === selectedPeriod;
  }) || [];

  // Group by employee for summarized view
  const payrollByEmployee = filteredPayroll.reduce((acc, entry) => {
    if (!acc[entry.employee_id]) {
      acc[entry.employee_id] = {
        employee_id: entry.employee_id,
        employee_name: entry.employee_name,
        total_hours: 0,
        total_base_salary: 0,
        total_meal_allowance: 0,
        total_phone_allowance: 0,
        total_travel_allowance: 0,
        total_compensation: 0,
      };
    }
    
    acc[entry.employee_id].total_hours += entry.hours_worked;
    acc[entry.employee_id].total_base_salary += entry.base_salary;
    acc[entry.employee_id].total_meal_allowance += entry.meal_allowance;
    acc[entry.employee_id].total_phone_allowance += entry.phone_allowance;
    acc[entry.employee_id].total_travel_allowance += entry.travel_allowance;
    acc[entry.employee_id].total_compensation += entry.total_compensation;
    
    return acc;
  }, {} as Record<string, any>);

  // Calculate totals
  const totals = Object.values(payrollByEmployee).reduce(
    (acc, employee) => {
      acc.hours += employee.total_hours;
      acc.base_salary += employee.total_base_salary;
      acc.meal_allowance += employee.total_meal_allowance;
      acc.phone_allowance += employee.total_phone_allowance;
      acc.travel_allowance += employee.total_travel_allowance;
      acc.compensation += employee.total_compensation;
      return acc;
    },
    { hours: 0, base_salary: 0, meal_allowance: 0, phone_allowance: 0, travel_allowance: 0, compensation: 0 }
  );

  // Handle export
  const handleExport = async () => {
    try {
      const csvData = await payrollApi.export(selectedYear);
      
      // In a real app, this would download the CSV file
      // For now, we'll just log to console
      console.log('Exporting CSV:', csvData);
      
      // Mock download by creating a blob and downloading it
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${selectedYear}-${selectedPeriod === 'all' ? 'all-periods' : `period-${selectedPeriod}`}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export payroll:', error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Payroll Management</h1>
        
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="w-36">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-44">
            <Select
              value={selectedPeriod.toString()}
              onValueChange={(value) => setSelectedPeriod(value === 'all' ? 'all' : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {[...Array(13)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Period {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-card rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Base Salary (€)</TableHead>
              <TableHead className="text-right">Meal (€)</TableHead>
              <TableHead className="text-right">Phone (€)</TableHead>
              <TableHead className="text-right">Travel (€)</TableHead>
              <TableHead className="text-right">Total (€)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading state
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-5 bg-muted animate-pulse rounded"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : Object.values(payrollByEmployee).length > 0 ? (
              <>
                {Object.values(payrollByEmployee).map((employee) => (
                  <TableRow key={employee.employee_id}>
                    <TableCell>{employee.employee_name}</TableCell>
                    <TableCell className="text-right">{employee.total_hours}</TableCell>
                    <TableCell className="text-right">
                      {employee.total_base_salary.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {employee.total_meal_allowance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {employee.total_phone_allowance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {employee.total_travel_allowance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {employee.total_compensation.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Totals</TableCell>
                  <TableCell className="text-right font-bold">{totals.hours}</TableCell>
                  <TableCell className="text-right font-bold">{totals.base_salary.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">{totals.meal_allowance.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">{totals.phone_allowance.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">{totals.travel_allowance.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">{totals.compensation.toFixed(2)}</TableCell>
                </TableRow>
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32">
                  No payroll data found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          * Payroll data is calculated based on shifts worked in the selected period.
          Fixed allowances are distributed per period according to employee profiles.
        </p>
      </div>
    </div>
  );
}
