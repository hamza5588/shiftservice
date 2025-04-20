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
  const { data: stats, isLoading: statsLoading } = useQuery({
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
  const upcomingShifts = shifts?.slice(0, 5) || [];

  // Get pending service requests
  const pendingRequests = serviceRequests?.filter(req => req.status === 'requested').slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_shifts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.shift_stats?.open || 0} open, {stats?.shift_stats?.completed || 0} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_shift_hours?.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">Worked hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_dienstaanvragen || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.dienstaanvraag_stats?.pending || 0} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats?.total_factuur_amount?.toFixed(2) || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.factuur_stats?.pending || 0} pending invoices
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
              {pendingRequests.map((request, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <Bell className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">New service request</p>
                    <p className="text-xs text-muted-foreground">From: {request.medewerker_id}</p>
                  </div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
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
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Shift Overview</CardTitle>
            <CardDescription>Today's schedule and assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Morning Shift</h3>
                    <p className="text-sm text-gray-500">9:00 AM - 5:00 PM</p>
                    <p className="text-sm text-gray-500">Main Office</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>Awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Shift Change Request</h3>
                    <p className="text-sm text-gray-500">From: John Doe</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">Approve</Button>
                    <Button variant="outline" size="sm">Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Assign</CardTitle>
            <CardDescription>Assign shifts quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Select Employee</label>
                <select className="w-full p-2 border rounded-md">
                  <option>John Doe</option>
                  <option>Jane Smith</option>
                  <option>Mike Johnson</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Select Shift</label>
                <select className="w-full p-2 border rounded-md">
                  <option>Morning Shift (9:00 AM - 5:00 PM)</option>
                  <option>Evening Shift (5:00 PM - 1:00 AM)</option>
                  <option>Night Shift (1:00 AM - 9:00 AM)</option>
                </select>
              </div>
              <Button className="w-full">Assign Shift</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Favorites</CardTitle>
            <CardDescription>Frequently used locations and employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Locations</h3>
                <div className="space-y-2">
                  {['Main Office', 'Branch Office', 'Remote'].map((location) => (
                    <div key={location} className="flex items-center justify-between p-2 border rounded-lg">
                      <span>{location}</span>
                      <Button variant="ghost" size="sm">Use</Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Employees</h3>
                <div className="space-y-2">
                  {['John Doe', 'Jane Smith', 'Mike Johnson'].map((employee) => (
                    <div key={employee} className="flex items-center justify-between p-2 border rounded-lg">
                      <span>{employee}</span>
                      <Button variant="ghost" size="sm">Assign</Button>
                    </div>
                  ))}
                </div>
              </div>
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
    queryFn: shiftsApi.getMyShifts,
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
  const upcomingShifts = shifts?.slice(0, 5) || [];

  // Get pending service requests
  const pendingRequests = serviceRequests?.filter(req => req.status === 'requested').slice(0, 5) || [];

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
          value={payroll?.reduce((sum, entry) => sum + entry.hours_worked, 0).toFixed(1) || '0'}
          icon={<BarChart3 className="h-4 w-4" />}
          isLoading={payrollLoading}
        />
        <StatsCard
          title="Total Earnings"
          value={`€${payroll?.reduce((sum, entry) => sum + entry.total_earnings, 0).toFixed(2) || '0'}`}
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
