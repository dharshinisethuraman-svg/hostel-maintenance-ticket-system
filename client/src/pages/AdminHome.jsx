import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../services/api';
import TicketCard from '../components/TicketCard';
import AccountManagement from '../components/AccountManagement';
import {
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
  Loader2,
  Inbox,
  Users,
  Search,
  CheckSquare,
} from 'lucide-react';

const CATEGORIES = ['All Categories', 'General', 'Plumbing', 'Electrical', 'Furniture', 'Cleaning'];

export default function AdminHome() {
  const { user } = useAuth();

  // Facility-wide Metrics State (from GET /dashboard)
  const [stats, setStats] = useState({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    resolved_tickets: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Registered Staff List State (from GET /staff)
  const [staffList, setStaffList] = useState([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // All Tickets List State (from GET /tickets)
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  // Filters & Search
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const data = await ticketAPI.getDashboard();
      setStats({
        total_tickets: data.total_tickets ?? 0,
        open_tickets: data.open_tickets ?? 0,
        in_progress_tickets: data.in_progress_tickets ?? 0,
        resolved_tickets: data.resolved_tickets ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch admin dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch Registered Staff Members
  const fetchStaff = useCallback(async () => {
    try {
      setIsLoadingStaff(true);
      const data = await ticketAPI.getStaffMembers();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch staff list:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  }, []);

  // Fetch All Complaints in System
  const fetchTickets = useCallback(async () => {
    try {
      setIsLoadingTickets(true);
      setErrorMessage(null);
      const data = await ticketAPI.getMyTickets();
      // Sort newest tickets first by ID descending
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => b.id - a.id) : [];
      setTickets(sorted);
    } catch (err) {
      console.error('Failed to fetch all tickets:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Failed to load maintenance complaints. Please refresh.'
      );
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  // Callback when user accounts change (Stage 5.3B: Deactivate, Reactivate, or Create)
  const handleAccountStateChanged = useCallback(async () => {
    await Promise.all([fetchStaff(), fetchTickets(), fetchStats()]);
  }, [fetchStaff, fetchTickets, fetchStats]);

  // Refresh all data
  const handleRefresh = async () => {
    await Promise.all([fetchStats(), fetchStaff(), fetchTickets()]);
  };

  // Initial load
  useEffect(() => {
    handleRefresh();
  }, [fetchStats, fetchStaff, fetchTickets]);

  // Status update callback
  const handleStatusUpdated = async (ticketId, newStatus) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    await fetchStats();
  };

  // Staff assignment callback
  const handleTicketAssigned = async (ticketId, updatedTicket) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              assigned_to: updatedTicket.assigned_to,
              status: updatedTicket.status || t.status,
            }
          : t
      )
    );
    await fetchStats();
  };


  // Filter and search logic
  const filteredTickets = tickets.filter((t) => {
    // 1. Status Filter (includes 'Unassigned' special tab)
    let matchesStatus = true;
    if (activeStatusFilter === 'Unassigned') {
      matchesStatus = !t.assigned_to;
    } else if (activeStatusFilter !== 'All') {
      matchesStatus = t.status?.toLowerCase() === activeStatusFilter.toLowerCase();
    }

    // 2. Category Filter
    const matchesCategory =
      selectedCategory === 'All Categories' ||
      t.category?.toLowerCase() === selectedCategory.toLowerCase();

    // 3. Search Query (Title, Description, Room, Student ID, Ticket ID)
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      t.title?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.room_no?.toLowerCase().includes(query) ||
      t.category?.toLowerCase().includes(query) ||
      String(t.id).includes(query) ||
      (t.user_id && String(t.user_id).includes(query));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const unassignedCount = tickets.filter((t) => !t.assigned_to).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Welcome Masthead */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-950/20 relative overflow-hidden transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md mb-3 text-white border border-white/10">
              <Shield className="w-3.5 h-3.5" />
              <span>Hostel Administration Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Hostel Management — {user?.name}
            </h1>
            <p className="text-purple-200/90 text-xs sm:text-sm mt-1 max-w-2xl">
              Oversee facility maintenance, dispatch technicians to student rooms, track resolution progress, and manage staff accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoadingStats || isLoadingTickets || isLoadingStaff}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh all metrics and complaints"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isLoadingStats || isLoadingTickets || isLoadingStaff ? 'animate-spin' : ''
                }`}
              />
              <span>Refresh All</span>
            </button>
          </div>
        </div>

        {/* Quick Admin Badges */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-purple-200/90">
          <div className="flex items-center gap-1.5">
            <span className="text-white/60">Admin ID:</span>
            <span className="font-mono font-bold text-white">#{user?.id}</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/60">Email:</span>
            <span className="font-semibold text-white">{user?.email}</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-300" />
            <span className="text-white/60">Active Staff:</span>
            <span className="font-bold text-white">
              {isLoadingStaff ? '...' : `${staffList.length} Technicians`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Facility Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Complaints */}
        <div className="bg-app-card rounded-2xl p-5 border border-app-border shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-app-main text-app-text border border-app-border flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">
              Total Complaints
            </span>
            <span className="text-2xl font-extrabold text-app-text mt-0.5 block">
              {isLoadingStats ? '...' : stats.total_tickets}
            </span>
          </div>
        </div>

        {/* Open / Pending */}
        <div className="bg-app-card rounded-2xl p-5 border border-app-border shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">
              Pending / Open
            </span>
            <span className="text-2xl font-extrabold text-app-text mt-0.5 block">
              {isLoadingStats ? '...' : stats.open_tickets}
            </span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-app-card rounded-2xl p-5 border border-app-border shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">
              In Progress
            </span>
            <span className="text-2xl font-extrabold text-app-text mt-0.5 block">
              {isLoadingStats ? '...' : stats.in_progress_tickets}
            </span>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-app-card rounded-2xl p-5 border border-app-border shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">
              Resolved Issues
            </span>
            <span className="text-2xl font-extrabold text-app-text mt-0.5 block">
              {isLoadingStats ? '...' : stats.resolved_tickets}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Account Management & User Directory (Stage 5.3B) */}
      <AccountManagement
        currentUser={user}
        onAccountStateChanged={handleAccountStateChanged}
      />

      {/* 4. Complaints Feed & Controls */}
      <div className="space-y-5">
        {/* Controls Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-app-primary" />
              <span>All Student Maintenance Complaints</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-app-main text-app-muted border border-app-border">
                {tickets.length} Total
              </span>
            </h2>
            <p className="text-xs text-app-muted">
              Manage repairs, assign staff technicians, and track resolution timelines
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs bg-app-card border border-app-border text-app-text rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-app-card text-app-text">
                  {cat}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-app-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search room, issue, student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-app-card border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary w-full sm:w-56"
              />
            </div>

            {/* Status & Unassigned Filter Tabs */}
            <div className="flex items-center gap-1 bg-app-main border border-app-border p-1 rounded-xl shrink-0">
              {['All', 'Open', 'In Progress', 'Resolved', 'Unassigned'].map((filter) => {
                const isActive = activeStatusFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? filter === 'Unassigned'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-app-card text-app-text shadow-xs'
                        : 'text-app-muted hover:text-app-text'
                    }`}
                  >
                    {filter}
                    {filter === 'Unassigned' && unassignedCount > 0 && (
                      <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}>
                        {unassignedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Complaints List Rendering */}
        {isLoadingTickets ? (
          <div className="bg-app-card rounded-3xl border border-app-border p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-app-primary mx-auto mb-3" />
            <p className="text-xs font-semibold text-app-text">
              Loading hostel complaints feed...
            </p>
            <p className="text-[11px] text-app-muted mt-0.5">Fetching from server</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-app-card rounded-3xl border border-dashed border-app-border p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <CheckSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-app-text mb-1.5">
              No Complaints in the System
            </h3>
            <p className="text-xs text-app-muted max-w-md mx-auto leading-relaxed">
              There are currently no maintenance complaints filed by students in the hostel.
            </p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-app-card rounded-3xl border border-dashed border-app-border p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-app-main text-app-muted mx-auto flex items-center justify-center mb-3">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-app-text mb-1">
              No matching complaints found
            </h3>
            <p className="text-xs text-app-muted max-w-sm mx-auto">
              No tickets matched status filter "{activeStatusFilter}", category "{selectedCategory}",
              or search query "{searchQuery}".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isAdmin={true}
                staffList={staffList}
                onStatusUpdated={handleStatusUpdated}
                onTicketAssigned={handleTicketAssigned}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
