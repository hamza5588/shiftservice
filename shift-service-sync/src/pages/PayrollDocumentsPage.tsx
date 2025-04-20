import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { payrollApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Upload, Download, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function PayrollDocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  // Query for payroll documents
  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['payroll-documents'],
    queryFn: payrollApi.listUploads,
  });

  // Mutation for uploading payroll document
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return payrollApi.upload(formData);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Payroll document uploaded successfully',
      });
      setIsUploadDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredDocuments = documents?.filter(doc => {
    return searchQuery === '' || 
      doc.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title m-0">Payroll Documents</h1>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Payroll Document</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !selectedFile}
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-card rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading state
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-5 bg-muted animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-5 bg-muted animate-pulse rounded w-8"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <TableRow key={doc}>
                  <TableCell>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      {doc}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => payrollApi.download(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center h-32">
                  No documents found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 