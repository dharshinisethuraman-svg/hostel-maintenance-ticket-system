import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../services/api';
import TicketCard from '../components/TicketCard';
import {
  HardHat,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
  CheckSquare,
  Wrench,
  Loader2,
  Inbox,
  ShieldCheck,
  Search
} from 'lucide-react';

export default function StaffHome() {
  const { user } = useAuth();

  // Dashboard Stats State (from GET /dashboard)
  const [stats, setStats] = useState({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    resolved_tickets: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Tickets List State (from GET /tickets)
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch Dashboard Stats Scoped to Staff
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
      console.error('Failed to fetch staff dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch Assigned Tickets for Staff
  const fetchTickets = useCallback(async () => {
    try {
      setIsLoadingTickets(true);
      setErrorMessage(null);
      const data = await ticketAPI.getMyTickets();
      // Sort newest tickets first by ID descending
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => b.id - a.id) : [];
      setTickets(sorted);
    } catch (err) {
      console.error('Failed to fetch staff assigned tickets:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Failed to load assigned tickets. Please refresh.'
      );
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  // Refresh Queue
  const handleRefresh = async () => {
    await Promise.all([fetchStats(), fetchTickets()]);
  };

  // Initial load
  useEffect(() => {
    handleRefresh();
  }, [fetchStats, fetchTickets]);

  // Callback triggered when a ticket's status is changed by staff in TicketCard
  const handleStatusUpdated = async (ticketId, newStatus) => {
    // Optimistically update local ticket list
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    // Refresh stats cards in the background
    await fetchStats();
  };

  // Filter and search tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesFilter =
      activeFilter === 'All' || t.status?.toLowerCase() === activeFilter.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      t.title?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.room_no?.toLowerCase().includes(query) ||
      t.category?.toLowerCase().includes(query) ||
      String(t.id).includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Welcome Masthead */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-amber-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-950/20 relative overflow-hidden transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md mb-3 text-amber-200 border border-white/10">
              <HardHat className="w-3.5 h-3.5" />
              <span>Maintenance Operations Staff</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Maintenance Portal — {user?.name}
            </h1>
            <p className="text-amber-100/90 text-xs sm:text-sm mt-1 max-w-2xl">
              Review assigned repairs, update operational status, and post work progress notes for student residents.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoadingStats || isLoadingTickets}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh assigned tasks and statistics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStats || isLoadingTickets ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Quick Staff Info Badges */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-amber-200/90">
          <div className="flex items-center gap-1.5">
            <span className="text-white/60">Staff ID:</span>
            <span className="font-mono font-bold text-white">#{user?.id}</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/60">Email:</span>
            <span className="font-semibold text-white">{user?.email}</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white/60">Role:</span>
            <span className="font-semibold text-white capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* 2. Operational Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Assigned */}
        <div className="bg-app-card rounded-2xl p-5 border border-app-border shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-app-main text-app-text border border-app-border flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">Total Assigned</span>
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
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">Pending / Open</span>
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
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">In Progress</span>
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
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">Resolved</span>
            <span className="text-2xl font-extrabold text-app-text mt-0.5 block">
              {isLoadingStats ? '...' : stats.resolved_tickets}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Assigned Work Queue Section */}
      <div className="space-y-5">
        {/* Section Header with Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Assigned Maintenance Queue</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-app-main text-app-muted border border-app-border">
                {tickets.length}
              </span>
            </h2>
            <p className="text-xs text-app-muted">
              Only tickets assigned to your account by hostel administrators appear in this list
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-app-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search room, issue, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-app-card border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary w-full sm:w-56"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-app-main border border-app-border p-1 rounded-xl shrink-0">
              {['All', 'Open', 'In Progress', 'Resolved'].map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-app-card text-app-text shadow-xs'
                        : 'text-app-muted hover:text-app-text'
                    }`}
                  >
                    {filter}
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

        {/* Ticket List Rendering */}
        {isLoadingTickets ? (
          <div className="bg-app-card rounded-3xl border border-app-border p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 dark:text-amber-400 mx-auto mb-3" />
            <p className="text-xs font-semibold text-app-text">Loading your assigned maintenance queue...</p>
            <p className="text-[11px] text-app-muted mt-0.5">Fetching from server</p>
          </div>
        ) : tickets.length === 0 ? (
          /* Empty Queue State: When NO tickets are assigned to this staff member */
          <div className="bg-app-card rounded-3xl border border-dashed border-app-border p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <CheckSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-app-text mb-1.5">
              Your Maintenance Queue is Clear!
            </h3>
            <p className="text-xs text-app-muted max-w-md mx-auto leading-relaxed mb-6">
              You currently have no repair tickets assigned to your account. When the hostel administrator assigns a maintenance request to you, it will appear here in real time.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-app-main border border-app-border text-app-muted text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Role-based isolation active: Only tickets assigned to #{user?.id} are visible</span>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          /* Filter/Search Empty State: When tickets exist but none match current filter */
          <div className="bg-app-card rounded-3xl border border-dashed border-app-border p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-app-main text-app-muted mx-auto flex items-center justify-center mb-3">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-app-text mb-1">
              No matching tickets found
            </h3>
            <p className="text-xs text-app-muted max-w-sm mx-auto">
              No assigned tickets match your current filter ({activeFilter}) or search query ("{searchQuery}"). Try clearing the search or switching tabs.
            </p>
          </div>
        ) : (
          /* Assigned Tickets Feed */
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isStaff={true}
                onStatusUpdated={handleStatusUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
