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

  // Query for user's existing requests
  const { data: myRequests } = useQuery({
    queryKey: ['my-service-requests'],
    queryFn: serviceRequestsApi.getMyRequests,
  });

  // Filter shifts to only show open ones and not already requested
  const requestedShiftIds = (myRequests || []).map(r => r.shift_id);
  const availableShifts = (shifts || []).filter(shift => !requestedShiftIds.includes(shift.id));

  // Set the preselected shift when the component mounts
  useEffect(() => {
    if (preselectedShiftId) {
      form.setValue('shift_id', preselectedShiftId);
    }
  }, [preselectedShiftId, form]);

  // Mutation for creating service request
  const { mutate: createRequest, isLoading: isSubmitting } = useMutation({
    mutationFn: (data: FormValues) => {
      const selectedShift = availableShifts.find(shift => shift.id.toString() === data.shift_id);
      if (!selectedShift) {
        throw new Error('Selected shift not found');
      }

      const datum = String(selectedShift.shift_date?.split('T')[0] || selectedShift.shift_date);
      const start_tijd = selectedShift.start_time;
      const eind_tijd = selectedShift.end_time;
      const locatie = selectedShift.location_details?.naam || selectedShift.location || '';

      // Defensive checks
      if (!datum || !start_tijd || !eind_tijd || !locatie) {
        console.error('Missing required field:', { datum, start_tijd, eind_tijd, locatie });
        throw new Error('All fields (datum, start_tijd, eind_tijd, locatie) are required and must be valid.');
      }

      const requestData: any = {
        shift_id: parseInt(data.shift_id)
      };
      if (data.notes && data.notes.trim() !== '') {
        requestData.notes = data.notes;
      }
      console.log('Submitting service request:', requestData, JSON.stringify(requestData));
      return serviceRequestsApi.create(requestData);
    },
    onSuccess: () => {
      toast.success('Service request submitted successfully');
      navigate('/my-service-requests');
    },
    onError: (error: any) => {
      let message = 'Failed to submit request: ';
      if (error?.response) {
        try {
          const body = typeof error.response.data === 'string' ? JSON.parse(error.response.data) : error.response.data;
          if (body?.detail === 'You already have an active request for this shift') {
            message = 'You have already submitted a request for this shift.';
          } else if (body?.detail) {
            message += body.detail;
          } else {
            message += error.message || 'Unknown error';
          }
        } catch (e) {
          message += error.message || 'Unknown error';
        }
      } else if (error instanceof Error) {
        message += error.message;
      } else {
        message += 'Unknown error';
      }
      toast.error(message);
      console.error('Error submitting request:', error);
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