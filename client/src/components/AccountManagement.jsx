import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminAPI, authAPI } from '../services/api';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  Wrench,
  User,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  Mail,
  Lock,
} from 'lucide-react';

export default function AccountManagement({ currentUser, onAccountStateChanged }) {
  // Accounts list state
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Notifications
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Loading indicator for row actions
  const [processingUserId, setProcessingUserId] = useState(null);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'deactivate', // 'deactivate' | 'reactivate'
    targetUser: null,
  });

  // Create User Modal State (Stage 5.2B)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);

  // Fetch all user accounts from GET /admin/users
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const data = await adminAPI.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch user accounts:', err);
      setActionError(
        err.response?.data?.detail || 'Failed to load user accounts. Please check your connection.'
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open confirmation modal
  const openConfirmDialog = (type, targetUser) => {
    setActionError(null);
    setActionSuccess(null);
    setConfirmDialog({
      isOpen: true,
      type,
      targetUser,
    });
  };

  // Close confirmation modal
  const closeConfirmDialog = () => {
    if (processingUserId) return; // Prevent closing while processing
    setConfirmDialog({
      isOpen: false,
      type: 'deactivate',
      targetUser: null,
    });
  };

  // Execute Deactivation or Reactivation
  const handleConfirmAction = async () => {
    const { type, targetUser } = confirmDialog;
    if (!targetUser) return;

    setProcessingUserId(targetUser.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (type === 'deactivate') {
        const res = await adminAPI.deactivateUser(targetUser.id);
        const unassignedMsg =
          res.unassigned_tickets > 0
            ? ` (${res.unassigned_tickets} assigned tickets returned to Open queue)`
            : '';
        setActionSuccess(
          res.message || `Account for "${targetUser.name}" successfully deactivated.${unassignedMsg}`
        );
      } else {
        const res = await adminAPI.reactivateUser(targetUser.id);
        setActionSuccess(
          res.message || `Account for "${targetUser.name}" successfully reactivated!`
        );
      }

      // Close modal
      setConfirmDialog({ isOpen: false, type: 'deactivate', targetUser: null });

      // Refresh local user list
      await fetchUsers();

      // Notify parent AdminHome to refresh staff dropdowns, complaints feed, and dashboard metrics
      if (typeof onAccountStateChanged === 'function') {
        onAccountStateChanged();
      }
    } catch (err) {
      console.error(`Failed to ${type} user:`, err);
      const detail = err.response?.data?.detail;
      setActionError(
        typeof detail === 'string'
          ? detail
          : `Failed to ${type} account. Please try again.`
      );
      // Keep modal open or close it? Close it so user sees the prominent error banner
      setConfirmDialog({ isOpen: false, type: 'deactivate', targetUser: null });
    } finally {
      setProcessingUserId(null);
    }
  };

  // Handle Account Creation (Stage 5.2B)
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const trimmedName = createFormData.name.trim();
    const trimmedEmail = createFormData.email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setCreateError('Full name must be at least 2 characters long.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setCreateError('Please enter a valid email address.');
      return;
    }
    if (!createFormData.password || createFormData.password.length < 6) {
      setCreateError('Temporary password must be at least 6 characters long.');
      return;
    }
    if (!['staff', 'admin'].includes(createFormData.role)) {
      setCreateError('Role must be either Staff or Admin.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const newUser = await authAPI.createPrivilegedUser({
        name: trimmedName,
        email: trimmedEmail,
        password: createFormData.password,
        role: createFormData.role,
      });

      setCreateSuccess(
        `Account for "${newUser.name}" successfully created with role "${newUser.role}"!`
      );

      // Reset form fields
      setCreateFormData({
        name: '',
        email: '',
        password: '',
        role: 'staff',
      });

      // Refresh local accounts list
      await fetchUsers();

      // Notify parent to refresh staff list
      if (typeof onAccountStateChanged === 'function') {
        onAccountStateChanged();
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setCreateError(
        typeof detail === 'string'
          ? detail
          : 'Failed to create account. Please check your connection and try again.'
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCloseCreateModal = () => {
    if (isCreatingUser) return;
    setShowCreateModal(false);
    setCreateError(null);
    setCreateSuccess(null);
    setCreateFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
    });
  };

  // Filter accounts
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'All' && u.role?.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter === 'Active' && !u.is_active) return false;
      if (statusFilter === 'Deactivated' && u.is_active) return false;

      // Search query
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesId = String(u.id).includes(q);
        const matchesRole = u.role?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesId && !matchesRole) {
          return false;
        }
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Statistics
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const deactivatedCount = users.filter((u) => !u.is_active).length;

  return (
    <div className="bg-app-card rounded-3xl border border-app-border shadow-sm overflow-hidden transition-colors duration-200">
      {/* 1. Header Section */}
      <div className="p-5 sm:p-6 border-b border-app-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-app-text">
                Account Management & User Directory
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-app-main text-app-muted border border-app-border">
                {totalCount} Total
              </span>
            </div>
            <p className="text-xs text-app-muted mt-0.5">
              Manage student, staff technician, and administrator accounts, control active status, and provision new access
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoadingUsers}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-app-text bg-app-main hover:bg-app-card border border-app-border transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh accounts directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateSuccess(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-app-primary hover:bg-app-secondary text-white dark:text-[#171525] text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Account</span>
          </button>
        </div>
      </div>

      {/* 2. Directory Statistics & Controls */}
      <div className="p-5 sm:p-6 bg-app-main border-b border-app-border space-y-4">
        {/* Count Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'All'
                ? 'bg-app-text text-app-card shadow-xs'
                : 'bg-app-card text-app-muted border border-app-border hover:bg-app-main'
            }`}
          >
            All Accounts ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Active')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'Active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-app-card text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active ({activeCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Deactivated')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'Deactivated'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-app-card text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Deactivated ({deactivatedCount})</span>
          </button>
        </div>

        {/* Search & Role Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-app-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, role, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-app-card border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-text text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-app-muted shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-app-card border border-app-border text-app-text rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
            >
              <option value="All" className="bg-app-card text-app-text">All Roles</option>
              <option value="admin" className="bg-app-card text-app-text">Administrators</option>
              <option value="staff" className="bg-app-card text-app-text">Staff Technicians</option>
              <option value="student" className="bg-app-card text-app-text">Students</option>
            </select>
          </div>
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-app-muted hover:text-app-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-medium">{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-app-muted hover:text-app-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Accounts Table */}
      <div className="overflow-x-auto">
        {isLoadingUsers ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-app-primary mx-auto mb-3" />
            <p className="text-xs font-semibold text-app-text">Loading user accounts directory...</p>
            <p className="text-[11px] text-app-muted mt-0.5">Contacting server</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-app-muted">
            <Users className="w-8 h-8 text-app-muted/40 mx-auto mb-2" />
            <p className="text-xs font-semibold text-app-text">No accounts matched your filters</p>
            <p className="text-[11px] text-app-muted mt-0.5">
              Try adjusting your search query, role filter, or status filter.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-app-main border-b border-app-border text-app-muted font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredUsers.map((u) => {
                const isCurrentLoggedInUser = currentUser?.id === u.id;
                const isProcessing = processingUserId === u.id;

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-app-main transition-colors ${
                      !u.is_active ? 'opacity-70 bg-app-main' : ''
                    }`}
                  >
                    {/* User Name & ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                              : u.role === 'staff'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-app-text">{u.name}</span>
                            {isCurrentLoggedInUser && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-app-muted font-mono">ID #{u.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-medium text-app-text">
                      {u.email}
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Administrator</span>
                        </span>
                      ) : u.role === 'staff' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Staff Technician</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          <User className="w-3.5 h-3.5" />
                          <span>Student</span>
                        </span>
                      )}
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      {isProcessing ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-app-muted">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      ) : u.is_active ? (
                        isCurrentLoggedInUser ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-app-muted bg-app-main border border-app-border cursor-not-allowed"
                            title="You cannot deactivate your own logged-in account"
                          >
                            <span>Self</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConfirmDialog('deactivate', u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 transition-all cursor-pointer shadow-2xs"
                            title={`Deactivate ${u.name}'s account`}
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => openConfirmDialog('reactivate', u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-600 transition-all cursor-pointer shadow-2xs"
                          title={`Reactivate ${u.name}'s account`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Reactivate</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Confirmation Dialog Modal */}
      {confirmDialog.isOpen && confirmDialog.targetUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={closeConfirmDialog}
        >
          <div
            className="relative max-w-md w-full bg-app-card rounded-3xl overflow-hidden shadow-2xl border border-app-border animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                confirmDialog.type === 'deactivate'
                  ? 'bg-gradient-to-r from-slate-900 via-rose-950 to-rose-900'
                  : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-emerald-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-white">
                  {confirmDialog.type === 'deactivate' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-300" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-emerald-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {confirmDialog.type === 'deactivate'
                      ? 'Confirm Account Deactivation'
                      : 'Confirm Account Reactivation'}
                  </h3>
                  <p className="text-xs text-white/70">
                    {confirmDialog.type === 'deactivate'
                      ? 'Revoke access and reassign responsibilities'
                      : 'Restore account access and permissions'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeConfirmDialog}
                disabled={Boolean(processingUserId)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Target User Details Card */}
              <div className="p-3.5 rounded-2xl bg-app-main border border-app-border space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-app-text">
                    {confirmDialog.targetUser.name}
                  </span>
                  <span className="font-mono text-app-muted">
                    #{confirmDialog.targetUser.id}
                  </span>
                </div>
                <div className="text-xs text-app-muted">
                  <span>Email: </span>
                  <span className="font-medium text-app-text">
                    {confirmDialog.targetUser.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-app-muted">Role:</span>
                  <span className="font-semibold uppercase text-purple-700 dark:text-purple-300 text-[10px] tracking-wider px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30">
                    {confirmDialog.targetUser.role}
                  </span>
                </div>
              </div>

              {/* Consequence Explanations */}
              {confirmDialog.type === 'deactivate' ? (
                <div className="space-y-2 text-xs text-app-muted">
                  <p className="font-semibold text-app-text">
                    Are you sure you want to deactivate this account?
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-app-muted text-[11px] leading-relaxed">
                    <li>The user will be immediately logged out and blocked from logging in.</li>
                    {confirmDialog.targetUser.role === 'staff' && (
                      <li className="text-amber-700 dark:text-amber-300 font-medium">
                        Any active tickets assigned to this technician will be automatically unassigned and reset to the "Open" queue.
                      </li>
                    )}
                    {confirmDialog.targetUser.role === 'admin' && (
                      <li className="text-rose-700 dark:text-rose-300 font-medium">
                        This user will lose all administrative dashboard privileges.
                      </li>
                    )}
                    <li>All past ticket history, comments, and records remain safely preserved.</li>
                    <li>You can reactivate this account at any time.</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2 text-xs text-app-muted">
                  <p className="font-semibold text-app-text">
                    Are you sure you want to reactivate this account?
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-app-muted text-[11px] leading-relaxed">
                    <li>The user will immediately regain the ability to log in with their existing credentials.</li>
                    {confirmDialog.targetUser.role === 'staff' && (
                      <li>This technician will reappear in the staff assignment dropdown for incoming complaints.</li>
                    )}
                    <li>Account permissions and historical complaints will be fully accessible.</li>
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeConfirmDialog}
                  disabled={Boolean(processingUserId)}
                  className="px-4 py-2 text-xs font-semibold text-app-muted hover:text-app-text bg-app-main hover:bg-app-card border border-app-border rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={Boolean(processingUserId)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                    confirmDialog.type === 'deactivate'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {processingUserId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : confirmDialog.type === 'deactivate' ? (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>Yes, Deactivate Account</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Yes, Reactivate Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add New Account Modal Dialog (Stage 5.2B) */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={handleCloseCreateModal}
        >
          <div
            className="relative max-w-md w-full bg-app-card rounded-3xl overflow-hidden shadow-2xl border border-app-border animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-purple-900 p-5 sm:p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Add Staff or Admin Account</h3>
                  <p className="text-xs text-white/70">
                    Provision privileged access for hostel personnel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isCreatingUser}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateAccount} className="p-5 sm:p-6 space-y-4">
              {/* Success Notification */}
              {createSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{createSuccess}</span>
                </div>
              )}

              {/* Error Notification */}
              {createError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{createError}</span>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-app-text mb-1.5">
                  Account Role *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isCreatingUser}
                    onClick={() => setCreateFormData((prev) => ({ ...prev, role: 'staff' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      createFormData.role === 'staff'
                        ? 'bg-amber-500/15 border-amber-500/40 ring-2 ring-amber-500/30'
                        : 'bg-app-main border-app-border hover:bg-app-card'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                      <span className="text-xs font-bold text-app-text">Staff Member</span>
                    </div>
                    <p className="text-[11px] text-app-muted">
                      Maintenance technicians who resolve complaints
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isCreatingUser}
                    onClick={() => setCreateFormData((prev) => ({ ...prev, role: 'admin' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      createFormData.role === 'admin'
                        ? 'bg-purple-500/15 border-purple-500/40 ring-2 ring-purple-500/30'
                        : 'bg-app-main border-app-border hover:bg-app-card'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                      <span className="text-xs font-bold text-app-text">Administrator</span>
                    </div>
                    <p className="text-[11px] text-app-muted">
                      Hostel wardens with full facility oversight
                    </p>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-app-text mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-app-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    disabled={isCreatingUser}
                    placeholder="e.g. David Electrician"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-app-main border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-app-text mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-app-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    disabled={isCreatingUser}
                    placeholder="e.g. david.electrician@hostel.com"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-app-main border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
                  />
                </div>
              </div>

              {/* Temporary Password */}
              <div>
                <label className="block text-xs font-semibold text-app-text mb-1.5">
                  Temporary Password * <span className="text-app-muted font-normal">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-app-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    disabled={isCreatingUser}
                    placeholder="••••••••"
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-app-main border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isCreatingUser}
                  className="px-4 py-2 text-xs font-semibold text-app-muted hover:text-app-text bg-app-main hover:bg-app-card border border-app-border rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isCreatingUser ||
                    !createFormData.name.trim() ||
                    !createFormData.email.trim() ||
                    createFormData.password.length < 6
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-app-primary hover:bg-app-secondary text-white dark:text-[#171525] text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCreatingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
