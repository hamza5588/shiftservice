import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Clock, Calendar, User, FileText, CheckCircle, AlertCircle } from 'lucide-react';

// Mock data - replace with actual API call
const mockTimelineEvents = [
  {
    id: 1,
    type: 'shift',
    title: 'Shift Scheduled',
    description: 'New shift scheduled for Monday, 9:00 AM - 5:00 PM',
    date: '2024-01-01',
    icon: Clock,
    status: 'upcoming'
  },
  {
    id: 2,
    type: 'request',
    title: 'Shift Change Request',
    description: 'Request to change shift time submitted',
    date: '2024-01-02',
    icon: Calendar,
    status: 'pending'
  },
  {
    id: 3,
    type: 'profile',
    title: 'Profile Updated',
    description: 'Contact information updated',
    date: '2024-01-03',
    icon: User,
    status: 'completed'
  },
  {
    id: 4,
    type: 'document',
    title: 'New Document',
    description: 'New schedule document uploaded',
    date: '2024-01-04',
    icon: FileText,
    status: 'completed'
  }
];

const Timeline = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState(mockTimelineEvents);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'pending' | 'completed'>('all');

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'upcoming':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>View your activity timeline and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'upcoming' ? 'default' : 'outline'}
                onClick={() => setFilter('upcoming')}
              >
                Upcoming
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilter('completed')}
              >
                Completed
              </Button>
            </div>

            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start space-x-4 border rounded-lg p-4"
                >
                  <div className="flex-shrink-0">
                    <event.icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{event.title}</h3>
                      {getStatusIcon(event.status)}
                    </div>
                    <p className="text-sm text-gray-500">{event.description}</p>
                    <div className="mt-2 text-xs text-gray-400">
                      {format(new Date(event.date), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Timeline; 