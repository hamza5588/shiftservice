import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shifts from "./pages/Shifts";
import ServiceRequests from "./pages/ServiceRequests";
import Invoicing from "./pages/Invoicing";
import Payroll from "./pages/Payroll";
import Employees from "./pages/Employees";
import UsersManagement from "./pages/UsersManagement";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";
import Messages from "./pages/Messages";
import Timeline from "./pages/Timeline";
import NotFound from "./pages/NotFound";
import { Permissions } from "@/lib/permissions";
import { AppLayout } from "@/components/AppLayout";
import NewServiceRequest from '@/pages/NewServiceRequest';
import MyServiceRequests from '@/pages/MyServiceRequests';
import RoleManagement from './pages/RoleManagement';
import Locations from './pages/Locations';
import AutoApprovalSettings from './pages/AutoApprovalSettings';
import Clients from './pages/Clients';
import { LocationRates } from './components/LocationRates';

// Create a client
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.VIEW_DASHBOARD]}>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-dashboard"
              element={
                <ProtectedRoute requiredRole="employee">
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-dashboard/shifts"
              element={
                <ProtectedRoute requiredRole="employee">
                  <AppLayout>
                    <Shifts />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-dashboard/requests"
              element={
                <ProtectedRoute requiredRole="employee">
                  <AppLayout>
                    <ServiceRequests />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-dashboard/new-request"
              element={
                <ProtectedRoute requiredRole="employee">
                  <AppLayout>
                    <ServiceRequests />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-dashboard/profile"
              element={
                <ProtectedRoute requiredRole="employee">
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-dashboard/payroll"
              element={
                <ProtectedRoute requiredRole="employee">
                  <AppLayout>
                    <Payroll />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shifts"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.VIEW_SHIFTS, Permissions.VIEW_OWN_SHIFTS]}>
                  <AppLayout>
                    <Shifts />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/service-requests"
              element={
                <ProtectedRoute 
                  requiredPermissions={[
                    Permissions.VIEW_SHIFT_REQUESTS,
                    Permissions.SUBMIT_SHIFT_REQUESTS,
                    Permissions.VIEW_OWN_REQUESTS
                  ]}
                >
                  <AppLayout>
                    <ServiceRequests />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.VIEW_CALENDAR, Permissions.VIEW_OWN_CALENDAR]}>
                  <AppLayout>
                    <Calendar />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoicing"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.MANAGE_INVOICES]}>
                  <AppLayout>
                    <Invoicing />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoicing/:id"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.MANAGE_INVOICES]}>
                  <AppLayout>
                    <Invoicing />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.VIEW_PAYROLL, Permissions.VIEW_OWN_PAYROLL]}>
                  <AppLayout>
                    <Payroll />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.VIEW_EMPLOYEES]}>
                  <AppLayout>
                    <Employees />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.VIEW_OWN_PROFILE]}>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.MANAGE_USERS]}>
                  <AppLayout>
                    <UsersManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.MANAGE_ROLES]}>
                  <AppLayout>
                    <RoleManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.VIEW_MESSAGES]}>
                  <AppLayout>
                    <Messages />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/timeline"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.VIEW_TIMELINE]}>
                  <AppLayout>
                    <Timeline />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-service-requests"
              element={
                <ProtectedRoute requiredRole="employee">
                  <AppLayout>
                    <MyServiceRequests />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/service-requests/new"
              element={
                <ProtectedRoute requiredRole="employee">
                  <AppLayout>
                    <NewServiceRequest />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.MANAGE_LOCATIONS]}>
                  <AppLayout>
                    <Locations />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute requiredPermissions={[Permissions.MANAGE_CLIENTS]}>
                  <AppLayout>
                    <Clients />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/auto-approval"
              element={
                <ProtectedRoute requiredRoles={['admin', 'planner']}>
                  <AppLayout>
                    <AutoApprovalSettings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-rates"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout>
                    <LocationRates />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
