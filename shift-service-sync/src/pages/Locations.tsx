import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

interface Location {
  id: number;
  naam: string;
  adres: string;
  stad: string;
  postcode: string;
  email: string;
  opdrachtgever_id: number;
}

interface Opdrachtgever {
  id: number;
  naam: string;
}

export default function Locations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [opdrachtgevers, setOpdrachtgevers] = useState<Opdrachtgever[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    naam: '',
    adres: '',
    stad: '',
    postcode: '',
    email: '',
    opdrachtgever_id: '',
  });

  useEffect(() => {
    if (!user || !user.roles.includes('admin')) {
      navigate('/');
      return;
    }
    fetchLocations();
    fetchOpdrachtgevers();
  }, [user, navigate]);

  const fetchLocations = async () => {
    try {
      const response = await fetch('http://localhost:8000/locations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Location fetch error:', errorData);
        throw new Error(`Failed to fetch locations: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched locations:', data);
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const fetchOpdrachtgevers = async () => {
    try {
      const response = await fetch('http://localhost:8000/opdrachtgevers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Opdrachtgever fetch error:', errorData);
        throw new Error(`Failed to fetch opdrachtgevers: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched opdrachtgevers:', data);
      setOpdrachtgevers(data);
    } catch (error) {
      console.error('Error fetching opdrachtgevers:', error);
      toast.error('Failed to load opdrachtgevers');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedLocation
        ? `http://localhost:8000/locations/${selectedLocation.id}`
        : 'http://localhost:8000/locations';
      const method = selectedLocation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          opdrachtgever_id: parseInt(formData.opdrachtgever_id),
        }),
      });

      if (!response.ok) throw new Error('Failed to save location');

      toast.success(
        selectedLocation ? 'Location updated successfully' : 'Location created successfully'
      );
      setIsDialogOpen(false);
      fetchLocations();
      resetForm();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;

    try {
      const response = await fetch(`http://localhost:8000/locations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete location');

      toast.success('Location deleted successfully');
      fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    }
  };

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setFormData({
      naam: location.naam,
      adres: location.adres,
      stad: location.stad,
      postcode: location.postcode,
      email: location.email,
      opdrachtgever_id: location.opdrachtgever_id.toString(),
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedLocation(null);
    setFormData({
      naam: '',
      adres: '',
      stad: '',
      postcode: '',
      email: '',
      opdrachtgever_id: '',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Locations Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>Add Location</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedLocation ? 'Edit Location' : 'Add New Location'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {selectedLocation ? 'Update the location details below.' : 'Fill in the details to create a new location.'}
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="naam">Name</Label>
                <Input
                  id="naam"
                  value={formData.naam}
                  onChange={(e) =>
                    setFormData({ ...formData, naam: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adres">Address</Label>
                <Input
                  id="adres"
                  value={formData.adres}
                  onChange={(e) =>
                    setFormData({ ...formData, adres: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stad">City</Label>
                <Input
                  id="stad"
                  value={formData.stad}
                  onChange={(e) =>
                    setFormData({ ...formData, stad: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postal Code</Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) =>
                    setFormData({ ...formData, postcode: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opdrachtgever">Client</Label>
                <Select
                  value={formData.opdrachtgever_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, opdrachtgever_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {opdrachtgevers.map((opdrachtgever) => (
                      <SelectItem
                        key={opdrachtgever.id}
                        value={opdrachtgever.id.toString()}
                      >
                        {opdrachtgever.naam}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedLocation ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Postal Code</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell>{location.naam}</TableCell>
              <TableCell>{location.adres}</TableCell>
              <TableCell>{location.stad}</TableCell>
              <TableCell>{location.postcode}</TableCell>
              <TableCell>{location.email}</TableCell>
              <TableCell>
                {
                  opdrachtgevers.find(
                    (op) => op.id === location.opdrachtgever_id
                  )?.naam
                }
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(location)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(location.id)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 