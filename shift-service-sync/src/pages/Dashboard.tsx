import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, shiftsApi, serviceRequestsApi, payrollApi, employeesApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart3, 
  Calendar, 
  ClipboardList, 
  DollarSign, 
  Users,
  ArrowUp,
  ArrowDown,
  Plus,
  Download
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, FileText, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
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

interface ServiceRequest {
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

interface PayrollEntry {
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

export default function Dashboard() {
  const { user } = useAuth();

  console.log('User object:', user);
  console.log('User roles:', user?.roles);

  if (!user) {
    return <div>Loading...</div>;
  }

  // Debug logging for role checking
  const isAdmin = user.roles?.includes('admin');
  const isPlanner = user.roles?.includes('planner');
  const isEmployee = user.roles?.includes('employee');

  console.log('Role checks:', {
    isAdmin,
    isPlanner,
    isEmployee,
    roles: user.roles
  });

  return (
    <div className="container mx-auto py-6">
      {isAdmin && <AdminDashboard />}
      {isPlanner && <PlannerDashboard />}
      {isEmployee && <EmployeeDashboard />}
      {!isAdmin && !isPlanner && !isEmployee && (
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">Welcome to Your Dashboard</h2>
          <p className="text-gray-600">You don't have any specific role assignments yet.</p>
        </div>
      )}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

function StatsCard({ title, value, icon, trend, isLoading }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="rounded-lg bg-primary/10 p-2">
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center text-xs font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <ArrowUp className="mr-1 h-3 w-3" />
              ) : (
                <ArrowDown className="mr-1 h-3 w-3" />
              )}
              {trend.value}%
            </div>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold">
            {isLoading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
            ) : (
              value
            )}
          </div>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const AdminDashboard = () => {
  // Query for dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  // Query for upcoming shifts
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: shiftsApi.getAll,
  });

