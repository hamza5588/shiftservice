import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hourIncreaseApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { Shift } from '@/lib/types';

interface HourIncreaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: Shift[];
}

export function HourIncreaseRequestModal({ isOpen, onClose, shifts }: HourIncreaseRequestModalProps) {
  const [selectedShift, setSelectedShift] = useState<number | null>(null);
  const [requestedEndTime, setRequestedEndTime] = useState('');
  const queryClient = useQueryClient();

  const { mutate: requestHourIncrease, isLoading } = useMutation({
    mutationFn: hourIncreaseApi.request,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Hour increase request submitted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['hour-increase-requests'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit hour increase request',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift || !requestedEndTime) return;

    requestHourIncrease({
      shift_id: selectedShift,
      requested_end_time: requestedEndTime,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Hour Increase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shift">Select Shift</Label>
            <Select
              value={selectedShift?.toString()}
              onValueChange={(value) => setSelectedShift(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id.toString()}>
                    {new Date(shift.shift_date).toLocaleDateString()} - {shift.start_time} to {shift.end_time} at {shift.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">New End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={requestedEndTime}
              onChange={(e) => setRequestedEndTime(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 