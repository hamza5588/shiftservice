import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { invoicesApi, opdrachtgeversApi, locationsApi, shiftsApi, locationRatesApi } from '@/lib/api';
import { Invoice, LocationRate } from '@/lib/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, FileText, Download, Eye, Calendar, Trash2 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { Spinner } from '@/components/ui/spinner';
import { API_URL } from '@/config/api';
import { authService } from '@/lib/auth';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logoImage from '../logo/logo.jpg';

// Rate configuration
const defaultRates = {
  base: 20.00,     // Base rate per hour
  evening: 22.00,  // Base + 10% (20.00 + 2.00)
  night: 24.00,    // Base + 20% (20.00 + 4.00)
  weekend: 27.00,  // Base + 35% (20.00 + 7.00)
  holiday: 30.00,  // Base + 50% (20.00 + 10.00)
  new_year_eve: 40.00 // Base + 100% (20.00 + 20.00)
};

// Define types for our data
interface Shift {
  id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  location_id: number;
  employee_id: string;
  location?: string;
  location_details?: {
    id: number;
    naam: string;
    adres: string;
    stad: string;
    provincie: string | null;
  };
  status?: string;
  assigned_by_admin?: string | null;
  reiskilometers?: number | null;
  required_profile?: string;
  titel?: string;
  adres?: string;
  provincie?: string;
  stad?: string;
}

interface Location {
  id: number;
  naam: string;
  adres: string;
  stad: string;
  postcode: string;
  provincie?: string;
  opdrachtgever_id?: number;
}

interface LocationRate {
  id: number;
  location_id: number;
  pass_type: string;
  base_rate: number;
  evening_rate: number;
  night_rate: number;
  weekend_rate: number;
  holiday_rate: number;
  new_years_eve_rate: number;
}

