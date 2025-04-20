import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Phone, Mail, User, Pencil, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Employee } from '@/lib/types';

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for employees
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  // Log the data when it changes
  React.useEffect(() => {
    if (employees) {
      console.log('Employees data fetched successfully:', employees);
    }
    if (error) {
      console.error('Error fetching employees:', error);
    }
  }, [employees, error]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Employee> }) => 
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = employees?.filter(employee => {
    return searchQuery === '' || 
      employee.naam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.pas_type || '').toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const handleUpdateEmployee = (formData: FormData) => {
    if (!selectedEmployee) return;
    
    const updatedEmployee = {
      naam: formData.get('name') as string,
      email: formData.get('email') as string,
      telefoon: formData.get('phone') as string,
      pas_type: formData.get('passType') as string,
      adres: formData.get('address') as string,
    };
    
    updateMutation.mutate({ 
      id: selectedEmployee.id.toString(), 
      data: updatedEmployee 
    });
  };

  const handleDeleteEmployee = (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteMutation.mutate(id.toString());
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Employees</h1>
        <div className="text-sm text-muted-foreground">
          Employees are created through the User Management system
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          // Loading state
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-5 bg-muted rounded"></div>
                  <div className="h-5 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredEmployees.length > 0 ? (
          filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  {employee.naam}
                  <Badge variant="outline" className="bg-secufy-50 text-secufy-800">
                    {employee.pas_type || 'No Pass Type'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{employee.email}</span>
                  </li>
                  {employee.telefoon && (
                    <li className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{employee.telefoon}</span>
                    </li>
                  )}
                </ul>
                <div className="mt-4 flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteEmployee(employee.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No employees found</p>
          </div>
        )}
      </div>

      {/* View Employee Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="font-medium">Name</label>
                <p>{selectedEmployee.naam}</p>
              </div>
              <div className="grid gap-2">
                <label className="font-medium">Email</label>
                <p>{selectedEmployee.email}</p>
              </div>
              {selectedEmployee.telefoon && (
                <div className="grid gap-2">
                  <label className="font-medium">Phone</label>
                  <p>{selectedEmployee.telefoon}</p>
                </div>
              )}
              {selectedEmployee.pas_type && (
                <div className="grid gap-2">
                  <label className="font-medium">Pass Type</label>
                  <p>{selectedEmployee.pas_type}</p>
                </div>
              )}
              {selectedEmployee.adres && (
                <div className="grid gap-2">
                  <label className="font-medium">Address</label>
                  <p>{selectedEmployee.adres}</p>
                </div>
              )}
              {selectedEmployee.geboortedatum && (
                <div className="grid gap-2">
                  <label className="font-medium">Date of Birth</label>
                  <p>{new Date(selectedEmployee.geboortedatum).toLocaleDateString()}</p>
                </div>
              )}
              {selectedEmployee.in_dienst && (
                <div className="grid gap-2">
                  <label className="font-medium">Start Date</label>
                  <p>{new Date(selectedEmployee.in_dienst).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee details below.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateEmployee(new FormData(e.currentTarget));
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name">Name</label>
                  <Input id="name" name="name" defaultValue={selectedEmployee.naam} required />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="email">Email</label>
                  <Input id="email" name="email" type="email" defaultValue={selectedEmployee.email} required />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="phone">Phone</label>
                  <Input id="phone" name="phone" type="tel" defaultValue={selectedEmployee.telefoon || ''} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="passType">Pass Type</label>
                  <Input id="passType" name="passType" defaultValue={selectedEmployee.pas_type || ''} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="address">Address</label>
                  <Input id="address" name="address" defaultValue={selectedEmployee.adres || ''} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Employee"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
