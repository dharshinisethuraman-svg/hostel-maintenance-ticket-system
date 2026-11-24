import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component:
 * - Guards routes from unauthenticated users.
 * - Enforces role-based permissions (Student, Staff, Admin).
 * - Redirects unauthorized roles to their respective dashboards.
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Show loading indicator while session is being verified on refresh
  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex flex-col items-center justify-center p-6 transition-colors">
        <div className="w-10 h-10 rounded-full animate-spin border-3 border-app-primary border-t-transparent mb-4"></div>
        <p className="text-sm font-medium text-app-muted">Verifying your secure session...</p>
      </div>
    );
  }

  // 2. If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If route specifies allowed roles and user's role is not included:
  // Redirect user to their own permitted home screen to prevent access violation
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const roleHomeMap = {
      student: '/student',
      staff: '/staff',
      admin: '/admin',
    };
    const destination = roleHomeMap[user.role] || '/login';
    return <Navigate to={destination} replace />;
  }

  return children;
}
