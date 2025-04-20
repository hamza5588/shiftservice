export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  roles: string[];
}

export type StatusType = 'open' | 'pending' | 'approved' | 'rejected' | 'canceled';

export interface Shift {
  id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  location_id: number;
  location?: string;
  location_details?: {
    stad: string;
    provincie: string;
    adres: string;
  };
  status: StatusType;
  employee_id?: string;
  title: string;
  required_profile?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceRequest {
  id: number;
  shift_id: number;
  employee_id: string;
  aanvraag_date: string;
  status: 'requested' | 'approved' | 'rejected' | 'open';
  shift_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
}

export interface Employee {
  id: number;
  username: string;
  email: string;
  full_name: string;
  roles: string[];
  personeelsnummer: number;
  uurloner: boolean;
  telefoonvergoeding_per_uur: number;
  maaltijdvergoeding_per_uur: number;
  de_minimis_bonus_per_uur: number;
  wkr_toeslag_per_uur: number;
  kilometervergoeding: number;
  max_km: number;
  hourly_allowance: number;
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
  kvk_nummer?: string;
  adres?: string;
  postcode?: string;
  stad?: string;
  telefoon?: string;
  email?: string;
}

export interface InvoiceCreate {
  opdrachtgever_id: number;
  opdrachtgever_naam: string;
  locatie: string;
  factuurdatum: string;
  shift_date: string;
  shift_date_end: string;
  bedrag: number;
  factuur_text?: string;
  kvk_nummer?: string;
  adres?: string;
  postcode?: string;
  stad?: string;
  telefoon?: string;
  email?: string;
}

export interface PayrollEntry {
  employee_id: string;
  personeelsnummer: number;
  naam: string;
  uurloner: boolean;
  total_days: number;
  total_hours: number;
  total_travel_cost: number;
  total_telefoon: number;
  total_maaltijd: number;
  total_de_minimis: number;
  total_wkr: number;
  total_km_vergoeding: number;
  bonus_percentage: number;
  base_pay: number;
  total_pay: number;
  shifts: Array<{
    shift_id: string;
    date: string;
    hours: number;
    bonus: number;
    travel_cost: number;
  }>;
  opmerkingen?: string;
  periode?: number;
  periode_start?: string;
  periode_end?: string;
}

export interface DashboardStats {
  total_shifts: number;
  shift_stats: Record<string, number>;
  total_shift_hours: number;
  total_dienstaanvragen: number;
  dienstaanvraag_stats: Record<string, number>;
  total_facturen: number;
  factuur_stats: Record<string, number>;
  total_factuur_amount: number;
  timestamp: string;
}

export interface EmployeeDashboardData {
  shifts: Shift[];
  service_requests: ServiceRequest[];
  payroll: PayrollEntry;
  profile: Employee;
}

export interface Opdrachtgever {
  id: number;
  naam: string;
  email: string;
  telefoon: string;
  adres: string;
  postcode: string;
  stad: string;
  btw_nummer: string;
  kvk_nummer: string;
  bankrekening: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  naam: string;
  adres: string;
  stad: string;
  postcode: string;
  provincie?: string;
  opdrachtgever_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateInvoicePayload {
  opdrachtgever_id: number;
  opdrachtgever_naam: string;
  locatie: string;
  factuurdatum: string;
  shift_date?: string;
  bedrag: number;
  status: 'open' | 'betaald' | 'herinnering14' | 'herinnering30';
  factuur_text: string;
  invoice_number?: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  vat_amount: number;
  subtotal: number;
  breakdown: {
    [key: string]: {
      hours: number;
      rate: number;
      total: number;
    };
  };
  kvk_nummer?: string;
  adres?: string;
  postcode?: string;
  stad?: string;
  telefoon?: string;
  email?: string;
}

export interface LocationRate {
  id: number;
  location_id: number;
  pass_type: string;
  base_rate: number;
  evening_rate: number;
  night_rate: number;
  weekend_rate: number;
  holiday_rate: number;
  new_years_eve_rate: number;
  created_at: string;
  updated_at: string;
  location?: {
    id: number;
    naam: string;
  };
}

export interface LocationRateCreate {
  location_id: number;
  pass_type: string;
  base_rate: number;
  evening_rate: number;
  night_rate: number;
  weekend_rate: number;
  holiday_rate: number;
  new_years_eve_rate: number;
}
