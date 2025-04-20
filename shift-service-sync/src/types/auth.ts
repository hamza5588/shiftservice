export enum Permissions {
  MANAGE_INVOICES = 'manage_invoices',
  VIEW_PAYROLL = 'view_payroll',
  MANAGE_PAYROLL = 'manage_payroll'
}

export interface User {
  id: number;
  email: string;
  permissions: Permissions[];
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
} 