import React from 'react';
import { AppSidebar } from './AppSidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar />
      <main className={cn("flex-1 p-6", className)}>
        {children}
      </main>
    </div>
  );
}
