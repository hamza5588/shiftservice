
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-6">
            <div className="text-primary text-8xl font-bold">404</div>
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="text-lg text-muted-foreground">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
