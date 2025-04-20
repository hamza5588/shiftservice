import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Calendar,
  ClipboardList,
  FileText,
  Menu,
  Users,
  X,
  User,
  LogOut,
  MessageSquare,
  Clock,
  Settings,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  UserCog,
  Receipt,
  Shield,
  MapPin,
  Building2,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission, hasRole } from '@/lib/permissions';

type SidebarLink = {
  title: string;
  path: string;
  icon: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string | string[];
  section?: string;
};

const links: SidebarLink[] = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <BarChart3 className="h-5 w-5" />,
    requiredPermission: 'view_dashboard',
    requiredRole: 'admin',
  },
  {
    title: 'My Dashboard',
    path: '/employee-dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    requiredRole: 'employee',
  },
  // Employee Dashboard Sections
  {
    title: 'Upcoming Shifts',
    path: '/employee-dashboard/shifts',
    icon: <Calendar className="h-5 w-5" />,
    requiredRole: 'employee',
    section: 'employee-dashboard',
  },
  {
    title: 'My Service Requests',
    path: '/my-service-requests',
    icon: <ListChecks className="h-5 w-5" />,
    requiredRole: 'employee',
    section: 'employee-dashboard',
  },
  {
    title: 'New Service Request',
    path: '/service-requests/new',
    icon: <PlusCircle className="h-5 w-5" />,
    requiredRole: 'employee',
    section: 'employee-dashboard',
  },
  {
    title: 'Update Profile',
    path: '/employee-dashboard/profile',
    icon: <UserCog className="h-5 w-5" />,
    requiredRole: 'employee',
    section: 'employee-dashboard',
  },
  {
    title: 'View Payroll',
    path: '/employee-dashboard/payroll',
    icon: <Receipt className="h-5 w-5" />,
    requiredRole: 'employee',
    section: 'employee-dashboard',
  },
  // Regular Navigation
  {
    title: 'Shifts',
    path: '/shifts',
    icon: <Calendar className="h-5 w-5" />,
    requiredPermission: 'view_shifts',
  },
  {
    title: 'Service Requests',
    path: '/service-requests',
    icon: <ClipboardList className="h-5 w-5" />,
    requiredPermission: 'view_shift_requests',
  },
  {
    title: 'Calendar',
    path: '/calendar',
    icon: <Calendar className="h-5 w-5" />,
    requiredPermission: 'view_calendar',
  },
  {
    title: 'Invoicing',
    path: '/invoicing',
    icon: <FileText className="h-5 w-5" />,
    requiredPermission: 'manage_invoices',
  },
  {
    title: 'Payroll',
    path: '/payroll',
    icon: <FileText className="h-5 w-5" />,
    requiredPermission: 'view_payroll',
  },
  {
    title: 'Employees',
    path: '/employees',
    icon: <Users className="h-5 w-5" />,
    requiredPermission: 'view_employees',
  },
  {
    title: 'Users',
    path: '/users',
    icon: <Users className="h-5 w-5" />,
    requiredPermission: 'manage_users',
  },
  {
    title: 'Roles',
    path: '/roles',
    icon: <Shield className="h-5 w-5" />,
    requiredPermission: 'manage_roles',
  },
  {
    title: 'Locations',
    path: '/locations',
    icon: <MapPin className="h-5 w-5" />,
    requiredPermission: 'manage_locations',
  },
  {
    title: 'Location Rates',
    path: '/location-rates',
    icon: <DollarSign className="h-5 w-5" />,
    requiredPermission: 'manage_rates',
  },
  {
    title: 'Clients',
    path: '/clients',
    icon: <Building2 className="h-5 w-5" />,
    requiredPermission: 'manage_clients',
  },
  {
    title: 'Messages',
    path: '/messages',
    icon: <MessageSquare className="h-5 w-5" />,
    requiredPermission: 'view_messages',
  },
  {
    title: 'Timeline',
    path: '/timeline',
    icon: <Clock className="h-5 w-5" />,
    requiredPermission: 'view_timeline',
  },
  {
    title: 'Auto-Approval Settings',
    path: '/admin/auto-approval',
    icon: <Shield className="h-5 w-5" />,
    requiredRole: ['admin', 'planner'],
  },
];

export function AppSidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const filteredLinks = links.filter(link => {
    if (link.requiredPermission) {
      return hasPermission(user?.roles || [], link.requiredPermission);
    }
    if (link.requiredRole) {
      return hasRole(user?.roles || [], link.requiredRole);
    }
    return true;
  });

  // Group links by section
  const groupedLinks = filteredLinks.reduce((acc, link) => {
    if (link.section) {
      if (!acc[link.section]) {
        acc[link.section] = [];
      }
      acc[link.section].push(link);
    } else {
      if (!acc.main) {
        acc.main = [];
      }
      acc.main.push(link);
    }
    return acc;
  }, {} as Record<string, SidebarLink[]>);

  return (
    <>
      <div className="fixed top-4 left-4 z-20 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="bg-white shadow-md"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-10 bg-black/50 md:hidden",
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
          "transition-opacity duration-300"
        )}
        onClick={toggleSidebar}
      />

      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-20 flex w-64 flex-col transition-transform duration-300",
          !isSidebarOpen && "-translate-x-full",
          "md:relative md:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <div className="bg-white rounded-md p-1">
              <img
                src="/placeholder.svg"
                alt="Secufy"
                className="h-8 w-8"
              />
            </div>
            <span className="font-bold text-xl">Secufy</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto py-4">
          <nav className="space-y-6 px-2">
            {Object.entries(groupedLinks).map(([section, sectionLinks]) => (
              <div key={section}>
                {section !== 'main' && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    {section === 'employee-dashboard' ? 'Employee Dashboard' : section}
                  </h3>
                )}
                <div className="space-y-1">
                  {sectionLinks.map((link) => (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                        )
                      }
                      end={link.path === '/'}
                    >
                      <span className="mr-3">{link.icon}</span>
                      {link.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center mb-4">
            <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
              <User className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="font-medium text-sidebar-foreground">{user?.full_name}</p>
              <p className="text-xs opacity-70">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}
