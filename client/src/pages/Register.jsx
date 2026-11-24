import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, UserPlus, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // By design and backend contract, register always creates a Student role
      await register(name, email, password);
      // Navigate to login with success flag
      navigate('/login?registered=true', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-app-main flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="bg-app-card rounded-3xl shadow-xl border border-app-border max-w-md w-full p-8 sm:p-10 transition-colors duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-app-primary rounded-2xl mx-auto mb-4 flex items-center justify-center text-white dark:text-[#171525] shadow-lg shadow-app-primary/20">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-app-text tracking-tight">Create Student Account</h1>
          <p className="text-app-muted text-sm mt-1">Register to submit and track maintenance complaints</p>
        </div>

        {/* Role Notice (Mandatory Rule) */}
        <div className="mb-6 p-3 bg-app-main border border-app-border rounded-xl flex items-center gap-2 text-xs text-app-muted">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-app-primary" />
          <span>Public registration grants <strong className="text-app-text font-semibold">Student</strong> access. Staff & Admin accounts are provisioned securely by administration.</span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-app-text uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                required
                className="w-full pl-11 pr-4 py-3 bg-app-main border border-app-border rounded-xl text-app-text placeholder:text-app-muted placeholder:opacity-60 text-sm focus:outline-none focus:border-app-primary focus:bg-app-card focus:ring-4 focus:ring-app-primary/10 transition"
              />
            </div>
          </div>

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
                placeholder="alex.johnson@example.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-app-main border border-app-border rounded-xl text-app-text placeholder:text-app-muted placeholder:opacity-60 text-sm focus:outline-none focus:border-app-primary focus:bg-app-card focus:ring-4 focus:ring-app-primary/10 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-app-text uppercase tracking-wider mb-2">
              Password (min. 6 characters)
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
                minLength={6}
                className="w-full pl-11 pr-4 py-3 bg-app-main border border-app-border rounded-xl text-app-text placeholder:text-app-muted placeholder:opacity-60 text-sm focus:outline-none focus:border-app-primary focus:bg-app-card focus:ring-4 focus:ring-app-primary/10 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-app-text uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-11 pr-4 py-3 bg-app-main border border-app-border rounded-xl text-app-text placeholder:text-app-muted placeholder:opacity-60 text-sm focus:outline-none focus:border-app-primary focus:bg-app-card focus:ring-4 focus:ring-app-primary/10 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-app-primary hover:bg-app-secondary text-white dark:text-[#171525] font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-app-primary/20 disabled:opacity-60 disabled:cursor-wait mt-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 rounded-full animate-spin border-2 border-white dark:border-[#171525] border-t-transparent" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-8 pt-6 border-t border-app-border text-center">
          <p className="text-sm text-app-muted">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-app-primary hover:text-app-secondary transition">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
