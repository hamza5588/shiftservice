import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { payrollService, PayrollDocument } from '../../services/payrollService';

interface PayrollDocumentsProps {
  employeeId: number;
}

export const PayrollDocuments: React.FC<PayrollDocumentsProps> = ({ employeeId }) => {
  const [documents, setDocuments] = useState<PayrollDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [employeeId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await payrollService.listPayrollDocuments(employeeId);
      setDocuments(data);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await payrollService.uploadPayrollDocument(employeeId, selectedFile);
      setSelectedFile(null);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to upload document:', err);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const blob = await payrollService.downloadPayrollDocument(employeeId, filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download document:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Payroll Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="file"
              onChange={handleFileSelect}
              className="border rounded px-2 py-1"
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile}
            >
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {documents.length === 0 ? (
              <p className="text-gray-500">No documents available</p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.filename}
                  className="flex justify-between items-center p-2 border rounded"
                >
                  <div>
                    <p className="font-semibold">{doc.filename}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(doc.filename)}
                  >
                    Download
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 