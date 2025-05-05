import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";

export default function ViewEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Query for employee details
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => {
      if (!id || id === 'undefined') {
        throw new Error('Employee ID is required');
      }
      return employeesApi.getById(id);
    },
    enabled: !!id && id !== 'undefined',
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch employee details",
        variant: "destructive",
      });
    }
  });

  if (!id || id === 'undefined') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title m-0">Error</h1>
          <Button variant="outline" onClick={() => navigate('/employees')}>
            Back to Employees
          </Button>
        </div>
        <div className="text-red-500">Employee ID is required</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title m-0">Loading...</h1>
          <Button variant="outline" onClick={() => navigate('/employees')}>
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title m-0">Error</h1>
          <Button variant="outline" onClick={() => navigate('/employees')}>
            Back to Employees
          </Button>
        </div>
        <div className="text-red-500">Failed to load employee details. Please try again later.</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title m-0">Error</h1>
          <Button variant="outline" onClick={() => navigate('/employees')}>
            Back to Employees
          </Button>
        </div>
        <div className="text-red-500">Employee not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Employee Details</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate(`/employees/${id}/edit`)}>
            Edit Employee
          </Button>
          <Button variant="outline" onClick={() => navigate('/employees')}>
            Back to Employees
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Full Name</label>
              <p className="text-lg">{employee.naam}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">First Names</label>
              <p className="text-lg">{employee.voornaam}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Surname Prefix</label>
              <p className="text-lg">{employee.tussenvoegsel || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Surname</label>
              <p className="text-lg">{employee.achternaam}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Initials</label>
              <p className="text-lg">{employee.initialen}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Email</label>
              <p className="text-lg">{employee.email}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Phone</label>
              <p className="text-lg">{employee.telefoon || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Gender</label>
              <p className="text-lg">{employee.geslacht || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Marital Status</label>
              <p className="text-lg">{employee.burgerlijke_staat || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">BSN Number</label>
              <p className="text-lg">{employee.bsn || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Nationality</label>
              <p className="text-lg">{employee.nationaliteit || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Address</label>
              <p className="text-lg">{employee.adres || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">House Number</label>
              <p className="text-lg">
                {employee.huisnummer || '-'}
                {employee.huisnummer_toevoeging && ` ${employee.huisnummer_toevoeging}`}
              </p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Postal Code</label>
              <p className="text-lg">{employee.postcode || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">City</label>
              <p className="text-lg">{employee.stad || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Pass Type</label>
              <p className="text-lg">{employee.pas_type || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Pass Number</label>
              <p className="text-lg">{employee.pas_nummer || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Pass Expiry Date</label>
              <p className="text-lg">
                {employee.pas_vervaldatum ? new Date(employee.pas_vervaldatum).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Contract Type</label>
              <p className="text-lg">{employee.contract_type || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Contract Hours</label>
              <p className="text-lg">{employee.contract_uren ? `${employee.contract_uren} hours` : '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Contract Expiry</label>
              <p className="text-lg">
                {employee.contract_vervaldatum ? new Date(employee.contract_vervaldatum).toLocaleDateString() : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Important Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Important Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Date of Birth</label>
              <p className="text-lg">
                {employee.geboortedatum ? new Date(employee.geboortedatum).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Place of Birth</label>
              <p className="text-lg">{employee.geboorteplaats || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">Start Date</label>
              <p className="text-lg">
                {employee.in_dienst ? new Date(employee.in_dienst).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm text-muted-foreground">End Date</label>
              <p className="text-lg">
                {employee.uit_dienst ? new Date(employee.uit_dienst).toLocaleDateString() : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 