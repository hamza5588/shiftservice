import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

// Mock data - replace with actual API call
const mockShifts = [
  {
    id: 1,
    date: new Date(),
    startTime: '09:00',
    endTime: '17:00',
    location: 'Main Office',
    type: 'Regular Shift'
  },
  // Add more mock shifts as needed
];

const Calendar = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shifts, setShifts] = useState(mockShifts);

  // Mock function to fetch shifts - replace with actual API call
  const fetchShifts = async (date: Date) => {
    // In a real implementation, this would be an API call
    console.log('Fetching shifts for:', date);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    fetchShifts(date);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>My Schedule</CardTitle>
          <CardDescription>View your upcoming shifts and schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
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
            <div className="border rounded-lg p-4">
              {shifts.length > 0 ? (
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium">{shift.type}</h3>
                        <p className="text-sm text-gray-500">
                          {shift.startTime} - {shift.endTime}
                        </p>
                        <p className="text-sm text-gray-500">{shift.location}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No shifts scheduled for this date
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