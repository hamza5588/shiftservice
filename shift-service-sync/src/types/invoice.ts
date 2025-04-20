export interface Invoice {
  id: number;
  opdrachtgever_id: number;
  locatie: string;
  factuurdatum: string;
  bedrag: number;
  status: 'open' | 'betaald' | 'herinnering14' | 'herinnering30';
  factuur_text?: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  shift_id: number;
  date: string;
  start_time: string;
  end_time: string;
  hours_worked: number;
  rate_type: string;
  base_rate: number;
  bonus_percentage: number;
  total_amount: number;
}

export interface PayrollEntry {
  id: number;
  employee_id: string;
  period_id: number;
  total_hours: number;
  base_salary: number;
  evening_bonus: number;
  night_bonus: number;
  weekend_bonus: number;
  holiday_bonus: number;
  new_year_bonus: number;
  phone_allowance: number;
  meal_allowance: number;
  travel_allowance: number;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriod {
  id: number;
  year: number;
  period_number: number;
  start_date: string;
  end_date: string;
  status: string;
}

export interface TimeBonus {
  normal: number;
  evening: number;
  night: number;
  weekend: number;
  holiday: number;
  new_year: number;
}

export interface InvoiceBreakdown {
  day: {
    hours: number;
    rate: number;
    total: number;
  };
  evening: {
    hours: number;
    rate: number;
    total: number;
  };
  night: {
    hours: number;
    rate: number;
    total: number;
  };
  weekend: {
    hours: number;
    rate: number;
    total: number;
  };
  holiday: {
    hours: number;
    rate: number;
    total: number;
  };
  new_year: {
    hours: number;
    rate: number;
    total: number;
  };
  subtotal: number;
  vat: number;
  total: number;
} 