export default function Invoicing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [rates, setRates] = useState<typeof defaultRates>(defaultRates);
  const [vatRate, setVatRate] = useState(21);
  const [paymentTerms, setPaymentTerms] = useState(14);
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPassType, setSelectedPassType] = useState<string>('standard');
  const [locationRates, setLocationRates] = useState<LocationRate[]>([]);

  // Add delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      console.log('Attempting to delete invoice:', invoice);
      
      // First check if we have a direct ID
      if (invoice.id) {
        console.log('Using direct invoice ID:', invoice.id);
        return invoicesApi.delete(invoice.id);
      }
      
      // Make sure we have the latest invoices data
      await refetch();
      console.log('Available invoices:', invoices);
      
      // Try to find the invoice by factuurnummer
      if (invoice.factuurnummer) {
        console.log('Searching by factuurnummer:', invoice.factuurnummer);
        
        try {
          console.log('Fetching invoice details by factuurnummer:', invoice.factuurnummer);
          const invoiceDetails = await invoicesApi.getByNumber(invoice.factuurnummer);
          console.log('Invoice details from API:', invoiceDetails);
          
          if (invoiceDetails.id) {
            console.log('Using invoice ID from API:', invoiceDetails.id);
            return invoicesApi.delete(invoiceDetails.id);
          }
        } catch (error) {
          console.error('Error fetching invoice details:', error);
        }
        
        console.log('No invoice found with factuurnummer:', invoice.factuurnummer);
        console.log('Available factuurnummers:', invoices?.map(inv => inv.factuurnummer));
      }
      
      // If we get here, we couldn't find a valid ID
      throw new Error(`Cannot delete invoice: No valid ID found for invoice ${invoice.factuurnummer || 'unknown'}`);
    },
    onSuccess: () => {
      console.log('Delete successful');
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
      refetch();
      setInvoiceToDelete(null);
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      let errorMessage = 'Failed to delete invoice';
      
      if (error.response?.status === 401) {
        errorMessage = 'You need to log in to delete invoices';
        window.location.href = '/login';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to delete invoices. This action requires admin or boekhouding role.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setInvoiceToDelete(null);
    },
  });

  // Add confirmation dialog state
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Query for invoices
  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesApi.getAll,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Query for clients
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: opdrachtgeversApi.getAll,
  });

  // Query for locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
  });

  // Query for shifts
  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: shiftsApi.getAll,
  });

  // Add filtered locations state
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);

  // Add a query to fetch a single invoice
  const { data: viewedInvoiceData, isLoading: isViewLoading, error: viewError } = useQuery({
    queryKey: ['invoice', viewInvoiceId],
    queryFn: async () => {
      if (!viewInvoiceId) {
        console.log('No viewInvoiceId provided');
        return null;
      }
      try {
        console.log('Fetching invoice with ID:', viewInvoiceId);
        const response = await invoicesApi.getById(viewInvoiceId);
        console.log('Fetched invoice data:', response);
        if (!response) {
          console.log('No invoice data received from API');
          return null;
        }
        return response;
      } catch (error) {
        console.error('Error fetching invoice:', error);
        throw error;
      }
    },
    enabled: !!viewInvoiceId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Query for location rates
  const { data: locationRatesData } = useQuery({
    queryKey: ['locationRates'],
    queryFn: locationRatesApi.getAll,
  });

  // Update location rates when data changes
  useEffect(() => {
    if (locationRatesData) {
      setLocationRates(locationRatesData as LocationRate[]);
    }
  }, [locationRatesData]);

  // Calculate hours from shifts
  const calculateHoursFromShifts = (clientId: string, locationId: string, startDate: Date, endDate: Date) => {
    // Find the location rate for the selected location and pass type
    const locationRate = locationRates.find(
      rate => rate.location_id === parseInt(locationId) && rate.pass_type === selectedPassType
    );

    // Use location rates if available, otherwise use default rates
    const currentRates = locationRate ? {
      base: locationRate.base_rate,
      evening: locationRate.evening_rate,
      night: locationRate.night_rate,
      weekend: locationRate.weekend_rate,
      holiday: locationRate.holiday_rate,
      new_year_eve: locationRate.new_years_eve_rate
    } : defaultRates;

    console.log('Current rates:', currentRates);
    console.log('Parameters:', { clientId, locationId, startDate, endDate });

    if (!shifts) {
      console.warn('No shifts data available');
      return {
        day: { hours: 0, rate: currentRates.base, total: 0 },
        evening: { hours: 0, rate: currentRates.evening, total: 0 },
        night: { hours: 0, rate: currentRates.night, total: 0 },
        weekend: { hours: 0, rate: currentRates.weekend, total: 0 },
        holiday: { hours: 0, rate: currentRates.holiday, total: 0 },
        new_year_eve: { hours: 0, rate: currentRates.new_year_eve, total: 0 }
      };
    }

    console.log('Total shifts before filtering:', shifts.length);
    console.log('Sample shift data:', shifts[0]);

    // Helper function to parse date string in YYYY-MM-DD format
    const parseDateString = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    // Helper function to normalize dates for comparison
    const normalizeDate = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    // Normalize the input dates
    const normalizedStartDate = normalizeDate(startDate);
    const normalizedEndDate = normalizeDate(endDate);
    // Add one day to end date to include the full end date
    normalizedEndDate.setDate(normalizedEndDate.getDate() + 1);

    // Filter shifts based on client, location and date range
    const filteredShifts = shifts.filter(shift => {
      const shiftDate = normalizeDate(parseDateString(shift.shift_date));
      const matchesLocation = shift.location_id === parseInt(locationId);
      const isInDateRange = shiftDate >= normalizedStartDate && shiftDate < normalizedEndDate;
      
      console.log('Shift filtering:', {
        shiftId: shift.id,
        shiftDate: shift.shift_date,
        parsedShiftDate: shiftDate,
        normalizedStartDate,
        normalizedEndDate,
        locationId: shift.location_id,
        expectedLocationId: parseInt(locationId),
        matchesLocation,
        isInDateRange
      });

      return matchesLocation && isInDateRange;
    });

    console.log('Filtered shifts count:', filteredShifts.length);
    console.log('Filtered shifts:', filteredShifts);

    const breakdown = {
      day: { hours: 0, rate: currentRates.base, total: 0 },
      evening: { hours: 0, rate: currentRates.evening, total: 0 },
      night: { hours: 0, rate: currentRates.night, total: 0 },
      weekend: { hours: 0, rate: currentRates.weekend, total: 0 },
      holiday: { hours: 0, rate: currentRates.holiday, total: 0 },
      new_year_eve: { hours: 0, rate: currentRates.new_year_eve, total: 0 }
    };

    filteredShifts.forEach(shift => {
      const shiftDate = parseDateString(shift.shift_date);
      console.log('Processing shift:', {
        shiftId: shift.id,
        date: shift.shift_date,
        startTime: shift.start_time,
        endTime: shift.end_time
      });
      
      // Convert HH:mm format to Date objects for calculation
      const [startHours, startMinutes] = shift.start_time.split(':').map(Number);
      const [endHours, endMinutes] = shift.end_time.split(':').map(Number);
      
      const startTime = new Date(shiftDate);
      startTime.setHours(startHours, startMinutes, 0);
      
      const endTime = new Date(shiftDate);
      endTime.setHours(endHours, endMinutes, 0);
      
      // If end time is before start time, it means the shift ends the next day
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      // Calculate total hours for this shift
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      console.log('Calculated hours:', {
        shiftId: shift.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalHours: hours
      });

      const isWeekend = shiftDate.getDay() === 0 || shiftDate.getDay() === 6;
      const isNewYearEve = shiftDate.getMonth() === 11 && shiftDate.getDate() === 31;
      
      console.log('Shift categorization:', {
        shiftId: shift.id,
        isWeekend,
        isNewYearEve,
        startHour: startHours
      });

      // Determine the rate category based on time and date
      if (isNewYearEve && startHours >= 16) {
        breakdown.new_year_eve.hours += hours;
        breakdown.new_year_eve.total += hours * currentRates.new_year_eve;
        console.log('Added to New Year\'s Eve:', { hours, rate: currentRates.new_year_eve });
      } else if (isWeekend) {
        breakdown.weekend.hours += hours;
        breakdown.weekend.total += hours * currentRates.weekend;
        console.log('Added to Weekend:', { hours, rate: currentRates.weekend });
      } else {
        // Regular day categorization
        if (startHours >= 22 || startHours < 6) {
          // Night hours (22:00 - 06:00)
          breakdown.night.hours += hours;
          breakdown.night.total += hours * currentRates.night;
          console.log('Added to Night:', { hours, rate: currentRates.night });
        } else if (startHours >= 18 && startHours < 22) {
          // Evening hours (18:00 - 22:00)
          breakdown.evening.hours += hours;
          breakdown.evening.total += hours * currentRates.evening;
          console.log('Added to Evening:', { hours, rate: currentRates.evening });
        } else {
          // Day hours (06:00 - 18:00)
          breakdown.day.hours += hours;
          breakdown.day.total += hours * currentRates.base;
          console.log('Added to Day:', { hours, rate: currentRates.base });
        }
      }
    });

    console.log('Final breakdown:', breakdown);
    
    // Calculate totals
    const totalHours = Object.values(breakdown).reduce((sum, { hours }) => sum + hours, 0);
    const totalAmount = Object.values(breakdown).reduce((sum, { total }) => sum + total, 0);
    
    console.log('Totals:', {
      totalHours,
      totalAmount,
      vatAmount: totalAmount * (vatRate / 100),
      finalTotal: totalAmount * (1 + vatRate / 100)
    });

    return breakdown;
  };

  // Update the viewedInvoice memo to use selectedInvoice
  const viewedInvoice = selectedInvoice;

  // Mutation for generating invoice
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient || !selectedLocation || !startDate || !endDate) {
        throw new Error('Please fill in all required fields');
      }
      if (endDate < startDate) {
        throw new Error('End date must be after start date');
      }

      // Calculate hours and amounts
      const breakdown = calculateHoursFromShifts(selectedClient, selectedLocation, startDate, endDate);
      console.log('Calculated breakdown:', breakdown);

      const subtotal = Object.values(breakdown).reduce((sum, item) => sum + item.total, 0);
      const vatAmount = subtotal * (vatRate / 100);
      const totalAmount = subtotal + vatAmount;

      // Get client and location details
      const client = clients?.find(c => c.id.toString() === selectedClient);
      const location = locations?.find(l => l.id.toString() === selectedLocation);

      if (!client || !location) {
        throw new Error('Client or location not found');
      }

      // Create invoice dates
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(issueDate.getDate() + paymentTerms);

      // Create the invoice with all necessary fields
      const response = await invoicesApi.create({
        opdrachtgever_id: parseInt(selectedClient),
        opdrachtgever_naam: client?.naam || '',
        kvk_nummer: client?.kvk_nummer || '',
        adres: client?.adres || '',
        postcode: client?.postcode || '',
        stad: client?.stad || '',
        telefoon: client?.telefoon || '',
        email: client?.email || '',
        locatie: location?.naam || '',
        factuurdatum: issueDate.toISOString().split('T')[0],
        shift_date: startDate.toISOString().split('T')[0],
        shift_date_end: endDate.toISOString().split('T')[0],
        bedrag: totalAmount,
        status: 'open',
        factuur_text: [
          'Invoice details:',
          `Period: ${formatDate(startDate.toISOString().split('T')[0])} - ${formatDate(endDate.toISOString().split('T')[0])}`,
          `Day: ${breakdown.day.hours.toFixed(1)}h x €${breakdown.day.rate.toFixed(2)} = €${breakdown.day.total.toFixed(2)}`,
          `Evening: ${breakdown.evening.hours.toFixed(1)}h x €${breakdown.evening.rate.toFixed(2)} = €${breakdown.evening.total.toFixed(2)}`,
          `Night: ${breakdown.night.hours.toFixed(1)}h x €${breakdown.night.rate.toFixed(2)} = €${breakdown.night.total.toFixed(2)}`,
          `Weekend: ${breakdown.weekend.hours.toFixed(1)}h x €${breakdown.weekend.rate.toFixed(2)} = €${breakdown.weekend.total.toFixed(2)}`,
          `Holiday: ${breakdown.holiday.hours.toFixed(1)}h x €${breakdown.holiday.rate.toFixed(2)} = €${breakdown.holiday.total.toFixed(2)}`,
          `New Year's Eve: ${breakdown.new_year_eve.hours.toFixed(1)}h x €${breakdown.new_year_eve.rate.toFixed(2)} = €${breakdown.new_year_eve.total.toFixed(2)}`,
          '',
          `Subtotal: €${subtotal.toFixed(2)}`,
          `VAT (${vatRate}%): €${vatAmount.toFixed(2)}`,
          `Total: €${totalAmount.toFixed(2)}`
        ].join('\n'),
        client_name: client?.naam || '',
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        total_amount: totalAmount,
        vat_amount: vatAmount,
        subtotal: subtotal,
        breakdown: breakdown
      });

      console.log('Created invoice:', response);
      return response;
    },
    onSuccess: async (data) => {
      toast({
        title: 'Success',
        description: 'Invoice generated successfully',
      });
      setIsGenerateDialogOpen(false);
      await refetch(); // Wait for refetch to complete
      setTimeout(() => {
        setSelectedInvoice(data);
        setViewInvoiceId(data.id);
      }, 100);
    },
    onError: (error) => {
      console.error('Invoice generation error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredInvoices = invoices?.filter(invoice => {
    return searchQuery === '' || 
      invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  // Update the input handlers to safely handle rate changes
  const handleRateChange = (rateType: keyof typeof defaultRates, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setRates(prev => ({
        ...prev,
        [rateType]: numValue
      }));
    }
  };

  // Add these helper functions at the top of the file
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) 
      ? date.toLocaleDateString('nl-NL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      : '-';
  };

  // Update the client selection handler
  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    setSelectedLocation(''); // Reset location when client changes
    
    // Filter locations based on selected client
    if (clientId && locations) {
      const clientLocations = locations.filter(loc => 
        loc.opdrachtgever_id?.toString() === clientId
      );
      setFilteredLocations(clientLocations);
    } else {
      setFilteredLocations([]);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      if (!invoice) {
        throw new Error('Invalid invoice');
      }

      // Create a temporary div to render the invoice template
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.backgroundColor = 'white';
      document.body.appendChild(tempDiv);

      // Create a promise to track when the component is fully rendered
      const renderPromise = new Promise((resolve) => {
        const root = ReactDOM.createRoot(tempDiv);
        root.render(
          <InvoiceTemplate 
            invoice={invoice} 
            isPdf={true} 
          />
        );
        // Give time for the component to render and logo to load
        setTimeout(resolve, 2000);
      });

      // Wait for the render to complete
      await renderPromise;

      // Use html2canvas with improved settings for image handling
      const canvas = await html2canvas(tempDiv.firstChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        windowHeight: tempDiv.scrollHeight,
        logging: true,
        imageTimeout: 5000,
        onclone: async (clonedDoc) => {
          // Wait for all images in the cloned document to load
          const images = Array.from(clonedDoc.getElementsByTagName('img'));
          await Promise.all(
            images.map(
              (img) =>
                new Promise((resolve) => {
                  if (img.complete) {
                    resolve(true);
                  } else {
                    img.onload = () => resolve(true);
                    img.onerror = () => {
                      console.error('Failed to load image:', img.src);
                      resolve(false);
                    };
                  }
                })
            )
          );
        }
      });

      // Generate PDF with improved image quality settings
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        hotfixes: ['px_scaling']
      });

      // Calculate dimensions to fit A4
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const canvasAspectRatio = canvas.height / canvas.width;
      const pdfWidth = pageWidth;
      const pdfHeight = pdfWidth * canvasAspectRatio;

      // Add the image to the PDF with high quality settings
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST', 0);

      // Save the PDF
      pdf.save(`invoice_${invoice.factuurnummer || invoice.id}.pdf`);

      // Clean up
      document.body.removeChild(tempDiv);

      toast({
        title: 'Success',
        description: 'Invoice downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download invoice',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Invoicing</h1>
        
        <div className="flex gap-2">
          <Button onClick={() => invoicesApi.exportPdf()}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Generate Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Generate New Invoice</DialogTitle>
                <DialogDescription>
                  Generate an invoice for a specific client, location, and date range.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={selectedClient} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.naam}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Date</Label>
                    <DatePicker
                      date={startDate}
                      setDate={setStartDate}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Date</Label>
                    <DatePicker
                      date={endDate}
                      setDate={setEndDate}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="passType">Pass Type</Label>
                  <Select value={selectedPassType} onValueChange={setSelectedPassType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pass type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show current rates for the selected location and pass type */}
                {selectedLocation && (
                  <div className="border-t pt-4 mt-2">
                    <h4 className="font-medium mb-3">Current Rates for Selected Location</h4>
                    {locationRates
                      .filter(rate => rate.location_id === parseInt(selectedLocation) && rate.pass_type === selectedPassType)
                      .map(rate => (
                        <div key={rate.id} className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Day Rate (€)</Label>
                            <Input value={rate.base_rate} disabled />
                          </div>
                          <div className="grid gap-2">
                            <Label>Evening Rate (€)</Label>
                            <Input value={rate.evening_rate} disabled />
                          </div>
                          <div className="grid gap-2">
                            <Label>Night Rate (€)</Label>
                            <Input value={rate.night_rate} disabled />
                          </div>
                          <div className="grid gap-2">
                            <Label>Weekend Rate (€)</Label>
                            <Input value={rate.weekend_rate} disabled />
                          </div>
                          <div className="grid gap-2">
                            <Label>Holiday Rate (€)</Label>
                            <Input value={rate.holiday_rate} disabled />
                          </div>
                          <div className="grid gap-2">
                            <Label>New Year's Eve Rate (€)</Label>
                            <Input value={rate.new_years_eve_rate} disabled />
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="border-t pt-4 mt-2">
                  <h4 className="font-medium mb-3">Additional Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>VAT Rate (%)</Label>
                      <Input
                        type="number"
                        value={vatRate}
                        onChange={(e) => setVatRate(parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Payment Terms (days)</Label>
                      <Input
                        type="number"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => generateInvoiceMutation.mutate()}
                  disabled={generateInvoiceMutation.isPending}
                >
                  {generateInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-card rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead key="header-invoice-number">Invoice Number</TableHead>
              <TableHead key="header-client">Client</TableHead>
              <TableHead key="header-issue-date">Issue Date</TableHead>
              <TableHead key="header-due-date">Due Date</TableHead>
              <TableHead key="header-amount">Amount</TableHead>
              <TableHead key="header-status">Status</TableHead>
              <TableHead key="header-actions" className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading state
              [...Array(3)].map((_, rowIndex) => (
                <TableRow key={`loading-row-${rowIndex}`}>
                  {[...Array(7)].map((_, cellIndex) => (
                    <TableCell key={`loading-cell-${rowIndex}-${cellIndex}`}>
                      <div className="h-5 bg-muted animate-pulse rounded"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => {
                // Ensure we have a valid ID for the key
                const rowKey = invoice.id ? `invoice-${invoice.id}` : `invoice-${Math.random()}`;
                return (
                  <TableRow key={rowKey}>
                    <TableCell key={`${rowKey}-number`}>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        {invoice.factuurnummer || invoice.id}
                      </div>
                    </TableCell>
                    <TableCell key={`${rowKey}-client`}>
                      {invoice.opdrachtgever_naam || invoice.locatie || '-'}
                    </TableCell>
                    <TableCell key={`${rowKey}-issue-date`}>
                      {formatDate(invoice.factuurdatum)}
                    </TableCell>
                    <TableCell key={`${rowKey}-due-date`}>
                      {formatDate(invoice.factuurdatum)}
                    </TableCell>
                    <TableCell key={`${rowKey}-amount`}>
                      {formatCurrency(invoice.bedrag || 0)}
                    </TableCell>
                    <TableCell key={`${rowKey}-status`}>
                      <StatusBadge status={invoice.status || 'open'} />
                    </TableCell>
                    <TableCell key={`${rowKey}-actions`} className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setViewInvoiceId(invoice.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadInvoice(invoice)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            console.log('Delete button clicked for invoice:', invoice);
                            if (invoice.id || invoice.factuurnummer) {
                              setInvoiceToDelete(invoice);
                            } else {
                              console.error('Invoice ID and factuurnummer are missing:', invoice);
                              toast({
                                title: 'Error',
                                description: 'Cannot delete invoice: Missing invoice identifier',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow key="no-invoices">
                <TableCell colSpan={7} className="text-center h-32">
                  No invoices found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={selectedInvoice !== null} onOpenChange={(open) => {
        if (!open) {
          setViewInvoiceId(null);
          setSelectedInvoice(null);
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Invoice {selectedInvoice?.factuurnummer || 'Loading...'}
            </DialogTitle>
            <DialogDescription>
              Viewing invoice details
            </DialogDescription>
          </DialogHeader>

          {isViewLoading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner className="w-8 h-8" />
            </div>
          ) : viewError ? (
            <div className="text-center p-8 text-muted-foreground">
              <p>Error loading invoice: {viewError.message}</p>
              <p className="text-sm mt-2">Please try again or contact support if the issue persists.</p>
            </div>
          ) : viewedInvoiceData ? (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <InvoiceTemplate invoice={viewedInvoiceData} />
              </div>
            </div>
          ) : selectedInvoice ? (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <InvoiceTemplate invoice={selectedInvoice} />
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <p>Invoice not found</p>
              <p className="text-sm mt-2">
                Invoice ID: {viewInvoiceId}<br />
                Invoice Number: {selectedInvoice?.factuurnummer}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add confirmation dialog for delete */}
      <Dialog open={invoiceToDelete !== null} onOpenChange={(open) => {
        if (!open) setInvoiceToDelete(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.factuurnummer || invoiceToDelete?.id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInvoiceToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                console.log('Confirming delete for invoice:', invoiceToDelete);
                if (invoiceToDelete) {
                  deleteMutation.mutate(invoiceToDelete);
                } else {
                  console.error('No invoice to delete');
                  toast({
                    title: 'Error',
                    description: 'Cannot delete invoice: No invoice selected',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
