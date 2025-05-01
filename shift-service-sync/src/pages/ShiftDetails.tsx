import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { shiftsApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

const ShiftDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const shiftId = parseInt(id || '0');

  const { data: shift, isLoading, error } = useQuery({
    queryKey: ['shift', shiftId],
    queryFn: () => shiftsApi.getById(shiftId),
    enabled: !!shiftId,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !shift) {
    return <div>Error loading shift details</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Shift Details</CardTitle>
              <CardDescription>View and manage shift information</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/calendar')}>
              Back to Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-lg">{shift.title}</h3>
              <Badge variant={shift.status === 'approved' ? 'default' : 'secondary'}>
                {shift.status}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Date and Time</h4>
                <p>{format(parseISO(shift.shift_date), 'EEEE, MMMM d, yyyy')}</p>
                <p>{shift.start_time} - {shift.end_time}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Location</h4>
                <p>{shift.location}</p>
                {shift.location_details && (
                  <>
                    <p>{shift.location_details.stad}</p>
                    <p>{shift.location_details.provincie}</p>
                    <p>{shift.location_details.adres}</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Employee</h4>
                <p>{shift.employee_id || 'Unassigned'}</p>
              </div>

              {shift.required_profile && (
                <div className="space-y-2">
                  <h4 className="font-medium">Required Profile</h4>
                  <p>{shift.required_profile}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/shifts/${shift.id}/edit`)}>
                Edit Shift
              </Button>
              <Button variant="outline" onClick={() => navigate('/calendar')}>
                Back to Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftDetails; 