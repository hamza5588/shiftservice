import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Filter, Search, X } from 'lucide-react';
import { format, parseISO, isBefore, isAfter, isToday } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { employeesApi, locationsApi, clientsApi, shiftsApi } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Shift, Employee, Location, Opdrachtgever } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';

const Calendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filters, setFilters] = useState({
    client: '',
    location: '',
    employee: '',
    dateRange: 'all' // 'all', 'past', 'present', 'future'
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all necessary data
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: shiftsApi.getAll,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
  });

  const { data: clients = [] } = useQuery<Opdrachtgever[]>({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });

  const queryClient = useQueryClient();

  // Filter shifts based on selected criteria
  const filteredShifts = shifts.filter((shift) => {
    const shiftDate = parseISO(shift.shift_date);
    const matchesDateRange = 
      filters.dateRange === 'all' ||
      (filters.dateRange === 'past' && isBefore(shiftDate, new Date())) ||
      (filters.dateRange === 'present' && isToday(shiftDate)) ||
      (filters.dateRange === 'future' && isAfter(shiftDate, new Date()));

    const matchesClient = filters.client === 'all' || 
      !filters.client || 
      shift.opdrachtgever_id?.toString() === filters.client;

    const matchesLocation = filters.location === 'all' || 
      !filters.location || 
      shift.location === filters.location;

    const matchesEmployee = filters.employee === 'all' || 
      !filters.employee || 
      shift.employee_id === filters.employee;

    const matchesSearch = !searchQuery || 
      shift.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDateRange && matchesClient && matchesLocation && 
           matchesEmployee && matchesSearch;
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const clearFilters = () => {
    setFilters({
      client: '',
      location: '',
      employee: '',
      dateRange: 'all'
    });
    setSearchQuery('');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Shift Calendar</CardTitle>
          <CardDescription>View and manage all shifts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Search shifts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                  <SelectItem value="present">Today</SelectItem>
                  <SelectItem value="future">Future</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.client}
                onValueChange={(value) => setFilters(prev => ({ ...prev, client: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.location}
                onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.naam}>
                      {location.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.employee}
                onValueChange={(value) => setFilters(prev => ({ ...prev, employee: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.username}>
                      {employee.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5" />
                <span className="font-medium">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleDateSelect(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDateSelect(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDateSelect(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                >
                  Next
                </Button>
              </div>
            </div>

            {/* Shifts List */}
            <div className="border rounded-lg p-4">
              {filteredShifts.length > 0 ? (
                <div className="space-y-4">
                  {filteredShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{shift.title}</h3>
                          <Badge variant={shift.status === 'approved' ? 'default' : 'secondary'}>
                            {shift.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          <p>{format(parseISO(shift.shift_date), 'EEEE, MMMM d, yyyy')}</p>
                          <p>{shift.start_time} - {shift.end_time}</p>
                        </div>
                        <div className="text-sm">
                          <p><strong>Location:</strong> {shift.location}</p>
                          {shift.location_details && (
                            <>
                              <p><strong>City:</strong> {shift.location_details.stad}</p>
                              <p><strong>Province:</strong> {shift.location_details.provincie}</p>
                              <p><strong>Address:</strong> {shift.location_details.adres}</p>
                            </>
                          )}
                          <p><strong>Employee:</strong> {shift.employee_id || 'Unassigned'}</p>
                          {shift.required_profile && <p><strong>Required Profile:</strong> {shift.required_profile}</p>}
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => navigate(`/shifts/${shift.id}`)}
                        >
                          View Details
                        </Button>
                        {user.roles.includes('admin') || user.roles.includes('planner') ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/shifts/${shift.id}/edit`)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this shift?')) {
                                  try {
                                    await shiftsApi.delete(shift.id);
                                    // Refresh the shifts list
                                    queryClient.invalidateQueries({ queryKey: ['shifts'] });
                                  } catch (error) {
                                    console.error('Error deleting shift:', error);
                                    alert('Failed to delete shift');
                                  }
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No shifts found matching the selected criteria
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar; 