import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentHome from './pages/StudentHome';
import StaffHome from './pages/StaffHome';
import AdminHome from './pages/AdminHome';

/**
 * RootRedirect:
 * Directs visitors landing on "/" to their appropriate dashboard based on their active role,
 * or sends unauthenticated visitors to "/login".
 */
function RootRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 rounded-full animate-spin border-3 border-app-primary border-t-transparent mb-4"></div>
        <p className="text-sm font-medium text-app-muted">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'staff') return <Navigate to="/staff" replace />;
  return <Navigate to="/student" replace />;
}

/**
 * PublicOnlyRoute:
 * Prevents logged-in users from seeing the login or register pages again;
 * automatically redirects them to their respective portal.
 */
function PublicOnlyRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-app-main text-app-text flex flex-col font-sans transition-colors duration-200">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Home & Public Routes */}
                <Route path="/" element={<RootRedirect />} />
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <Register />
                    </PublicOnlyRoute>
                  }
                />

                {/* Role-Protected Landing Pages */}
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentHome />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute allowedRoles={['staff']}>
                      <StaffHome />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminHome />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
