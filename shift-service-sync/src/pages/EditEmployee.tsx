import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import { Employee } from '@/lib/types';

export default function EditEmployee() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Employee>>({});

  // Add validation for ID
  useEffect(() => {
    if (!id) {
      toast({
        title: "Error",
        description: "Employee ID is required",
        variant: "destructive",
      });
      navigate('/employees');
    }
  }, [id, navigate, toast]);

  // Add debug logs
  React.useEffect(() => {
    console.log('EditEmployee component mounted');
    console.log('Employee ID from params:', id);
  }, [id]);

  // Query for employee details
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Employee ID is required');
      }
      try {
        console.log('Fetching employee with ID:', id);
        const data = await employeesApi.getById(id);
        console.log('Raw API Response:', data);
        return data;
      } catch (error) {
        console.error('Error fetching employee:', error);
        throw error;
      }
    },
    enabled: !!id,
  });

  // Update form data when employee data is loaded
  useEffect(() => {
    if (employee) {
      console.log('Setting form data with:', employee);
      
      // Initialize form data with proper fallbacks
      setFormData({
        employee_id: employee.id,
        personeelsnummer: employee.personeelsnummer || 0,
        naam: employee.naam || '',
        voornaam: employee.voornaam || '',
        tussenvoegsel: employee.tussenvoegsel || '',
        achternaam: employee.achternaam || '',
        initialen: employee.initialen || '',
        email: employee.email || '',
        telefoon: employee.telefoon || '',
        adres: employee.adres || '',
        huisnummer: employee.huisnummer || '',
        huisnummer_toevoeging: employee.huisnummer_toevoeging || '',
        postcode: employee.postcode || '',
        stad: employee.stad || '',
        geboortedatum: employee.geboortedatum || '',
        geboorteplaats: employee.geboorteplaats || '',
        geslacht: employee.geslacht || '',
        burgerlijke_staat: employee.burgerlijke_staat || '',
        bsn: employee.bsn || '',
        nationaliteit: employee.nationaliteit || '',
        in_dienst: employee.in_dienst || '',
        uit_dienst: employee.uit_dienst || '',
        pas_type: employee.pas_type || '',
        pas_nummer: employee.pas_nummer || '',
        pas_vervaldatum: employee.pas_vervaldatum || '',
        contract_type: employee.contract_type || '',
        contract_uren: employee.contract_uren || 0,
        contract_vervaldatum: employee.contract_vervaldatum || '',
        uurloner: employee.uurloner || false,
        telefoonvergoeding_per_uur: employee.telefoonvergoeding_per_uur || 0,
        maaltijdvergoeding_per_uur: employee.maaltijdvergoeding_per_uur || 0,
        de_minimis_bonus_per_uur: employee.de_minimis_bonus_per_uur || 0,
        wkr_toeslag_per_uur: employee.wkr_toeslag_per_uur || 0,
        kilometervergoeding: employee.kilometervergoeding || 0,
        max_km: employee.max_km || 0,
        hourly_allowance: employee.hourly_allowance || 0
      });
    }
  }, [employee]);

  // Log form data changes
  useEffect(() => {
    console.log('Current form data:', formData);
  }, [formData]);

  // Add more detailed debug logging for employee data
  React.useEffect(() => {
    if (employee) {
      console.log('Employee data received:', {
        naam: employee.naam,
        voornaam: employee.voornaam,
        tussenvoegsel: employee.tussenvoegsel,
        achternaam: employee.achternaam,
        initialen: employee.initialen,
        email: employee.email,
        telefoon: employee.telefoon,
        adres: employee.adres,
        huisnummer: employee.huisnummer,
        huisnummer_toevoeging: employee.huisnummer_toevoeging,
        postcode: employee.postcode,
        stad: employee.stad,
        geboortedatum: employee.geboortedatum,
        geboorteplaats: employee.geboorteplaats,
        geslacht: employee.geslacht,
        burgerlijke_staat: employee.burgerlijke_staat,
        nationaliteit: employee.nationaliteit,
        bsn: employee.bsn,
        pas_type: employee.pas_type,
        pas_nummer: employee.pas_nummer
      });
    }
  }, [employee]);

  // Mutation for updating employee
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Employee> }) => {
      if (!id) {
        throw new Error('Employee ID is required');
      }
      try {
        console.log('Sending update request with data:', JSON.stringify(data, null, 2));
        return employeesApi.update(id, data);
      } catch (error) {
        console.error('Error updating employee:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      navigate('/employees');
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      console.error('Error response:', error.response?.data);
      
      // The error message should now be properly formatted from the API client
      const errorMessage = error.message || "Failed to update employee";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) {
      toast({
        title: "Error",
        description: "Employee ID is required",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData(e.currentTarget);
    console.log('Form data:', Object.fromEntries(formData.entries()));

    // Helper function to format dates for backend
    const formatDateForBackend = (dateStr: string | null) => {
      if (!dateStr) return null;
      try {
        // Parse the date string and format as YYYY-MM-DD
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error formatting date:', error);
        return null;
      }
    };

    const updatedEmployee = {
      employee_id: id, // Use the ID from the URL params
      personeelsnummer: parseInt(id), // Use the ID as personeelsnummer
      naam: formData.get('naam') as string || null,
      voornaam: formData.get('voornaam') as string || null,
      tussenvoegsel: formData.get('tussenvoegsel') as string || null,
      achternaam: formData.get('achternaam') as string || null,
      initialen: formData.get('initialen') as string || null,
      email: formData.get('email') as string || null,
      telefoon: formData.get('telefoon') as string || null,
      adres: formData.get('adres') as string || null,
      huisnummer: formData.get('huisnummer') as string || null,
      huisnummer_toevoeging: formData.get('huisnummer_toevoeging') as string || null,
      postcode: formData.get('postcode') as string || null,
      stad: formData.get('stad') as string || null,
      geboortedatum: formatDateForBackend(formData.get('geboortedatum') as string),
      geboorteplaats: formData.get('geboorteplaats') as string || null,
      geslacht: formData.get('geslacht') as string || null,
      burgerlijke_staat: formData.get('burgerlijke_staat') as string || null,
      bsn: formData.get('bsn') as string || null,
      nationaliteit: formData.get('nationaliteit') as string || null,
      pas_type: formData.get('pas_type') as string || null,
      pas_nummer: formData.get('pas_nummer') as string || null,
      pas_vervaldatum: formatDateForBackend(formData.get('pas_vervaldatum') as string),
      in_dienst: formatDateForBackend(formData.get('in_dienst') as string),
      uit_dienst: formatDateForBackend(formData.get('uit_dienst') as string),
      contract_type: formData.get('contract_type') as string || null,
      contract_uren: formData.get('contract_uren') ? parseInt(formData.get('contract_uren') as string) : null,
      contract_vervaldatum: formatDateForBackend(formData.get('contract_vervaldatum') as string),
    };

    console.log('Processed employee data:', JSON.stringify(updatedEmployee, null, 2));

    // Use the ID directly as a string since that's what the API expects
    console.log('Updating employee with ID:', id);
    updateMutation.mutate({ id, data: updatedEmployee });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error.message}</p>
        <Button onClick={() => navigate('/employees')} className="mt-4">
          Back to Employees
        </Button>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Employee Not Found</h1>
        <p>The requested employee could not be found.</p>
        <Button onClick={() => navigate('/employees')} className="mt-4">
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Edit Employee</h1>
        <Button variant="outline" onClick={() => navigate('/employees')}>
          Back to Employees
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="naam">Full Name</label>
            <Input 
              id="naam" 
              name="naam" 
              value={formData.naam || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, naam: e.target.value }))}
              required 
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="voornaam">First Names</label>
            <Input 
              id="voornaam" 
              name="voornaam" 
              value={formData.voornaam || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, voornaam: e.target.value }))}
              required 
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="tussenvoegsel">Surname Prefix</label>
            <Input 
              id="tussenvoegsel" 
              name="tussenvoegsel" 
              value={formData.tussenvoegsel || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, tussenvoegsel: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="achternaam">Surname</label>
            <Input 
              id="achternaam" 
              name="achternaam" 
              value={formData.achternaam || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, achternaam: e.target.value }))}
              required 
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="initialen">Initials</label>
            <Input 
              id="initialen" 
              name="initialen" 
              value={formData.initialen || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, initialen: e.target.value }))}
              required 
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email">Email</label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              value={formData.email || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required 
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="telefoon">Phone</label>
            <Input 
              id="telefoon" 
              name="telefoon" 
              type="tel" 
              value={formData.telefoon || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, telefoon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="adres">Address</label>
            <Input 
              id="adres" 
              name="adres" 
              value={formData.adres || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="huisnummer">House Number</label>
            <Input 
              id="huisnummer" 
              name="huisnummer" 
              value={formData.huisnummer || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, huisnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="huisnummer_toevoeging">Addition to Address</label>
            <Input 
              id="huisnummer_toevoeging" 
              name="huisnummer_toevoeging" 
              value={formData.huisnummer_toevoeging || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, huisnummer_toevoeging: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="postcode">Postal Code</label>
            <Input 
              id="postcode" 
              name="postcode" 
              value={formData.postcode || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="stad">City</label>
            <Input 
              id="stad" 
              name="stad" 
              value={formData.stad || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, stad: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="geboortedatum">Date of Birth</label>
            <Input 
              id="geboortedatum" 
              name="geboortedatum" 
              type="date" 
              value={formData.geboortedatum ? formData.geboortedatum.split('T')[0] : ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, geboortedatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="geboorteplaats">Place of Birth</label>
            <Input 
              id="geboorteplaats" 
              name="geboorteplaats" 
              value={formData.geboorteplaats || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, geboorteplaats: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="geslacht">Gender</label>
            <select 
              id="geslacht" 
              name="geslacht" 
              value={formData.geslacht || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, geslacht: e.target.value }))}
              className="w-full border rounded-md p-2"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="burgerlijke_staat">Marital Status</label>
            <select 
              id="burgerlijke_staat" 
              name="burgerlijke_staat" 
              value={formData.burgerlijke_staat || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, burgerlijke_staat: e.target.value }))}
              className="w-full border rounded-md p-2"
            >
              <option value="">Select status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="bsn">BSN Number</label>
            <Input 
              id="bsn" 
              name="bsn" 
              pattern="[0-9]{9}" 
              value={formData.bsn || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, bsn: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="nationaliteit">Nationality</label>
            <Input 
              id="nationaliteit" 
              name="nationaliteit" 
              value={formData.nationaliteit || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, nationaliteit: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="pas_type">Pass Type</label>
            <Input 
              id="pas_type" 
              name="pas_type" 
              value={formData.pas_type || ''} 
              onChange={(e) => setFormData(prev => ({ ...prev, pas_type: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="pas_nummer">Pass Number</label>
            <Input id="pas_nummer" name="pas_nummer" value={formData.pas_nummer || ''} />
          </div>
          <div className="space-y-2">
            <label htmlFor="pas_vervaldatum">Pass Expiry Date</label>
            <Input id="pas_vervaldatum" name="pas_vervaldatum" type="date" value={formData.pas_vervaldatum?.split('T')[0]} />
          </div>
          <div className="space-y-2">
            <label htmlFor="in_dienst">Start Date</label>
            <Input id="in_dienst" name="in_dienst" type="date" value={formData.in_dienst?.split('T')[0]} />
          </div>
          <div className="space-y-2">
            <label htmlFor="uit_dienst">End Date</label>
            <Input id="uit_dienst" name="uit_dienst" type="date" value={formData.uit_dienst?.split('T')[0]} />
          </div>
          <div className="space-y-2">
            <label htmlFor="contract_type">Contract Type</label>
            <select id="contract_type" name="contract_type" value={formData.contract_type || ''} className="w-full border rounded-md p-2">
              <option value="">Select contract type</option>
              <option value="Uurloner">Hourly</option>
              <option value="Vast">Fixed</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="contract_uren">Contract Hours</label>
            <Input id="contract_uren" name="contract_uren" type="number" value={formData.contract_uren || ''} />
          </div>
          <div className="space-y-2">
            <label htmlFor="contract_vervaldatum">Contract Expiry Date</label>
            <Input id="contract_vervaldatum" name="contract_vervaldatum" type="date" value={formData.contract_vervaldatum?.split('T')[0]} />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/employees')}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Updating..." : "Update Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
} 