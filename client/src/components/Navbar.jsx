import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Wrench, LogOut, User as UserIcon, Shield, HardHat, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper to render role-specific badge styling and icon
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            <Shield className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <HardHat className="w-3.5 h-3.5" />
            Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <UserIcon className="w-3.5 h-3.5" />
            Student
          </span>
        );
    }
  };

  return (
    <nav className="bg-app-card border-b border-app-border sticky top-0 z-30 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-app-primary flex items-center justify-center text-white dark:text-[#171525] shadow-md shadow-app-primary/20 group-hover:scale-105 transition-all">
                <Wrench className="w-5 h-5 text-white dark:text-[#171525]" />
              </div>
              <div>
                <span className="font-bold text-app-text text-lg tracking-tight block leading-tight group-hover:text-app-primary transition-colors">
                  Hostel Maintenance
                </span>
                <span className="text-xs text-app-muted font-medium hidden sm:block">
                  Ticket & Repair Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Actions & User Status */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2.5 rounded-xl bg-app-main hover:bg-app-card border border-app-border text-app-muted hover:text-app-primary transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary/40 shadow-sm flex items-center justify-center"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-5 h-5 text-app-primary transition-transform hover:-rotate-12" />
              )}
            </button>

            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-2.5 bg-app-main border border-app-border py-1.5 px-3 rounded-xl transition-colors">
                  <span className="text-sm font-semibold text-app-text hidden md:inline">
                    {user.name}
                  </span>
                  {renderRoleBadge(user.role)}
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-app-muted hover:text-rose-600 dark:hover:text-rose-400 bg-app-card hover:bg-rose-500/10 border border-app-border hover:border-rose-500/30 rounded-xl transition shadow-sm"
                  title="Log out of your account"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-app-text hover:text-app-primary bg-app-main hover:bg-app-card border border-app-border rounded-xl transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white dark:text-[#171525] bg-app-primary hover:bg-app-secondary rounded-xl transition shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
