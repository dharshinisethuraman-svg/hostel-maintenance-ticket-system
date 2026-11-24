import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../services/api';
import TicketCard from '../components/TicketCard';
import {
  User,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  UploadCloud,
  X,
  Trash2,
  Inbox,
  Loader2
} from 'lucide-react';

const CATEGORIES = [
  'General',
  'Plumbing',
  'Electrical',
  'Furniture',
  'Cleaning',
];

const PRIORITIES = [
  { value: 'Low', label: 'Low', description: 'Minor issue, no urgency', color: 'text-app-text bg-app-card border-app-border' },
  { value: 'Medium', label: 'Medium', description: 'Standard repair needed', color: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30' },
  { value: 'High', label: 'High', description: 'Urgent: water leak, electrical hazard', color: 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30' },
];

export default function StudentHome() {
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

  // New Complaint Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [roomNo, setRoomNo] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Submission Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(''); // e.g. "Uploading photo..." or "Submitting ticket..."
  const [successMessage, setSuccessMessage] = useState(null);
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
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch Student's Tickets
  const fetchTickets = useCallback(async () => {
    try {
      setIsLoadingTickets(true);
      const data = await ticketAPI.getMyTickets();
      // Sort newest tickets first by ID descending
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => b.id - a.id) : [];
      setTickets(sorted);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  // Refresh all dashboard data
  const handleRefresh = async () => {
    await Promise.all([fetchStats(), fetchTickets()]);
  };

  // Initial load
  useEffect(() => {
    handleRefresh();
  }, [fetchStats, fetchTickets]);

  // Clean up object URL when component unmounts or new file chosen
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle Image File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('The selected image is larger than 5MB. Please choose a smaller file.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    // Create thumbnail preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  // Remove Selected Image
  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Handle Form Submission
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic frontend validations
    if (!title.trim()) {
      setErrorMessage('Please enter a brief title describing the problem.');
      return;
    }
    if (!roomNo.trim()) {
      setErrorMessage('Please specify your hostel room number.');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedImageUrl = null;

      // Step 1: Upload photo if selected
      if (selectedFile) {
        setSubmissionStep('Uploading photo to server...');
        const uploadResult = await ticketAPI.uploadImage(selectedFile);
        uploadedImageUrl = uploadResult.image_url;
      }

      // Step 2: Create ticket
      setSubmissionStep('Submitting complaint...');
      const response = await ticketAPI.createTicket({
        title: title.trim(),
        description: description.trim(),
        room_no: roomNo.trim(),
        priority,
        category,
        image_url: uploadedImageUrl,
      });

      const newTicketId = response.data?.id;
      setSuccessMessage(
        newTicketId
          ? `Complaint #${newTicketId} submitted successfully! Maintenance staff will be notified.`
          : 'Complaint submitted successfully!'
      );

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('General');
      setPriority('Medium');
      handleRemoveImage();

      // Refresh data
      await Promise.all([fetchStats(), fetchTickets()]);
    } catch (err) {
      console.error('Complaint submission error:', err);
      const detail = err.response?.data?.detail;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : 'Failed to submit complaint. Please check your network and try again.'
      );
    } finally {
      setIsSubmitting(false);
      setSubmissionStep('');
    }
  };

  // Filtered tickets based on active filter tab
  const filteredTickets = tickets.filter((t) => {
    if (activeFilter === 'All') return true;
    return t.status?.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Welcome Masthead */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-950/20 relative overflow-hidden transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md mb-3 text-white border border-white/10">
              <User className="w-3.5 h-3.5" />
              <span>Student Resident</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-purple-200/90 text-xs sm:text-sm mt-1 max-w-xl">
              Report maintenance issues in your room or hostel facilities, track repair progress, and converse with staff.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoadingStats || isLoadingTickets}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh statistics and complaints"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStats || isLoadingTickets ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Ticket Statistics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Tickets */}
        <div className="bg-app-card rounded-2xl p-5 border border-app-border shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-app-muted uppercase tracking-wider block">Total Filed</span>
            <span className="text-2xl font-extrabold text-app-text mt-0.5 block">
              {isLoadingStats ? '...' : stats.total_tickets}
            </span>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-app-card rounded-2xl p-5 border border-app-border shadow-sm flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/20">
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

      {/* 3. Main Workspace: Split Form & Complaints Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Complaint Submission Form */}
        <div className="lg:col-span-5 bg-app-card rounded-3xl border border-app-border shadow-sm p-6 sm:p-7 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-app-primary/15 text-app-primary rounded-xl">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-app-text">File a New Complaint</h2>
          </div>
          <p className="text-xs text-app-muted mb-6">
            Provide details of the issue so hostel maintenance staff can resolve it quickly.
          </p>

          {/* Success Notification */}
          {successMessage && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-app-muted hover:text-app-text shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-app-muted hover:text-app-text shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitComplaint} className="space-y-4">
            {/* Category & Room Number in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="complaint-category" className="block text-xs font-semibold text-app-text mb-1.5">
                  Category *
                </label>
                <select
                  id="complaint-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-app-main border border-app-border text-app-text rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
                  disabled={isSubmitting}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-app-card text-app-text">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="complaint-room" className="block text-xs font-semibold text-app-text mb-1.5">
                  Room Number *
                </label>
                <input
                  id="complaint-room"
                  type="text"
                  placeholder="e.g. 204 or B-102"
                  value={roomNo}
                  onChange={(e) => setRoomNo(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 text-xs bg-app-main border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
                />
              </div>
            </div>

            {/* Priority Picker */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">
                Priority Level *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      disabled={isSubmitting}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center cursor-pointer ${
                        isSelected
                          ? `${p.color} ring-2 ring-app-primary ring-offset-1 ring-offset-app-card shadow-xs font-bold`
                          : 'bg-app-main border-app-border text-app-muted hover:text-app-text hover:bg-app-card'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title / Summary */}
            <div>
              <label htmlFor="complaint-title" className="block text-xs font-semibold text-app-text mb-1.5">
                Issue Summary / Title *
              </label>
              <input
                id="complaint-title"
                type="text"
                placeholder="e.g. Water leaking under sink in bathroom"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 text-xs bg-app-main border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label htmlFor="complaint-desc" className="block text-xs font-semibold text-app-text mb-1.5">
                Detailed Description <span className="text-app-muted font-normal">(optional)</span>
              </label>
              <textarea
                id="complaint-desc"
                rows={3}
                placeholder="Provide any additional details or times when you are available in the room..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 text-xs bg-app-main border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary resize-none"
              />
            </div>

            {/* Photo Attachment with Preview & Remove */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">
                Photo Evidence <span className="text-app-muted font-normal">(optional, JPEG/PNG/WebP up to 5MB)</span>
              </label>

              {previewUrl ? (
                <div className="relative rounded-2xl border border-app-border bg-app-main p-3 flex items-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Selected attachment preview"
                    className="w-16 h-16 object-cover rounded-xl border border-app-border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-app-text truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[10px] text-app-muted">
                      {(selectedFile?.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isSubmitting}
                    className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/30 transition-colors cursor-pointer"
                    title="Remove selected photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-app-border hover:border-app-primary rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-app-main hover:bg-app-card">
                  <UploadCloud className="w-6 h-6 text-app-primary mb-1" />
                  <span className="text-xs font-semibold text-app-text">Click to upload photo</span>
                  <span className="text-[10px] text-app-muted mt-0.5">JPEG, PNG, or WebP up to 5MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !roomNo.trim()}
              className="w-full py-3 px-4 bg-app-primary hover:bg-app-secondary text-white dark:text-[#171525] rounded-xl text-xs font-bold shadow-md shadow-app-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin border-white dark:border-[#171525]" />
                  <span>{submissionStep || 'Submitting complaint...'}</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit Maintenance Complaint</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Student's Own Complaints List */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
                <span>My Maintenance Requests</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-app-main text-app-muted border border-app-border">
                  {tickets.length}
                </span>
              </h2>
              <p className="text-xs text-app-muted">
                Track status updates and chat with assigned staff
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-app-main border border-app-border p-1 rounded-xl self-start sm:self-auto">
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

          {/* Complaints List Render */}
          {isLoadingTickets ? (
            <div className="bg-app-card rounded-3xl border border-app-border p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-app-primary mx-auto mb-3" />
              <p className="text-xs font-semibold text-app-text">Loading your complaints...</p>
              <p className="text-[11px] text-app-muted mt-0.5">Fetching from server</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-app-card rounded-3xl border border-dashed border-app-border p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-app-main text-app-muted mx-auto flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-app-text mb-1">
                {activeFilter === 'All'
                  ? 'No Complaints Found'
                  : `No "${activeFilter}" Complaints`}
              </h3>
              <p className="text-xs text-app-muted max-w-sm mx-auto">
                {activeFilter === 'All'
                  ? 'You have not submitted any maintenance complaints yet. Use the form on the left to report your first issue!'
                  : `You currently have no tickets with status "${activeFilter}". Check other tabs or report a new issue.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
