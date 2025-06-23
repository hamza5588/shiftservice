import React, { useState, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';

// Add these interfaces at the top of the file, after the imports
interface Location {
  id: number;
  naam: string;
  stad: string;
  provincie?: string;
  adres?: string;
}

interface Client {
  id: number;
  naam: string;
}

interface Employee {
  id: number;
  username: string;
  naam?: string;
  voornaam?: string;
  achternaam?: string;
}

export default function Shifts() {
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

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
        console.log('Fetched employees:', result);
        // Remove the role filter since we want all employees
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
    // Filter by search query (match location or title)
    const matchesSearch = searchQuery === '' || 
      (shift.location_details?.stad?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (shift.title?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
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
        (shift.status === 'open' && !shift.employee_id)
      ));

    return matchesSearch && matchesDate && matchesPermissions;
  }) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Shift Planning</h1>
        
        <div className="flex gap-2">
          {canCreateShifts && (
            <>
              <Button onClick={() => setIsBulkDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Bulk Create
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Shift
              </Button>
            </>
          )}
        </div>
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
                    <div className="font-medium">{shift.location}</div>
                    <div className="text-xs text-muted-foreground">
                      {shift.location_details?.stad}, {shift.location_details?.provincie}
                    </div>
                  </TableCell>
                  <TableCell>{shift.title}</TableCell>
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

      {/* Bulk Create Dialog */}
      {canCreateShifts && (
        <BulkShiftDialog 
          open={isBulkDialogOpen} 
          onOpenChange={setIsBulkDialogOpen} 
          onSuccess={() => refetch()}
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
        console.log('Fetched employees:', result);
        // Remove the role filter since we want all employees
        return result;
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/opdrachtgevers/`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/locations/opdrachtgever/${selectedClientId}`, {
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
    
    // Debug log to see what values we have
    console.log('Current shift data:', shift);
    
    // Check each required field individually
    const missingFields = [];
    if (!shift.shift_date) missingFields.push('date');
    if (!shift.start_time) missingFields.push('start time');
    if (!shift.end_time) missingFields.push('end time');
    if (!shift.location_id) missingFields.push('location');
    if (!shift.title) missingFields.push('title');

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
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
      titel: shift.title,
      status: shift.status || 'open',
      employee_id: shift.employee_id || null,
      reiskilometers: shift.reiskilometers || 0,
      required_profile: shift.required_profile || null,
      stad: shift.stad || null,
      provincie: shift.provincie || null,
      adres: shift.adres || null
    };

    // Debug log to see what we're sending to the API
    console.log('Submitting shift data:', formattedShift);

    // Submit to the API
    createShift(formattedShift as Omit<Shift, 'id'>);
  };

  const handleChange = (field: string, value: any) => {
    console.log(`Updating field ${field} with value:`, value);
    setShift(prev => ({ ...prev, [field]: value }));
  };

  // Add useEffect to log shift state changes
  useEffect(() => {
    console.log('Shift state updated:', shift);
  }, [shift]);

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
    // Only auto-fill if the fields are empty
    if (location) {
      if (!shift.stad) handleChange('stad', location.stad || '');
      if (!shift.provincie) handleChange('provincie', location.provincie || '');
      if (!shift.adres) handleChange('adres', location.adres || '');
    }
  };

  const handleEmployeeChange = (value: string) => {
    console.log('Selected employee value:', value);
    // If "unassigned" is selected, set employee_id to null
    if (value === 'unassigned') {
      handleChange('employee_id', null);
    } else {
      // Find the employee in the list to get their username
      const selectedEmployee = employees?.find(emp => emp.username === value);
      console.log('Selected employee:', selectedEmployee);
      console.log('All employees:', employees);
      handleChange('employee_id', selectedEmployee?.username || null);
    }
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
                value={shift.employee_id === null ? 'unassigned' : shift.employee_id}
                onValueChange={handleEmployeeChange}
                disabled={isLoadingEmployees}
              >
                <SelectTrigger id="employee_id">
                  <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee"}>
                    {shift.employee_id ? 
                      employees?.find(emp => emp.username === shift.employee_id)?.naam || 'Unknown' 
                      : 'Unassigned'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.username}>
                      {employee.naam || `${employee.voornaam || ''} ${employee.achternaam || ''}`}
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
                  value={shift.start_time || ''}
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
                  value={shift.end_time || ''}
                  onChange={(e) => handleChange('end_time', e.target.value + ':00')}
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                required
                value={shift.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>

            {/* Required Profile */}
            <div className="space-y-2">
              <Label htmlFor="required_profile">Required Profile</Label>
              <Select 
                value={shift.required_profile || 'none'}
                onValueChange={(value) => handleChange('required_profile', value === 'none' ? null : value)}
              >
                <SelectTrigger id="required_profile">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="blue pass">Blue pass</SelectItem>
                  <SelectItem value="grey pass">Grey pass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="stad">City</Label>
              <Input
                id="stad"
                value={shift.stad || ''}
                onChange={(e) => handleChange('stad', e.target.value)}
              />
            </div>

            {/* Province */}
            <div className="space-y-2">
              <Label htmlFor="provincie">Province</Label>
              <Input
                id="provincie"
                value={shift.provincie || ''}
                onChange={(e) => handleChange('provincie', e.target.value)}
              />
            </div>

            {/* Address */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="adres">Address</Label>
              <Input
                id="adres"
                value={shift.adres || ''}
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
                value={shift.reiskilometers ?? 0}
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

interface EditShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  shift: Shift;
}

function EditShiftDialog({ open, onOpenChange, onSuccess, shift: initialShift }: EditShiftDialogProps) {
  const { toast } = useToast();
  const [shift, setShift] = useState<Shift>(initialShift);
  const [date, setDate] = useState<Date>(() => new Date(initialShift.shift_date));
  const [clientId, setClientId] = useState<string>('');
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Update selectedEmployeeId when initialShift changes
  useEffect(() => {
    console.log('Initial shift employee_id:', initialShift.employee_id);
    setSelectedEmployeeId(initialShift.employee_id || null);
  }, [initialShift]);

  // Query for employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const result = await employeesApi.getAll();
        console.log("employe are",result)
        console.log('Fetched employees for edit:', result);
        // Remove the role filter since we want all employees
        return result;
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/opdrachtgevers/`, {
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
    queryKey: ['locations', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const response = await fetch(`${import.meta.env.VITE_API_URL}/locations/opdrachtgever/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    },
    enabled: !!clientId,
  });

  // Update filtered locations when client changes
  useEffect(() => {
    if (clientId && locations) {
      setFilteredLocations(locations);
    } else {
      setFilteredLocations([]);
    }
  }, [clientId, locations]);

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
    if (!shift.shift_date || !shift.start_time || !shift.end_time || !shift.location_id || !shift.title) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (date, time, location, and title)",
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

  const handleClientChange = (value: string) => {
    setClientId(value);
    handleChange('opdrachtgever_id', Number(value));
    handleChange('location_id', undefined);
  };

  const handleLocationChange = (locationId: string) => {
    const location = locations?.find((loc: Location) => loc.id.toString() === locationId);
    handleChange('location_id', Number(locationId));
    if (location) {
      handleChange('location', location.naam);
      handleChange('location_details', {
        id: location.id,
        naam: location.naam,
        adres: location.adres || '',
        stad: location.stad,
        provincie: location.provincie || ''
      });
    }
  };

  const handleEmployeeChange = (value: string) => {
    console.log('Selected employee value:', value);
    // If "unassigned" is selected, set employee_id to null
    if (value === 'unassigned') {
      handleChange('employee_id', null);
    } else {
      // Find the employee in the list to get their username
      const selectedEmployee = employees?.find(emp => emp.username === value);
      console.log('Selected employee:', selectedEmployee);
      console.log('All employees:', employees);
      handleChange('employee_id', selectedEmployee?.username || null);
    }
  };

  // Debug log for employee selection
  useEffect(() => {
    console.log('Current selectedEmployeeId:', selectedEmployeeId);
    console.log('Current shift employee_id:', shift.employee_id);
    console.log('Available employees:', employees);
  }, [selectedEmployeeId, shift.employee_id, employees]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={clientId}
                onValueChange={handleClientChange}
                disabled={isLoadingClients}
              >
                <SelectTrigger id="client_id">
                  <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: Client) => (
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
                value={shift.location_id?.toString()}
                onValueChange={handleLocationChange}
                disabled={isLoadingLocations || !clientId}
              >
                <SelectTrigger id="location_id">
                  <SelectValue 
                    placeholder={
                      !clientId 
                        ? "Select a client first" 
                        : isLoadingLocations 
                          ? "Loading locations..." 
                          : "Select a location"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocations.map((location) => (
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
                value={shift.employee_id === null ? 'unassigned' : shift.employee_id}
                onValueChange={handleEmployeeChange}
                disabled={isLoadingEmployees}
              >
                <SelectTrigger id="employee_id">
                  <SelectValue placeholder={isLoadingEmployees ? "Loading..." : "Select employee"}>
                    {shift.employee_id ? 
                      employees?.find(emp => emp.username === shift.employee_id)?.naam || 'Unknown' 
                      : 'Unassigned'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.username}>
                      {employee.naam || `${employee.voornaam || ''} ${employee.achternaam || ''}`}
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
                  value={shift.start_time || ''}
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
                  value={shift.end_time || ''}
                  onChange={(e) => handleChange('end_time', e.target.value + ':00')}
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                required
                value={shift.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>

            {/* Required Profile */}
            <div className="space-y-2">
              <Label htmlFor="required_profile">Required Profile</Label>
              <Select 
                value={shift.required_profile || 'none'}
                onValueChange={(value) => handleChange('required_profile', value === 'none' ? null : value)}
              >
                <SelectTrigger id="required_profile">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="blue pass">Blue pass</SelectItem>
                  <SelectItem value="grey pass">Grey pass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={shift.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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

interface BulkShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function BulkShiftDialog({ open, onOpenChange, onSuccess }: BulkShiftDialogProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [numEmployees, setNumEmployees] = useState<number>(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // Default all days selected
  const [shiftDetails, setShiftDetails] = useState({
    start_time: '',
    end_time: '',
    title: '',
    required_profile: '',
    reiskilometers: 0
  });

  const daysOfWeek = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' }
  ];

  // Query for employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
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

  // Query for clients
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/opdrachtgevers/`, {
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

  // Query for locations
  const { data: locations, isLoading: isLoadingLocations } = useQuery<Location[]>({
    queryKey: ['locations', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const response = await fetch(`${import.meta.env.VITE_API_URL}/locations/opdrachtgever/${selectedClientId}`, {
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

  // Calculate total shifts to be created
  const totalShifts = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    
    let days = 0;
    let currentDate = startDate;
    while (currentDate <= endDate) {
      if (selectedDays.includes(currentDate.getDay())) {
        days++;
      }
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }
    
    return days * numEmployees;
  }, [startDate, endDate, numEmployees, selectedDays]);

  // Mutation for creating bulk shifts
  const { mutate: createBulkShifts, isPending: isCreating } = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/planning/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to create bulk shifts');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bulk shifts created successfully",
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bulk shifts",
        variant: "destructive",
      });
    },
  });

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !shiftDetails.start_time || !shiftDetails.end_time || 
        !selectedClientId || !selectedLocation || numEmployees < 1 || selectedDays.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and select at least one day",
        variant: "destructive",
      });
      return;
    }

    const data = {
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      start_time: shiftDetails.start_time,
      end_time: shiftDetails.end_time,
      location_id: selectedLocation.id,
      num_employees: numEmployees,
      selected_days: selectedDays,
      title: shiftDetails.title,
      required_profile: shiftDetails.required_profile,
      reiskilometers: shiftDetails.reiskilometers
    };

    createBulkShifts(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Bulk Create Shifts</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Range */}
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  className="pl-9"
                  value={shiftDetails.start_time}
                  onChange={(e) => setShiftDetails(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  className="pl-9"
                  value={shiftDetails.end_time}
                  onChange={(e) => setShiftDetails(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            {/* Days Selection */}
            <div className="sm:col-span-2 space-y-2">
              <Label>Select Days *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {daysOfWeek.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`day-${day.value}`}
                      checked={selectedDays.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`day-${day.value}`} className="text-sm">
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Number of Employees */}
            <div className="space-y-2">
              <Label>Number of Employees Needed *</Label>
              <Input
                type="number"
                min="1"
                value={numEmployees}
                onChange={(e) => setNumEmployees(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full"
              />
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                disabled={isLoadingClients}
              >
                <SelectTrigger>
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
              <Label>Location *</Label>
              <Select
                value={selectedLocation?.id?.toString()}
                onValueChange={(value) => {
                  const location = locations?.find((loc: any) => loc.id.toString() === value);
                  setSelectedLocation(location);
                }}
                disabled={isLoadingLocations || !selectedClientId}
              >
                <SelectTrigger>
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

            {/* Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={shiftDetails.title}
                onChange={(e) => setShiftDetails(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Shift title"
              />
            </div>

            {/* Required Profile */}
            <div className="space-y-2">
              <Label>Required Profile</Label>
              <Select 
                value={shiftDetails.required_profile}
                onValueChange={(value) => setShiftDetails(prev => ({ ...prev, required_profile: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue pass">Blue pass</SelectItem>
                  <SelectItem value="grey pass">Grey pass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Travel Distance */}
            <div className="space-y-2">
              <Label>Travel Distance (km)</Label>
              <Input
                type="number"
                min="0"
                value={shiftDetails.reiskilometers}
                onChange={(e) => setShiftDetails(prev => ({ ...prev, reiskilometers: parseFloat(e.target.value) }))}
              />
            </div>

            {/* Summary */}
            <div className="sm:col-span-2 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Summary</h4>
              <p>Total shifts to be created: {totalShifts}</p>
              {startDate && endDate && (
                <p>Date range: {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</p>
              )}
              <p>Selected days: {selectedDays.map(d => daysOfWeek[d].label).join(', ')}</p>
              <p>Employees needed per selected day: {numEmployees}</p>
            </div>

            <div className="sm:col-span-2 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Shifts"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
