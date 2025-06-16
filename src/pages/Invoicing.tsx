import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useMutation } from 'react-query';
import { toast } from '@/components/ui/use-toast';

export default function Invoicing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Remove the viewedInvoice memo since we'll use selectedInvoice directly
  const viewedInvoice = selectedInvoice;

  const filteredInvoices = invoices?.filter(invoice => {
    return searchQuery === '' || 
      invoice.opdrachtgever_naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.factuurnummer?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      if (!invoice.id) {
        throw new Error('Invalid invoice ID');
      }
      return invoicesApi.send(invoice.id);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Invoice sent successfully',
      });
      refetch();
    },
    onError: (error) => {
      console.error('Send error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invoice',
        variant: 'destructive',
      });
    },
  });

  <Dialog open={viewInvoiceId !== null} onOpenChange={(open) => {
    if (!open) {
      setViewInvoiceId(null);
      setSelectedInvoice(null);
    }
  }}>
    <DialogContent className="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>Factuur {viewedInvoice?.factuurnummer || viewedInvoice?.id}</DialogTitle>
      </DialogHeader>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Spinner className="w-8 h-8" />
        </div>
      ) : viewedInvoice ? (
        <div className="space-y-6">
          {console.log('Viewed Invoice Data:', {
            id: viewedInvoice.id,
            factuurnummer: viewedInvoice.factuurnummer,
            factuur_text: viewedInvoice.factuur_text,
            opdrachtgever_naam: viewedInvoice.opdrachtgever_naam,
            locatie: viewedInvoice.locatie,
            bedrag: viewedInvoice.bedrag,
            status: viewedInvoice.status,
            breakdown: viewedInvoice.breakdown
          })}
          <InvoiceTemplate invoice={viewedInvoice} />
        </div>
      ) : (
        <div className="text-center p-8 text-muted-foreground">
          Factuur niet gevonden
        </div>
      )}
    </DialogContent>
  </Dialog>

<Button 
  variant="ghost" 
  size="icon"
  onClick={() => {
    console.log('Setting selected invoice:', invoice);
    setSelectedInvoice(invoice);
    setViewInvoiceId(invoice.id);
  }}
>
  <Eye className="h-4 w-4" />
</Button> 