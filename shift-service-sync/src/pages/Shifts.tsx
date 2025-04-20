import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { shiftsApi, employeesApi } from '@/lib/api';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar as CalendarIcon,
  Clock,
  Plus, 
  Search, 
  Edit, 
  Trash,
  Loader2
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Shift } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission, Permissions } from '@/lib/permissions';

export default function Shifts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();
  const { user } = useAuth();

  const userRoles = user?.roles || [];
  const canCreateShifts = hasPermission(userRoles, Permissions.CREATE_SHIFTS);
  const canEditShifts = hasPermission(userRoles, Permissions.EDIT_SHIFTS);
  const canDeleteShifts = hasPermission(userRoles, Permissions.DELETE_SHIFTS);
  const canViewAllShifts = hasPermission(userRoles, Permissions.VIEW_SHIFTS);
  const canViewOwnShifts = hasPermission(userRoles, Permissions.VIEW_OWN_SHIFTS);

  // Query for shifts
  const { data: shiftsData, isLoading, refetch } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      try {
        const result = await shiftsApi.getAll();
        console.log('Fetched shifts:', result);
        return result;
      } catch (error) {
        console.error('Error fetching shifts:', error);
        return [];
      }
    },
  });

  // Transform the data to ensure it's always an array
  const shifts = Array.isArray(shiftsData) ? shiftsData : [];

  // Debug logging for shifts data
  React.useEffect(() => {
    console.log('Shifts data:', {
      totalShifts: shifts.length,
      shifts,
      userRoles,
      canViewAllShifts,
      canViewOwnShifts
    });
  }, [shifts, userRoles, canViewAllShifts, canViewOwnShifts]);

  // Mutation for deleting shifts
  const { mutate: deleteShift } = useMutation({
    mutationFn: shiftsApi.delete,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift deleted successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete shift",
        variant: "destructive",
      });
    },
  });

  // Query for employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const result = await employeesApi.getAll();
        // Filter to only show users with employee role
        return result.filter(employee => employee.roles?.includes('employee'));
      } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
      }
    },
  });

  // Log when employees data changes
  React.useEffect(() => {
    if (employees) {
      console.log('Employees data updated:', employees);
    }
  }, [employees]);

  const handleEdit = (shift: Shift) => {
    setSelectedShift(shift);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      deleteShift(parseInt(id));
    }
  };

  const filteredShifts = shifts.filter(shift => {
    // Filter by search query (match location or titel)
    const matchesSearch = searchQuery === '' || 
      (shift.location_details?.naam?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (shift.titel?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    // Filter by selected date
    const matchesDate = !selectedDate || 
      new Date(shift.shift_date).toDateString() === selectedDate.toDateString();
    
    // Filter by user permissions
    const matchesPermissions = canViewAllShifts || 
      (canViewOwnShifts && (
        // Show shift if:
        // 1. It's assigned to the current user
        shift.employee_id === user?.id ||
        // 2. It's an open shift (no employee assigned)
        (shift.status === 'open' && !shift.employee_id) ||
        // 3. It's assigned by admin
        shift.assigned_by_admin
      ));

    // Debug logging
    console.log('Shift filtering:', {
      id: shift.id,
      status: shift.status,
      employee_id: shift.employee_id,
      user_id: user?.id,
      assigned_by_admin: shift.assigned_by_admin,
      matchesSearch,
      matchesDate,
      matchesPermissions,
      canViewAllShifts,
      canViewOwnShifts
    });
    
    return matchesSearch && matchesDate && matchesPermissions;
  }) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Shift Planning</h1>
        
        {canCreateShifts && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Shift
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shifts..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal w-[240px]",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        {selectedDate && (
          <Button variant="ghost" onClick={() => setSelectedDate(undefined)}>
            Clear Filter
          </Button>
        )}
      </div>

      {/* Shifts Table */}
      <div className="bg-card rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Status</TableHead>
              {(canEditShifts || canDeleteShifts) && (
                <TableHead className="text-right">Actions</TableHead>
              )}
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
            ) : filteredShifts.length > 0 ? (
              filteredShifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    {new Date(shift.shift_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {shift.start_time} - {shift.end_time}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{shift.location_details?.naam}</div>
                    <div className="text-xs text-muted-foreground">{shift.stad}, {shift.provincie}</div>
                  </TableCell>
                  <TableCell>{shift.titel}</TableCell>
                  <TableCell>{shift.required_profile}</TableCell>
                  <TableCell>
                    <StatusBadge status={shift.status} />
                  </TableCell>
                  {(canEditShifts || canDeleteShifts) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {canEditShifts && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(shift)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteShifts && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => handleDelete(shift.id.toString())}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32">
                  No shifts found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Shift Dialog */}
      {canCreateShifts && (
        <AddShiftDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen} 
          onSuccess={() => refetch()}
        />
      )}

      {/* Edit Shift Dialog */}
      {canEditShifts && selectedShift && (
        <EditShiftDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => refetch()}
          shift={selectedShift}
        />
      )}
    </div>
  );
}

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AddShiftDialog({ open, onOpenChange, onSuccess }: AddShiftDialogProps) {
  const { toast } = useToast();
  const [shift, setShift] = useState<Partial<Shift>>({
    status: 'open',
    reiskilometers: 0
  });
  const [date, setDate] = useState<Date>();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // Query for employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const result = await employeesApi.getAll();
        // Filter to only show users with employee role
        return result.filter(employee => employee.roles?.includes('employee'));
      } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
      }
    },
  });

  // Query for clients (opdrachtgevers)
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/opdrachtgevers/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
  });

  // Query for locations based on selected client
  const { data: locations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const response = await fetch(`http://localhost:8000/locations/opdrachtgever/${selectedClientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    },
    enabled: !!selectedClientId,
  });

  // Mutation for creating shifts
  const { mutate: createShift, isPending: isCreating } = useMutation({
    mutationFn: async (newShift: Omit<Shift, 'id'>) => {
      return shiftsApi.create(newShift);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift created successfully",
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create shift",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!shift.shift_date || !shift.start_time || !shift.end_time || !shift.location_id || !shift.titel) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Format dates and times for API
    const formattedShift = {
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      location_id: shift.location_id,
      employee_id: shift.employee_id || null,
      status: shift.status || 'open',
      titel: shift.titel,
      stad: shift.stad,
      provincie: shift.provincie,
      adres: shift.adres,
      required_profile: shift.required_profile,
      reiskilometers: shift.reiskilometers || 0
    };

    // Submit to the API
    createShift(formattedShift as Omit<Shift, 'id'>);
  };

  const handleChange = (field: string, value: any) => {
    setShift(prev => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    // Reset location when client changes
    handleChange('location_id', '');
    setSelectedLocation(null);
  };

  const handleLocationChange = (locationId: string) => {
    const location = locations?.find((loc: any) => loc.id.toString() === locationId);
    setSelectedLocation(location);
    handleChange('location_id', parseInt(locationId));
    if (location) {
      handleChange('stad', location.stad);
      handleChange('provincie', location.provincie);
      handleChange('adres', location.adres);
    }
  };

  const handleEmployeeChange = (value: string) => {
    // Add 1 to the selected ID to match the correct employee
    const employeeId = value ? (parseInt(value) + 1).toString() : null;
    handleChange('employee_id', employeeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add New Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                onValueChange={handleClientChange}
                disabled={isLoadingClients}
              >
                <SelectTrigger id="client_id">
                  <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="location_id">Location *</Label>
              <Select
                onValueChange={handleLocationChange}
                disabled={isLoadingLocations || !selectedClientId}
              >
                <SelectTrigger id="location_id">
                  <SelectValue 
                    placeholder={
                      !selectedClientId 
                        ? "Select a client first" 
                        : isLoadingLocations 
                          ? "Loading locations..." 
                          : "Select a location"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((location: any) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.naam} - {location.stad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shift Date */}
            <div className="space-y-2">
              <Label htmlFor="shift_date">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="shift_date"
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => {
                      setDate(date);
                      if (date) {
                        handleChange('shift_date', format(date, 'yyyy-MM-dd'));
                      }
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Employee */}
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee</Label>
              <Select 
                onValueChange={handleEmployeeChange}
                disabled={isLoadingEmployees}
              >
                <SelectTrigger id="employee_id">
                  <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.full_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start_time"
                  type="time"
                  className="pl-9"
                  required
                  onChange={(e) => handleChange('start_time', e.target.value + ':00')}
                />
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end_time"
                  type="time"
                  className="pl-9"
                  required
                  onChange={(e) => handleChange('end_time', e.target.value + ':00')}
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="titel">Title *</Label>
              <Input
                id="titel"
                required
                onChange={(e) => handleChange('titel', e.target.value)}
              />
            </div>

            {/* Required Profile */}
            <div className="space-y-2">
              <Label htmlFor="required_profile">Required Profile</Label>
              <Select 
                onValueChange={(value) => handleChange('required_profile', value)}
              >
                <SelectTrigger id="required_profile">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue pass">Blue Pass</SelectItem>
                  <SelectItem value="green pass">Green Pass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="stad">City</Label>
              <Input
                id="stad"
                value={selectedLocation?.stad || ''}
                onChange={(e) => handleChange('stad', e.target.value)}
              />
            </div>

            {/* Province */}
            <div className="space-y-2">
              <Label htmlFor="provincie">Province</Label>
              <Input
                id="provincie"
                value={selectedLocation?.provincie || ''}
                onChange={(e) => handleChange('provincie', e.target.value)}
              />
            </div>

            {/* Address */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="adres">Address</Label>
              <Input
                id="adres"
                value={selectedLocation?.adres || ''}
                onChange={(e) => handleChange('adres', e.target.value)}
              />
            </div>

            {/* Travel Distance */}
            <div className="space-y-2">
              <Label htmlFor="reiskilometers">Travel Distance (km)</Label>
              <Input
                id="reiskilometers"
                type="number"
                min="0"
                onChange={(e) => handleChange('reiskilometers', parseInt(e.target.value))}
              />
            </div>

            <div className="sm:col-span-2 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Shift"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditShiftDialogProps extends Omit<AddShiftDialogProps, 'open'> {
  shift: Shift;
  open: boolean;
}

function EditShiftDialog({ open, onOpenChange, onSuccess, shift: initialShift }: EditShiftDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [shift, setShift] = useState<Shift>(initialShift);
  const [date, setDate] = useState<Date>(() => new Date(initialShift.shift_date));
  const canAssignEmployees = hasPermission(user?.roles || [], Permissions.ASSIGN_EMPLOYEES);

  // Query for employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const result = await employeesApi.getAll();
        console.log('Fetched employees:', result);
        return result;
      } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
      }
    },
  });

  // Log when employees data changes
  React.useEffect(() => {
    if (employees) {
      console.log('Employees data updated:', employees);
    }
  }, [employees]);

  // Mutation for updating shifts
  const { mutate: updateShift, isPending: isUpdating } = useMutation({
    mutationFn: (updatedShift: Shift) => shiftsApi.update(updatedShift.id, updatedShift),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift updated successfully",
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update shift",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!shift.shift_date || !shift.start_time || !shift.end_time || !shift.location || !shift.titel) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Submit to the API
    updateShift(shift);
  };

  const handleChange = (field: string, value: any) => {
    setShift(prev => ({ ...prev, [field]: value }));
  };

  const handleEmployeeChange = (value: string) => {
    // Add 1 to the selected ID to match the correct employee
    const employeeId = value ? (parseInt(value) + 1).toString() : null;
    handleChange('employee_id', employeeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" aria-describedby="edit-shift-description">
        <DialogHeader>
          <DialogTitle>Edit Shift</DialogTitle>
        </DialogHeader>
        <p id="edit-shift-description" className="sr-only">
          Form to edit an existing shift's details
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shift Date */}
            <div className="space-y-2">
              <Label htmlFor="shift_date">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="shift_date"
                    variant="outline" 
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => {
                      setDate(date);
                      if (date) {
                        handleChange('shift_date', format(date, 'yyyy-MM-dd'));
                      }
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Employee */}
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee</Label>
              <Select 
                onValueChange={handleEmployeeChange}
                disabled={isLoadingEmployees || !canAssignEmployees}
                value={shift.employee_id?.toString() || ''}
              >
                <SelectTrigger id="employee_id">
                  <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canAssignEmployees && (
                <p className="text-sm text-muted-foreground">
                  You don't have permission to assign employees
                </p>
              )}
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start_time"
                  type="time"
                  className="pl-9"
                  required
                  value={shift.start_time.slice(0, 5)}
                  onChange={(e) => handleChange('start_time', e.target.value + ':00')}
                />
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end_time"
                  type="time"
                  className="pl-9"
                  required
                  value={shift.end_time.slice(0, 5)}
                  onChange={(e) => handleChange('end_time', e.target.value + ':00')}
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="titel">Title *</Label>
              <Input
                id="titel"
                required
                value={shift.titel}
                onChange={(e) => handleChange('titel', e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                required
                value={shift.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="stad">City</Label>
              <Input
                id="stad"
                value={shift.stad}
                onChange={(e) => handleChange('stad', e.target.value)}
              />
            </div>

            {/* Province */}
            <div className="space-y-2">
              <Label htmlFor="provincie">Province</Label>
              <Input
                id="provincie"
                value={shift.provincie}
                onChange={(e) => handleChange('provincie', e.target.value)}
              />
            </div>

            {/* Address */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="adres">Address</Label>
              <Input
                id="adres"
                value={shift.adres}
                onChange={(e) => handleChange('adres', e.target.value)}
              />
            </div>

            {/* Required Profile */}
            <div className="space-y-2">
              <Label htmlFor="required_profile">Required Profile</Label>
              <Select 
                onValueChange={(value) => handleChange('required_profile', value)}
                value={shift.required_profile}
              >
                <SelectTrigger id="required_profile">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue pass">Blue Pass</SelectItem>
                  <SelectItem value="green pass">Green Pass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Travel Distance */}
            <div className="space-y-2">
              <Label htmlFor="reiskilometers">Travel Distance (km)</Label>
              <Input
                id="reiskilometers"
                type="number"
                min="0"
                value={shift.reiskilometers}
                onChange={(e) => handleChange('reiskilometers', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Shift
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