  // Query for pending service requests
  const { data: serviceRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['service-requests'],
    queryFn: serviceRequestsApi.getAll,
  });

  // Get upcoming shifts (next 5 days)
  const upcomingShifts = Array.isArray(shifts) ? shifts.slice(0, 5) : [];

  // Get pending service requests with proper null checks
  const pendingRequests = Array.isArray(serviceRequests) 
    ? serviceRequests.filter((req: ServiceRequest) => req && req.status === 'requested').slice(0, 5) 
    : [];

  // Ensure stats is an object before accessing properties
  const statsData = stats || {
    total_shifts: 0,
    shift_stats: {},
    total_shift_hours: 0,
    total_dienstaanvragen: 0,
    dienstaanvraag_stats: {},
    total_facturen: 0,
    factuur_stats: {},
    total_factuur_amount: 0,
    timestamp: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.total_shifts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsData.shift_stats['open'] || 0} open, {statsData.shift_stats['completed'] || 0} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.total_shift_hours?.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">Worked hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.total_dienstaanvragen || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsData.dienstaanvraag_stats['pending'] || 0} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{statsData.total_factuur_amount?.toFixed(2) || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsData.factuur_stats['pending'] || 0} pending invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link to="/shifts">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Shifts
                </Button>
              </Link>
              <Link to="/service-requests">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Service Requests
                </Button>
              </Link>
              <Link to="/employees">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Employee Profiles
                </Button>
              </Link>
              <Link to="/payroll">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Payroll
                </Button>
              </Link>
              <Link to="/invoicing">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Invoicing
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(pendingRequests) && pendingRequests.map((request: ServiceRequest) => (
                <div key={request.id} className="flex items-start space-x-4">
                  <Bell className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">New service request</p>
                    <p className="text-xs text-muted-foreground">From: {request.employee_id}</p>
                  </div>
                </div>
              ))}
              {(!Array.isArray(pendingRequests) || pendingRequests.length === 0) && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const PlannerDashboard = () => {
  // Query for dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  // Query for upcoming shifts
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: shiftsApi.getAll,
  });

  // Query for pending service requests
  const { data: serviceRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['service-requests'],
    queryFn: serviceRequestsApi.getAll,
  });

  // Get upcoming shifts (next 5 days)
  const upcomingShifts = Array.isArray(shifts) ? shifts.slice(0, 5) : [];

  // Get pending service requests with proper null checks
  const pendingRequests = Array.isArray(serviceRequests) 
    ? serviceRequests.filter((req: ServiceRequest) => req && req.status === 'requested').slice(0, 5) 
    : [];

  // Ensure stats is an object before accessing properties
  const statsData = stats || {
    total_shifts: 0,
    shift_stats: {},
    total_shift_hours: 0,
    total_dienstaanvragen: 0,
    dienstaanvraag_stats: {},
    total_facturen: 0,
    factuur_stats: {},
    total_factuur_amount: 0,
    timestamp: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.total_shifts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsData.shift_stats['open'] || 0} open, {statsData.shift_stats['completed'] || 0} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.total_shift_hours?.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">Worked hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.total_dienstaanvragen || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsData.dienstaanvraag_stats['pending'] || 0} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{statsData.total_factuur_amount?.toFixed(2) || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsData.factuur_stats['pending'] || 0} pending invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common planner tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link to="/shifts">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Shifts
                </Button>
              </Link>
              <Link to="/service-requests">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Service Requests
                </Button>
              </Link>
              <Link to="/employees">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Employee Profiles
                </Button>
              </Link>
              <Link to="/payroll">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Payroll
                </Button>
              </Link>
              <Link to="/invoicing">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Invoicing
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(pendingRequests) && pendingRequests.map((request: ServiceRequest) => (
                <div key={request.id} className="flex items-start space-x-4">
                  <Bell className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">New service request</p>
                    <p className="text-xs text-muted-foreground">From: {request.employee_id}</p>
                  </div>
                </div>
              ))}
              {(!Array.isArray(pendingRequests) || pendingRequests.length === 0) && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const EmployeeDashboard = () => {
  const { user } = useAuth();

  // Query for employee profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['employee-profile'],
    queryFn: employeesApi.getMyProfile,
  });

  // Query for upcoming shifts
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['my-shifts'],
    queryFn: () => shiftsApi.getAll().then(shifts => 
      Array.isArray(shifts) ? shifts.filter(shift => shift.employee_id === user?.id) : []
    ),
  });

  // Query for service requests
  const { data: serviceRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['my-service-requests'],
    queryFn: serviceRequestsApi.getMyRequests,
  });

  // Query for payroll data
  const { data: payroll, isLoading: payrollLoading } = useQuery({
    queryKey: ['my-payroll'],
    queryFn: () => payrollApi.getMyPayroll(new Date().getFullYear()),
  });

  // Get upcoming shifts (next 5 days)
  const upcomingShifts = Array.isArray(shifts) ? shifts.slice(0, 5) : [];

  // Get pending service requests with proper null checks
  const pendingRequests = Array.isArray(serviceRequests) 
    ? serviceRequests.filter(req => req && req.status === 'requested').slice(0, 5) 
    : [];

  // Ensure payroll is an array before reducing
  const totalHours = Array.isArray(payroll) 
    ? payroll.reduce((sum: number, entry: PayrollEntry) => sum + (entry.total_hours || 0), 0).toFixed(1) 
    : '0';

  const totalEarnings = Array.isArray(payroll) 
    ? payroll.reduce((sum: number, entry: PayrollEntry) => sum + (entry.total_pay || 0), 0).toFixed(2) 
    : '0';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Upcoming Shifts"
          value={upcomingShifts.length}
          icon={<Calendar className="h-4 w-4" />}
          isLoading={shiftsLoading}
        />
        <StatsCard
          title="Service Requests"
          value={pendingRequests.length}
          icon={<ClipboardList className="h-4 w-4" />}
          isLoading={requestsLoading}
        />
        <StatsCard
          title="Total Hours"
          value={totalHours}
          icon={<BarChart3 className="h-4 w-4" />}
          isLoading={payrollLoading}
        />
        <StatsCard
          title="Total Earnings"
          value={`€${totalEarnings}`}
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={payrollLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common employee tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link to="/my-shifts">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  View My Shifts
                </Button>
              </Link>
              <Link to="/service-requests/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  New Service Request
                </Button>
              </Link>
              <Link to="/my-profile">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  My Profile
                </Button>
              </Link>
              <Link to="/my-payroll">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  My Payroll
                </Button>
              </Link>
              <Link to="/my-service-requests">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  My Service Requests
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => payrollApi.exportMyPayroll(new Date().getFullYear())}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Payroll
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingShifts.map((shift, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Upcoming shift</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(shift.shift_date).toLocaleDateString()} at {shift.location}
                    </p>
                  </div>
                </div>
              ))}
              {pendingRequests.map((request, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <ClipboardList className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Service request {request.status}</p>
                    <p className="text-xs text-muted-foreground">
                      For shift on {new Date(request.shift_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {upcomingShifts.length === 0 && pendingRequests.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
