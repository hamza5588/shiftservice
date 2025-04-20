export interface Location {
  id: number;
  naam: string;
  opdrachtgever_id: number;
  adres: string;
  stad: string;
  postcode: string;
  provincie?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: number;
  opdrachtgever_id: number;
  opdrachtgever_naam: string;
  factuurnummer: string;
  locatie: string;
  factuurdatum: string;
  shift_date: string;
  shift_date_end: string;
  bedrag: number;
  status: string;
  factuur_text: string;
  kvk_nummer: string;
  adres: string;
  postcode: string;
  stad: string;
  telefoon: string;
  email: string;
  invoice_number: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  vat_amount: number;
  subtotal: number;
  vat_rate?: number;
  breakdown: {
    day: { hours: number; rate: number; total: number };
    evening: { hours: number; rate: number; total: number };
    night: { hours: number; rate: number; total: number };
    weekend: { hours: number; rate: number; total: number };
    holiday: { hours: number; rate: number; total: number };
    new_year_eve: { hours: number; rate: number; total: number };
  };
}

export interface CreateInvoicePayload {
  opdrachtgever_id: number;
  opdrachtgever_naam: string;
  factuurnummer: string;
  locatie: string;
  factuurdatum: string;
  shift_date: string;
  shift_date_end: string;
  bedrag: number;
  status: 'open' | 'betaald' | 'herinnering14' | 'herinnering30';
  factuur_text: string;
  kvk_nummer: string;
  adres: string;
  postcode: string;
  stad: string;
  telefoon: string;
  email: string;
  invoice_number: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  vat_amount: number;
  subtotal: number;
  vat_rate?: number;
  breakdown: {
    day: { hours: number; rate: number; total: number };
    evening: { hours: number; rate: number; total: number };
    night: { hours: number; rate: number; total: number };
    weekend: { hours: number; rate: number; total: number };
    holiday: { hours: number; rate: number; total: number };
    new_year_eve: { hours: number; rate: number; total: number };
  };
} 