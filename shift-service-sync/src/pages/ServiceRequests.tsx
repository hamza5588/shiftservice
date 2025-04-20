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
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ServiceRequests() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query for service requests
  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['service-requests'],
    queryFn: serviceRequestsApi.getAll,
  });

  const filteredRequests = requests?.filter(request => {
    return searchQuery === '' || 
      request.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedRequestId) return;
    
    try {
      if (action === 'approve') {
        await serviceRequestsApi.approve(selectedRequestId);
        toast.success("Service request approved successfully");
      } else {
        await serviceRequestsApi.reject(selectedRequestId);
        toast.success("Service request rejected");
      }
      refetch();
    } catch (error) {
      toast.error(`Failed to ${action} the request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setDialogOpen(false);
    setSelectedRequestId(null);
    setDialogAction(null);
  };

  const openDialog = (requestId: string, action: 'approve' | 'reject') => {
    setSelectedRequestId(requestId);
    setDialogAction(action);
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Service Requests</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Service Requests Table */}
      <div className="bg-card rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Requested</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Shift Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading state
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
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
                    {new Date(request.aanvraag_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {/* This would be replaced with actual employee name from the API */}
                    {request.employee_id === 'emp1' ? 'John Doe' : 
                     request.employee_id === 'emp2' ? 'Jane Smith' : request.employee_id}
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
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    {request.status === 'requested' && (
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => openDialog(request.id, 'approve')}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => openDialog(request.id, 'reject')}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32">
                  No service requests found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'approve' ? 'Approve Request' : 'Reject Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'approve' 
                ? 'Are you sure you want to approve this service request? This will create a new shift for the employee.'
                : 'Are you sure you want to reject this service request? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dialogAction && handleAction(dialogAction)}
              className={dialogAction === 'approve' ? 'bg-green-600' : 'bg-red-600'}
            >
              {dialogAction === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
