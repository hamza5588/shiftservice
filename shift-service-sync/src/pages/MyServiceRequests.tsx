import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { serviceRequestsApi } from '@/lib/api';
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
import { Search, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';

export default function MyServiceRequests() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'requested' | 'approved' | 'rejected'>('all');

  // Query for service requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['my-service-requests'],
    queryFn: serviceRequestsApi.getMyRequests,
  });

  // Query for available shifts
  const { data: availableShifts, isLoading: shiftsLoading, error: shiftsError } = useQuery({
    queryKey: ['available-shifts', currentUser?.username],
    queryFn: async () => {
      try {
        console.log('Fetching available shifts...');
        const result = await serviceRequestsApi.getAvailableShifts();
        console.log('Available shifts result:', result);
        
        if (!Array.isArray(result)) {
          throw new Error('Invalid response format: expected an array of shifts');
        }
        
        // Show all available shifts that are not assigned to the current user
        return result.filter(shift => {
          if (!shift) return false;
          return shift.employee_id !== currentUser?.username;
        });
      } catch (error) {
        console.error('Error fetching available shifts:', error);
        if (error instanceof Error) {
          const errorData = (error as any).data;
          if (errorData) {
            throw new Error(`Failed to fetch available shifts: ${JSON.stringify(errorData)}`);
          }
          throw new Error(`Failed to fetch available shifts: ${error.message}`);
        }
        throw new Error('Failed to fetch available shifts: Unknown error');
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    enabled: !!currentUser,
  });

  const filteredRequests = requests?.filter(request => {
    const matchesSearch = searchQuery === '' || 
      request.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredShifts = availableShifts?.filter(shift => {
    const matchesSearch = searchQuery === '' || 
      (shift.location_details?.naam?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (shift.titel?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'open':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  // Add error display in the UI
  if (shiftsError) {
    console.error('Shifts error:', shiftsError);
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Service Requests</h1>
          <p className="text-muted-foreground">View and manage your shift requests</p>
        </div>
        <Link to="/service-requests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Requests</CardTitle>
          <CardDescription>
            View your service requests and available shifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="available" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available">Available Shifts</TabsTrigger>
              <TabsTrigger value="requests">My Requests</TabsTrigger>
            </TabsList>
            <TabsContent value="available">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shifts..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                {shiftsLoading ? (
                  <div className="text-center py-4">Loading available shifts...</div>
                ) : shiftsError ? (
                  <div className="text-center text-destructive py-4">
                    {shiftsError instanceof Error ? shiftsError.message : 'Error loading available shifts'}
                  </div>
                ) : filteredShifts.length === 0 ? (
                  <div className="text-center py-4">No available shifts found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell>
                            {new Date(shift.shift_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {shift.start_time} - {shift.end_time}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{shift.location_details?.naam}</div>
                            <div className="text-xs text-muted-foreground">
                              {shift.stad}, {shift.provincie}
                            </div>
                          </TableCell>
                          <TableCell>{shift.titel}</TableCell>
                          <TableCell>{shift.required_profile}</TableCell>
                          <TableCell>
                            <StatusBadge status={shift.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/service-requests/new?shift_id=${shift.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                Request Shift
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
            <TabsContent value="requests">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="requested">Pending</TabsTrigger>
                      <TabsTrigger value="approved">Approved</TabsTrigger>
                      <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Requested</TableHead>
                      <TableHead>Shift Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsLoading ? (
                      // Loading state
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(6)].map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-5 bg-muted animate-pulse rounded"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredRequests.length > 0 ? (
                      filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {request.aanvraag_date ? new Date(request.aanvraag_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            {request.shift_date ? new Date(request.shift_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            {request.start_time && request.end_time 
                              ? `${request.start_time.slice(0, 5)} - ${request.end_time.slice(0, 5)}` 
                              : '-'}
                          </TableCell>
                          <TableCell>{request.location || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(request.status)}
                              <StatusBadge status={request.status} />
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-32">
                          No service requests found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 