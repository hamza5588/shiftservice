import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasAnyPermission } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  requiredRoles = [], 
  requiredPermissions = [] 
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user?.roles || [];

  // Check if the route requires a specific role
  if (requiredRole && !userRoles.includes(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  // Check if the route requires specific roles
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  // Check if the route requires specific permissions
  if (requiredPermissions.length > 0) {
    if (!hasAnyPermission(userRoles, requiredPermissions)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
} 