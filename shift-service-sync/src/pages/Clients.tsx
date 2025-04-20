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
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

interface Opdrachtgever {
  id: number;
  naam: string;
  bedrijfsnaam: string;
  kvk_nummer: string;
  adres: string;
  postcode: string;
  stad: string;
  telefoon: string;
  email: string;
}

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Opdrachtgever[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Opdrachtgever | null>(null);
  const [formData, setFormData] = useState({
    naam: '',
    bedrijfsnaam: '',
    kvk_nummer: '',
    adres: '',
    postcode: '',
    stad: '',
    telefoon: '',
    email: '',
  });

  useEffect(() => {
    if (!user || !user.roles.includes('admin')) {
      navigate('/');
      return;
    }
    fetchClients();
  }, [user, navigate]);

  const fetchClients = async () => {
    try {
      const response = await fetch('http://localhost:8000/opdrachtgevers/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedClient
        ? `http://localhost:8000/opdrachtgevers/${selectedClient.id}`
        : 'http://localhost:8000/opdrachtgevers/';
      const method = selectedClient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save client');

      toast.success(
        selectedClient ? 'Client updated successfully' : 'Client created successfully'
      );
      setIsDialogOpen(false);
      fetchClients();
      resetForm();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;

    try {
      const response = await fetch(`http://localhost:8000/opdrachtgevers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete client');

      toast.success('Client deleted successfully');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  const handleEdit = (client: Opdrachtgever) => {
    setSelectedClient(client);
    setFormData({
      naam: client.naam,
      bedrijfsnaam: client.bedrijfsnaam,
      kvk_nummer: client.kvk_nummer,
      adres: client.adres,
      postcode: client.postcode,
      stad: client.stad,
      telefoon: client.telefoon,
      email: client.email,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedClient(null);
    setFormData({
      naam: '',
      bedrijfsnaam: '',
      kvk_nummer: '',
      adres: '',
      postcode: '',
      stad: '',
      telefoon: '',
      email: '',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>Add Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedClient ? 'Edit Client' : 'Add New Client'}
              </DialogTitle>
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
                <Label htmlFor="bedrijfsnaam">Company Name</Label>
                <Input
                  id="bedrijfsnaam"
                  value={formData.bedrijfsnaam}
                  onChange={(e) =>
                    setFormData({ ...formData, bedrijfsnaam: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kvk_nummer">KVK Number</Label>
                <Input
                  id="kvk_nummer"
                  value={formData.kvk_nummer}
                  onChange={(e) =>
                    setFormData({ ...formData, kvk_nummer: e.target.value })
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
                <Label htmlFor="telefoon">Phone</Label>
                <Input
                  id="telefoon"
                  value={formData.telefoon}
                  onChange={(e) =>
                    setFormData({ ...formData, telefoon: e.target.value })
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
                  required
                />
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
                  {selectedClient ? 'Update' : 'Create'}
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
            <TableHead>Company Name</TableHead>
            <TableHead>KVK Number</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Postal Code</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>{client.naam}</TableCell>
              <TableCell>{client.bedrijfsnaam}</TableCell>
              <TableCell>{client.kvk_nummer}</TableCell>
              <TableCell>{client.adres}</TableCell>
              <TableCell>{client.postcode}</TableCell>
              <TableCell>{client.stad}</TableCell>
              <TableCell>{client.telefoon}</TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(client)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(client.id)}
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