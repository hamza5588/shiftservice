import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { invoicesApi, opdrachtgeversApi, locationsApi, shiftsApi, locationRatesApi } from '@/lib/api';
import { Invoice, Location as AppLocation, LocationRate, CreateInvoicePayload } from '@/lib/types';
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
import { Search, Plus, FileText, Download, Eye, Calendar, Trash2, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
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

interface BreakdownItem {
  hours: number;
  rate: number;
  total: number;
}

interface Breakdown {
  day: BreakdownItem;
  evening: BreakdownItem;
  night: BreakdownItem;
  weekend: BreakdownItem;
  holiday: BreakdownItem;
  new_year_eve: BreakdownItem;
}

export default function Invoicing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [rates, setRates] = useState<typeof defaultRates>(defaultRates);
  const [vatRate, setVatRate] = useState(21);
  const [paymentTerms, setPaymentTerms] = useState(14);
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPassType, setSelectedPassType] = useState<string>('blue');
  const [locationRates, setLocationRates] = useState<LocationRate[]>([]);
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

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
    queryFn: () => locationsApi.getAll(),
  });

  // Query for shifts
  const { data: shifts } = useQuery({
    queryKey: ['shifts', selectedClient, selectedLocation, startDate, endDate],
    queryFn: async () => {
      if (!selectedClient || !selectedLocation || !startDate || !endDate) {
        return Promise.resolve([]);
      }
      try {
        const allShifts = await shiftsApi.getAll();
        console.log('All shifts:', allShifts);
        
        // Filter shifts based on client, location and date range
        const filteredShifts = allShifts.filter(shift => {
          // Parse the shift date and normalize it to midnight UTC
          const shiftDate = new Date(shift.shift_date + 'T00:00:00Z');
          const normalizedStartDate = new Date(startDate.toISOString().split('T')[0] + 'T00:00:00Z');
          const normalizedEndDate = new Date(endDate.toISOString().split('T')[0] + 'T00:00:00Z');
          
          const isInDateRange = shiftDate >= normalizedStartDate && shiftDate <= normalizedEndDate;
          const matchesLocation = shift.location_id === parseInt(selectedLocation);
          
          console.log('Filtering shift:', {
            shiftId: shift.id,
            shiftDate: shift.shift_date,
            parsedShiftDate: shiftDate.toISOString(),
            normalizedStartDate: normalizedStartDate.toISOString(),
            normalizedEndDate: normalizedEndDate.toISOString(),
            locationId: shift.location_id,
            expectedLocationId: parseInt(selectedLocation),
            matchesLocation,
            isInDateRange
          });
          
          return matchesLocation && isInDateRange;
        });
        
        console.log('Filtered shifts:', filteredShifts);
        return filteredShifts;
      } catch (error) {
        console.error('Error fetching shifts:', error);
        return [];
      }
    },
    enabled: !!selectedClient && !!selectedLocation && !!startDate && !!endDate
  });

  // Add filtered locations state
  const [filteredLocations, setFilteredLocations] = useState<AppLocation[]>([]);

  // Update filtered locations when client or locations change
  useEffect(() => {
    if (selectedClient && locations) {
      const clientLocations = locations.filter(loc => 
        loc.opdrachtgever_id === selectedClient
      );
      console.log('Filtered locations for client:', selectedClient, clientLocations);
      setFilteredLocations(clientLocations);
    } else {
      setFilteredLocations([]);
    }
  }, [selectedClient, locations]);

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

    if (!shifts || shifts.length === 0) {
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
        parsedShiftDate: shiftDate.toISOString(),
        normalizedStartDate: normalizedStartDate.toISOString(),
        normalizedEndDate: normalizedEndDate.toISOString(),
        locationId: shift.location_id,
        expectedLocationId: parseInt(locationId),
        matchesLocation,
        isInDateRange
      });

      return matchesLocation && isInDateRange;
    });

    console.log('Filtered shifts count:', filteredShifts.length);
    console.log('Filtered shifts:', filteredShifts);

    // Create a map to store shifts by date
    const shiftsByDate = new Map();

    filteredShifts.forEach(shift => {
      const shiftDate = parseDateString(shift.shift_date);
      const dateKey = format(shiftDate, 'dd-MM-yyyy');
      
      if (!shiftsByDate.has(dateKey)) {
        shiftsByDate.set(dateKey, []);
      }
      shiftsByDate.get(dateKey).push(shift);
    });

    console.log('Shifts grouped by date:', Object.fromEntries(shiftsByDate));

    const breakdown = {
      day: { hours: 0, rate: currentRates.base, total: 0 },
      evening: { hours: 0, rate: currentRates.evening, total: 0 },
      night: { hours: 0, rate: currentRates.night, total: 0 },
      weekend: { hours: 0, rate: currentRates.weekend, total: 0 },
      holiday: { hours: 0, rate: currentRates.holiday, total: 0 },
      new_year_eve: { hours: 0, rate: currentRates.new_year_eve, total: 0 }
    };

    // Process each shift
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

    return { breakdown, filteredShifts };
  };

  // Update the viewedInvoice memo to use selectedInvoice
  const viewedInvoice = selectedInvoice;

  // Add generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      if (!selectedClient) {
        throw new Error('Please select a client');
      }
      if (!selectedLocation) {
        throw new Error('Please select a location');
      }
      if (!startDate) {
        throw new Error('Please select a start date');
      }
      if (!endDate) {
        throw new Error('Please select an end date');
      }

      // Calculate issue date and due date
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      // Get client and location information
      const client = clients?.find(c => c.id.toString() === selectedClient.toString());
      const location = locations?.find(l => l.id.toString() === selectedLocation);

      if (!client) {
        throw new Error('Client not found');
      }
      if (!location) {
        throw new Error('Location not found');
      }

      // Calculate hours and amounts
      const { breakdown, filteredShifts } = calculateHoursFromShifts(
        selectedClient.toString(),
        selectedLocation,
        startDate,
        endDate
      );

      // Calculate subtotal from breakdown
      const subtotal = calculateSubtotal(breakdown);
      const vatAmount = subtotal * (vatRate / 100);
      const totalAmount = subtotal + vatAmount;

      // Create the invoice with all necessary fields
      const initialPayload: CreateInvoicePayload = {
        opdrachtgever_id: selectedClient,
        opdrachtgever_naam: client.naam,
        locatie: location.naam,
        factuurdatum: format(issueDate, 'yyyy-MM-dd'),
        shift_date: format(startDate, 'yyyy-MM-dd'),
        shift_date_end: format(endDate, 'yyyy-MM-dd'),
        bedrag: totalAmount,
        status: 'open',
        factuur_text: generateInvoiceText(client, location, breakdown, subtotal, vatAmount, totalAmount, issueDate, dueDate, filteredShifts),
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        breakdown,
        kvk_nummer: client.kvk_nummer || '',
        adres: client.adres || '',
        postcode: client.postcode || '',
        stad: client.stad || '',
        telefoon: client.telefoon || '',
        email: client.email || '',
        client_name: client.naam,
        issue_date: format(issueDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd')
      };

      console.log('Submitting invoice data:', initialPayload);
      
      try {
        const result = await invoicesApi.create(initialPayload);
        return result;
      } catch (error) {
        // Check if the invoice was actually created despite the error
        try {
          const latestInvoices = await invoicesApi.getAll();
          const createdInvoice = latestInvoices.find(inv => 
            inv.opdrachtgever_id === selectedClient &&
            inv.shift_date === format(startDate, 'yyyy-MM-dd') &&
            inv.shift_date_end === format(endDate, 'yyyy-MM-dd')
          );
          
          if (createdInvoice) {
            console.log('Invoice was created successfully despite network error');
            return createdInvoice;
          }
        } catch (checkError) {
          console.error('Error checking for created invoice:', checkError);
        }
        
        // If we get here, the invoice wasn't created
          throw error;
      }
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
      // Only show error toast if we're sure the invoice wasn't created
      if (!error.message?.includes('CORS') && !error.message?.includes('Failed to fetch')) {
      toast({
        title: 'Error',
          description: error.message || 'Failed to generate invoice',
        variant: 'destructive',
      });
      }
    },
  });

  // Add send mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      if (!invoice.id) {
        throw new Error('Invalid invoice ID');
      }
      return invoicesApi.send(invoice.id);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Invoice sent successfully',
      });
      refetch();
    },
    onError: (error) => {
      console.error('Send error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invoice',
        variant: 'destructive',
      });
    },
  });

  const filteredInvoices = invoices?.filter(invoice => {
    return searchQuery === '' || 
      invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.factuurnummer?.toLowerCase().includes(searchQuery.toLowerCase());
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
    console.log('Client selected:', clientId);
    setSelectedClient(parseInt(clientId));
    setSelectedLocation(''); // Reset location when client changes
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

  const handleGenerateInvoice = async () => {
    try {
    // Validate all required fields
    if (!selectedClient) {
      toast({
        title: 'Error',
        description: 'Please select a client',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedLocation) {
      toast({
        title: 'Error',
        description: 'Please select a location',
        variant: 'destructive'
      });
      return;
    }

    if (!startDate) {
      toast({
        title: 'Error',
        description: 'Please select a start date',
        variant: 'destructive'
      });
      return;
    }

    if (!endDate) {
      toast({
        title: 'Error',
        description: 'Please select an end date',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedPassType) {
      toast({
        title: 'Error',
        description: 'Please select a pass type',
        variant: 'destructive'
      });
      return;
    }

    // Validate date range
    if (startDate > endDate) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

      const client = clients?.find(c => c.id === selectedClient);
      if (!client) {
        throw new Error('Client not found');
      }

      const location = locations?.find(l => l.id === parseInt(selectedLocation));
      if (!location) {
        throw new Error('Location not found');
      }

      // Get the location rate for the selected location and pass type
      const locationRate = locationRates.find(
        rate => rate.location_id === parseInt(selectedLocation) && rate.pass_type === selectedPassType
      );

      if (!locationRate) {
        throw new Error('No rates found for the selected location and pass type');
      }

      // Set invoice and due dates
      const currentDate = new Date();
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      const { breakdown, filteredShifts } = calculateHoursFromShifts(
        selectedClient.toString(),
        selectedLocation,
        startDate,
        endDate
      );

      // Check if there are any shifts
      const hasShifts = Object.values(breakdown).some(category => category.hours > 0);
      if (!hasShifts) {
        throw new Error('No shifts found for the selected date range');
      }

      const subtotal = calculateSubtotal(breakdown);
      const vatAmount = subtotal * (vatRate / 100);
      const totalAmount = subtotal + vatAmount;

      const initialPayload: CreateInvoicePayload = {
        opdrachtgever_id: selectedClient,
        opdrachtgever_naam: client.naam,
        locatie: location.naam,
        factuurdatum: format(currentDate, 'yyyy-MM-dd'),
        shift_date: format(startDate, 'yyyy-MM-dd'),
        shift_date_end: format(endDate, 'yyyy-MM-dd'),
        bedrag: totalAmount,
        status: 'open',
        factuur_text: generateInvoiceText(client, location, breakdown, subtotal, vatAmount, totalAmount, currentDate, dueDate, filteredShifts),
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        breakdown,
        kvk_nummer: client.kvk_nummer || '',
        adres: client.adres || '',
        postcode: client.postcode || '',
        stad: client.stad || '',
        telefoon: client.telefoon || '',
        email: client.email || '',
        client_name: client.naam,
        issue_date: format(currentDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd')
      };

      console.log('Submitting invoice data:', initialPayload);

      // Add retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let lastError;

      while (retryCount < maxRetries) {
        try {
          const result = await generateInvoiceMutation.mutateAsync(initialPayload);
          // If we get here, the mutation was successful
          toast({
            title: 'Success',
            description: 'Invoice generated successfully',
          });
          setIsGenerateDialogOpen(false);
          await refetch();
          return;
        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${retryCount + 1} failed:`, error);
          
          // Check if the invoice was actually created despite the error
          try {
            await refetch();
            const latestInvoices = await invoicesApi.getAll();
            const createdInvoice = latestInvoices.find(inv => 
              inv.opdrachtgever_id === selectedClient &&
              inv.shift_date === format(startDate, 'yyyy-MM-dd') &&
              inv.shift_date_end === format(endDate, 'yyyy-MM-dd')
            );
            
            if (createdInvoice) {
              console.log('Invoice was created successfully despite network error');
              toast({
                title: 'Success',
                description: 'Invoice generated successfully',
              });
              setIsGenerateDialogOpen(false);
              setSelectedInvoice(createdInvoice);
              setViewInvoiceId(createdInvoice.id);
              return;
            }
          } catch (checkError) {
            console.error('Error checking for created invoice:', checkError);
          }
          
          retryCount++;
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
        }
      }

      // If we get here, all retries failed
      throw lastError || new Error('Failed to generate invoice after multiple attempts');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate invoice',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateBreakdown = (shifts: any[]): Breakdown => {
    const breakdown = {
      day: { hours: 0, rate: defaultRates.base, total: 0 },
      evening: { hours: 0, rate: defaultRates.evening, total: 0 },
      night: { hours: 0, rate: defaultRates.night, total: 0 },
      weekend: { hours: 0, rate: defaultRates.weekend, total: 0 },
      holiday: { hours: 0, rate: defaultRates.holiday, total: 0 },
      new_year_eve: { hours: 0, rate: defaultRates.new_year_eve, total: 0 }
    };

    shifts.forEach(shift => {
      const hours = parseFloat(shift.uren);
      const rate = getRateForShift(shift);
      const total = hours * rate;

      if (isNewYearEve(shift.datum)) {
        breakdown.new_year_eve.hours += hours;
        breakdown.new_year_eve.total += total;
      } else if (isHoliday(shift.datum)) {
        breakdown.holiday.hours += hours;
        breakdown.holiday.total += total;
      } else if (isWeekend(shift.datum)) {
        breakdown.weekend.hours += hours;
        breakdown.weekend.total += total;
      } else if (isNightShift(shift.start_time)) {
        breakdown.night.hours += hours;
        breakdown.night.total += total;
      } else if (isEveningShift(shift.start_time)) {
        breakdown.evening.hours += hours;
        breakdown.evening.total += total;
      } else {
        breakdown.day.hours += hours;
        breakdown.day.total += total;
      }
    });

    return breakdown;
  };

  const calculateSubtotal = (breakdown: Breakdown): number => {
    return Object.values(breakdown).reduce((total, category) => total + category.total, 0);
  };

  const getRateForShift = (shift: any): number => {
    if (isNewYearEve(shift.datum)) return defaultRates.new_year_eve;
    if (isHoliday(shift.datum)) return defaultRates.holiday;
    if (isWeekend(shift.datum)) return defaultRates.weekend;
    if (isNightShift(shift.start_time)) return defaultRates.night;
    if (isEveningShift(shift.start_time)) return defaultRates.evening;
    return defaultRates.base;
  };

  const isNewYearEve = (date: string): boolean => {
    const d = new Date(date);
    return d.getMonth() === 11 && d.getDate() === 31;
  };

  const isHoliday = (date: string): boolean => {
    // Add holiday logic here
    return false;
  };

  const isWeekend = (date: string): boolean => {
    const d = new Date(date);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const isNightShift = (time: string): boolean => {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 22 || hour < 6;
  };

  const isEveningShift = (time: string): boolean => {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 18 && hour < 22;
  };

  const generateInvoiceText = (
    client: any,
    location: any,
    breakdown: Breakdown,
    subtotal: number,
    vatAmount: number,
    totalAmount: number,
    issueDate: Date,
    dueDate: Date,
    filteredShifts: any[]
  ): string => {
    console.log('Generating invoice text with breakdown:', JSON.stringify(breakdown, null, 2));
    console.log('Generating invoice text with filteredShifts:', JSON.stringify(filteredShifts, null, 2));
    
    const formatCurrency = (amount: number) => `€ ${amount.toFixed(2).replace('.', ',')}`;
    const formatHours = (hours: number) => hours.toFixed(1).replace('.', ',');

    // Create detailed breakdown text from individual filtered shifts
    const shiftsBreakdownText = filteredShifts.map((shift: any) => {
      console.log('Processing individual shift for invoice text:', shift);

      const [startHours, startMinutes] = shift.start_time.split(':').map(Number);
      const [endHours, endMinutes] = shift.end_time.split(':').map(Number);
      
      const startTime = new Date(shift.shift_date);
      startTime.setHours(startHours, startMinutes, 0);
      
      const endTime = new Date(shift.shift_date);
      endTime.setHours(endHours, endMinutes, 0);
      
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      // Determine the rate based on shift time and location rates
      const locationRate = locationRates.find(
        rate => rate.location_id === shift.location_id && rate.pass_type === selectedPassType
      );

      let rate = defaultRates.base;
      if (locationRate) {
        if (startHours >= 22 || startHours < 6) {
          rate = locationRate.night_rate;
        } else if (startHours >= 18 && startHours < 22) {
          rate = locationRate.evening_rate;
        } else {
          rate = locationRate.base_rate;
        }
      } else { // Fallback to default rates if locationRate is not found
         if (startHours >= 22 || startHours < 6) {
          rate = defaultRates.night;
        } else if (startHours >= 18 && startHours < 22) {
          rate = defaultRates.evening;
        }
      }

      const total = hours * rate;

      const shiftLine = [
        formatHours(hours),                                 // UREN
        location.naam,                                      // LOCATIE (Using the invoice location, not shift.locatie)
        formatCurrency(rate),                               // TARIEF
        format(new Date(shift.shift_date), 'dd-MM-yyyy'),  // DATUM
        formatCurrency(total)                               // TOTAAL
      ].join('\t');
      
      console.log('Generated shift line:', {
        shiftId: shift.id,
        shiftDate: shift.shift_date,
        startTime: shift.start_time,
        endTime: shift.end_time,
        hours,
        rate,
        total,
        formattedLine: shiftLine
      });
      
      return shiftLine;
    }).join('\n');

    console.log('Final shifts breakdown text for invoice:', shiftsBreakdownText);

    const invoiceText = `FACTUUR

DATUM
${format(issueDate, 'dd-MM-yyyy')}

FACTUURNUMMER
PENDING

SECUFY
94486786

Soetendaalseweg 32c

3036ER Rotterdam

0685455793

vraagje@secufy.nl

FACTUUR AAN:
${client.naam}

KVK: ${client.kvk_nummer || ''}

${client.adres || ''}

${client.postcode || ''} ${client.stad || ''}

Tel: ${client.telefoon || ''}

Email: ${client.email || ''}

FACTUUR DETAILS:
Periode: ${format(startDate!, 'dd-MM-yyyy')} t/m ${format(endDate!, 'dd-MM-yyyy')}

Locatie: ${location.naam}

UREN\tLOCATIE\tTARIEF\tDATUM\tTOTAAL
${shiftsBreakdownText}

Subtotaal
${formatCurrency(subtotal)}
Btw (${vatRate}%)
${formatCurrency(vatAmount)}
Totaal
${formatCurrency(totalAmount)}

BETALINGSGEGEVENS:
Bank: NL11 ABNA 0137 7274 61

Ten name van: Secufy BV

Btw nummer: NL004445566B01`;

    console.log('Generated invoice text:', invoiceText);
    return invoiceText;
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
                  <Select value={selectedClient?.toString()} onValueChange={handleClientChange}>
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
                      <SelectItem value="blue">Blue pass</SelectItem>
                      <SelectItem value="grey">Grey pass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show current rates for the selected location and pass type */}
                {selectedLocation && selectedPassType && (
                  <div className="border-t pt-4 mt-2">
                    <h4 className="font-medium mb-3">Current Rates for Selected Location</h4>
                    {locationRates
                      .filter(rate => rate.location_id === parseInt(selectedLocation) && rate.pass_type === selectedPassType)
                      .map(rate => (
                        <div key={rate.id} className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Base Rate (€)</Label>
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
                    {locationRates.filter(rate => rate.location_id === parseInt(selectedLocation) && rate.pass_type === selectedPassType).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No rates found for this location and pass type combination.
                      </div>
                    )}
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
                  onClick={handleGenerateInvoice}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Invoice'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  <Spinner />
                </TableCell>
              </TableRow>
            ) : invoices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.factuurnummer}</TableCell>
                  <TableCell>{invoice.opdrachtgever_naam}</TableCell>
                  <TableCell>{invoice.locatie}</TableCell>
                  <TableCell>{formatDate(invoice.factuurdatum)}</TableCell>
                  <TableCell>{formatCurrency(invoice.bedrag)}</TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewInvoiceId(invoice.id)}
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
                      {invoice.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => sendInvoiceMutation.mutate(invoice)}
                          disabled={sendInvoiceMutation.isPending}
                        >
                          {sendInvoiceMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setInvoiceToDelete(invoice)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoiceId} onOpenChange={() => setViewInvoiceId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>View Invoice</DialogTitle>
          </DialogHeader>
          {isViewLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : viewError ? (
            <div className="text-center text-red-500 p-4">
              Error loading invoice
            </div>
          ) : viewedInvoiceData ? (
            <InvoiceTemplate invoice={viewedInvoiceData} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
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
              onClick={() => invoiceToDelete && deleteMutation.mutate(invoiceToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
