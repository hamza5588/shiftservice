import React, { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { serviceRequestsApi, shiftsApi } from '@/lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

const formSchema = z.object({
  shift_id: z.string().min(1, 'Please select a shift'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewServiceRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedShiftId = searchParams.get('shift_id');
  const { user: currentUser } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shift_id: preselectedShiftId || '',
      notes: '',
    },
  });

  // Query for available shifts
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['available-shifts'],
    queryFn: serviceRequestsApi.getAvailableShifts,
  });

  // Filter shifts to only show open ones
  const availableShifts = shifts || [];

  // Set the preselected shift when the component mounts
  useEffect(() => {
    if (preselectedShiftId) {
      form.setValue('shift_id', preselectedShiftId);
    }
  }, [preselectedShiftId, form]);

  // Mutation for creating service request
  const { mutate: createRequest, isLoading: isSubmitting } = useMutation({
    mutationFn: (data: FormValues) => {
      // Find the selected shift to get its details
      const selectedShift = availableShifts.find(shift => shift.id.toString() === data.shift_id);
      if (!selectedShift) {
        throw new Error('Selected shift not found');
      }

      // Create the request with all required fields
      const requestData = {
        id: 0, // This will be set by the backend
        shift_id: parseInt(data.shift_id),
        employee_id: currentUser?.username || '',
        aanvraag_date: new Date().toISOString().split('T')[0],
        status: 'requested',
        shift_date: selectedShift.shift_date,
        start_time: selectedShift.start_time,
        end_time: selectedShift.end_time,
        location: selectedShift.location,
        notes: data.notes || undefined
      };

      console.log('Submitting service request:', requestData);
      return serviceRequestsApi.create(requestData);
    },
    onSuccess: () => {
      toast.success('Service request submitted successfully');
      navigate('/my-service-requests');
    },
    onError: (error) => {
      console.error('Error submitting request:', error);
      toast.error(`Failed to submit request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const onSubmit = (data: FormValues) => {
    createRequest(data);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>New Service Request</CardTitle>
          <CardDescription>
            Select a shift you would like to work on. Your request will be reviewed by a planner or admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="shift_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Shift</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={shiftsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableShifts.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id.toString()}>
                            {format(new Date(shift.shift_date), 'PPP')} - {shift.location} ({shift.start_time} - {shift.end_time})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose from available shifts that you would like to work on
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional information about your request..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Any other details you'd like to include?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/my-service-requests')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 