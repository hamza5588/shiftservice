import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Permissions, hasAnyPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/use-toast';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const userRoles = user?.roles || [];

  const navItems = [
    // Dashboard - Only for admin and planner
    {
      path: '/',
      label: 'Dashboard',
      permissions: [Permissions.VIEW_DASHBOARD],
    },
    // Shifts - Different views for different roles
    {
      path: '/shifts',
      label: 'Shifts',
      permissions: [Permissions.VIEW_SHIFTS, Permissions.VIEW_OWN_SHIFTS],
    },
    // Service Requests - Different views for different roles
    {
      path: '/service-requests',
      label: 'Service Requests',
      permissions: [
        Permissions.VIEW_SHIFT_REQUESTS,
        Permissions.SUBMIT_SHIFT_REQUESTS,
        Permissions.VIEW_OWN_REQUESTS
      ],
    },
    // Calendar - Different views for different roles
    {
      path: '/calendar',
      label: 'Calendar',
      permissions: [Permissions.VIEW_CALENDAR, Permissions.VIEW_OWN_CALENDAR],
    },
    // Invoicing - Admin only
    {
      path: '/invoicing',
      label: 'Invoicing',
      permissions: [Permissions.MANAGE_INVOICES],
    },
    // Payroll - Admin for all, employees for own
    {
      path: '/payroll',
      label: 'Payroll',
      permissions: [Permissions.VIEW_PAYROLL, Permissions.VIEW_OWN_PAYROLL],
    },
    // Employees - Admin and planner for all, employees for own profile
    {
      path: '/employees',
      label: 'Employees',
      permissions: [Permissions.VIEW_EMPLOYEES],
    },
    // Profile - For employees to view/edit their own profile
    {
      path: '/profile',
      label: 'My Profile',
      permissions: [Permissions.VIEW_OWN_PROFILE],
    },
    // Users Management - Admin only
    {
      path: '/users',
      label: 'Users Management',
      permissions: [Permissions.MANAGE_USERS],
    },
    // Messages & Announcements
    {
      path: '/messages',
      label: 'Messages',
      permissions: [Permissions.VIEW_MESSAGES],
    },
    // Timeline
    {
      path: '/timeline',
      label: 'Timeline',
      permissions: [Permissions.VIEW_TIMELINE],
    },
  ];

  // Filter nav items based on user permissions
  const authorizedNavItems = navItems.filter(item => 
    hasAnyPermission(userRoles, item.permissions)
  );

  const handleLogout = () => {
    logout();
    toast({
      title: "Success",
      description: "You have been logged out successfully.",
    });
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-800">Shift Management</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {authorizedNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                    location.pathname === item.path
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">{user.full_name}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 