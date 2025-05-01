import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { shiftsApi, locationsApi, clientsApi, employeesApi } from '@/lib/api';
import { Shift, Location, Opdrachtgever, Employee } from '@/lib/types';
import { format } from 'date-fns';

const EditShift = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Shift>>({});
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);

  // Fetch shift data
  const { data: shift, isLoading } = useQuery<Shift>({
    queryKey: ['shift', id],
    queryFn: () => shiftsApi.getById(Number(id)),
    enabled: !!id,
  });

  // Fetch locations, clients, and employees
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
  });

  const { data: clients = [] } = useQuery<Opdrachtgever[]>({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  // Update filtered locations when client changes
  useEffect(() => {
    if (formData.opdrachtgever_id) {
      const clientLocations = locations.filter(
        location => location.opdrachtgever_id === formData.opdrachtgever_id
      );
      setFilteredLocations(clientLocations);
    } else {
      setFilteredLocations([]);
    }
  }, [formData.opdrachtgever_id, locations]);

  // Initialize form data when shift is loaded
  useEffect(() => {
    if (shift) {
      setFormData({
        title: shift.title,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        location_id: shift.location_id,
        opdrachtgever_id: shift.opdrachtgever_id,
        employee_id: shift.employee_id,
        status: shift.status,
        required_profile: shift.required_profile,
      });
    }
  }, [shift]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Shift>) => shiftsApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      navigate('/calendar');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Format the time values properly and ensure required fields are not null
      const formattedData = {
        ...formData,
        start_time: formData.start_time || '',
        end_time: formData.end_time || '',
        shift_date: formData.shift_date ? new Date(formData.shift_date).toISOString().split('T')[0] : '',
        // Ensure required fields are not null
        title: formData.title || '',
        location_id: formData.location_id || 0,
        opdrachtgever_id: formData.opdrachtgever_id || 0,
        status: formData.status || 'open',
        required_profile: formData.required_profile || '',
        titel: formData.title || '',
        stad: formData.stad || '',
        provincie: formData.provincie || '',
        adres: formData.adres || ''
      };

      // Validate required fields
      if (!formattedData.shift_date || !formattedData.start_time || !formattedData.end_time) {
        alert('Please fill in all required fields: date, start time, and end time');
        return;
      }

      await updateMutation.mutateAsync(formattedData);
    } catch (error) {
      console.error('Error updating shift:', error);
      alert('Failed to update shift');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!shift) {
    return <div>Shift not found</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Shift</CardTitle>
          <CardDescription>Update shift details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift_date">Date</Label>
                <Input
                  id="shift_date"
                  type="date"
                  value={formData.shift_date?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time || ''}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time || ''}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                  value={formData.opdrachtgever_id?.toString()}
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      opdrachtgever_id: Number(value),
                      location_id: undefined // Reset location when client changes
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.naam}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.location_id?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, location_id: Number(value) })}
                  disabled={!formData.opdrachtgever_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.naam}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={formData.employee_id || 'unassigned'}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value === 'unassigned' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.username}>
                        {employee.naam}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'open'}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="required_profile">Required Profile</Label>
                <Input
                  id="required_profile"
                  value={formData.required_profile || ''}
                  onChange={(e) => setFormData({ ...formData, required_profile: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/calendar')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditShift; 