import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    const searchLower = searchQuery.toLowerCase();
    return searchQuery === '' || 
      (employee.naam && employee.naam.toLowerCase().includes(searchLower)) ||
      (employee.email && employee.email.toLowerCase().includes(searchLower)) ||
      (employee.pas_type && employee.pas_type.toLowerCase().includes(searchLower));
  }) || [];

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteMutation.mutate(id);
    }
  };

  // Add debug logs
  React.useEffect(() => {
    console.log('Employees component mounted');
    console.log('Current employees data:', employees);
  }, [employees]);

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
        ) : employees && filteredEmployees.length > 0 ? (
          filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{employee.naam}</CardTitle>
                    <CardDescription>{employee.email}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (employee.id) {
                          navigate(`/employees/${employee.id}/view`);
                        }
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (employee.id) {
                          console.log('Edit employee:', employee.id);
                          navigate(`/employees/${employee.id}/edit`);
                        }
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (employee.id) {
                          handleDeleteEmployee(employee.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No employees found</p>
          </div>
        )}
      </div>
    </div>
  );
}
