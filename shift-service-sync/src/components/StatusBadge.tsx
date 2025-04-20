import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return {
          label: 'Open',
          variant: 'default' as const,
        };
      case 'betaald':
        return {
          label: 'Paid',
          variant: 'success' as const,
        };
      case 'herinnering14':
        return {
          label: 'Reminder 14',
          variant: 'warning' as const,
        };
      case 'herinnering30':
        return {
          label: 'Reminder 30',
          variant: 'destructive' as const,
        };
      case 'pending':
        return {
          label: 'Pending',
          variant: 'secondary' as const,
        };
      case 'approved':
        return {
          label: 'Approved',
          variant: 'success' as const,
        };
      case 'rejected':
        return {
          label: 'Rejected',
          variant: 'destructive' as const,
        };
      case 'canceled':
        return {
          label: 'Canceled',
          variant: 'destructive' as const,
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={cn('capitalize', className)}
    >
      {config.label}
    </Badge>
  );
}
