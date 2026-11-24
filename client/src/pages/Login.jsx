import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check if redirected after successful registration
  const registeredSuccess = new URLSearchParams(location.search).get('registered') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password);

      // Automatic role-based navigation after login
      if (loggedInUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (loggedInUser.role === 'staff') {
        navigate('/staff', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper buttons to quickly populate emails without exposing passwords
  const fillEmailOnly = (targetEmail) => {
    setEmail(targetEmail);
    setErrorMessage('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-app-main flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="bg-app-card rounded-3xl shadow-xl border border-app-border max-w-md w-full p-8 sm:p-10 transition-colors duration-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-app-primary rounded-2xl mx-auto mb-4 flex items-center justify-center text-white dark:text-[#171525] shadow-lg shadow-app-primary/20">
            <LogIn className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-app-text tracking-tight">Welcome Back</h1>
          <p className="text-app-muted text-sm mt-1">Sign in to your hostel maintenance portal</p>
        </div>

        {/* Registered Success Banner */}
        {registeredSuccess && (
          <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Registration successful! Please log in with your credentials.</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-app-text uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-app-main border border-app-border rounded-xl text-app-text placeholder:text-app-muted placeholder:opacity-60 text-sm focus:outline-none focus:border-app-primary focus:bg-app-card focus:ring-4 focus:ring-app-primary/10 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-app-text uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-3 bg-app-main border border-app-border rounded-xl text-app-text placeholder:text-app-muted placeholder:opacity-60 text-sm focus:outline-none focus:border-app-primary focus:bg-app-card focus:ring-4 focus:ring-app-primary/10 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-app-primary hover:bg-app-secondary text-white dark:text-[#171525] font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-app-primary/20 disabled:opacity-60 disabled:cursor-wait"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 rounded-full animate-spin border-2 border-white dark:border-[#171525] border-t-transparent" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Email Selection (No passwords in code) */}
        <div className="mt-8 pt-6 border-t border-app-border">
          <p className="text-xs font-semibold text-app-muted text-center mb-3">
            Quick Fill Email (Passwords must be typed manually):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillEmailOnly('jane.student@example.com')}
              className="py-1.5 px-2 bg-app-main hover:bg-app-card border border-app-border hover:border-app-primary rounded-lg text-xs font-semibold text-app-text hover:text-app-primary transition truncate"
              title="jane.student@example.com"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => fillEmailOnly('bob.plumber@hostel.com')}
              className="py-1.5 px-2 bg-app-main hover:bg-app-card border border-app-border hover:border-app-primary rounded-lg text-xs font-semibold text-app-text hover:text-app-primary transition truncate"
              title="bob.plumber@hostel.com"
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => fillEmailOnly('warden@hostel.com')}
              className="py-1.5 px-2 bg-app-main hover:bg-app-card border border-app-border hover:border-app-primary rounded-lg text-xs font-semibold text-app-text hover:text-app-primary transition truncate"
              title="warden@hostel.com"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Registration Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-app-muted">
            Need an account?{' '}
            <Link to="/register" className="font-semibold text-app-primary hover:text-app-secondary transition">
              Register as Student
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
