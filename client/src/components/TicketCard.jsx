import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  ZoomIn, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Tag, 
  Loader2,
  Info,
  User,
  Wrench,
  Image as ImageIcon
} from 'lucide-react';
import { ticketAPI } from '../services/api';

/**
 * Status Badge helper function
 * Returns styled pill matching current ticket status
 */
function getStatusBadge(status) {
  switch (status) {
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Resolved
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
          In Progress
        </span>
      );
    case 'Open':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
          <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400"></span>
          Open
        </span>
      );
  }
}

/**
 * Priority Badge helper function
 */
function getPriorityBadge(priority) {
  switch (priority) {
    case 'High':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          High Priority
        </span>
      );
    case 'Low':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
          Low Priority
        </span>
      );
    case 'Medium':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          Medium Priority
        </span>
      );
  }
}

/**
 * TicketCard Component
 * Displays a single complaint card with full details, image viewer, comments thread,
 * optional status update controls (for staff/admin), and staff assignment (for admin).
 */
export default function TicketCard({ 
  ticket, 
  isStaff = false, 
  isAdmin = false,
  staffList = [],
  onStatusUpdated = null,
  onTicketAssigned = null
}) {
  const [currentStatus, setCurrentStatus] = useState(ticket.status || 'Open');
  const [currentAssignedTo, setCurrentAssignedTo] = useState(ticket.assigned_to);
  const [selectedStaffId, setSelectedStaffId] = useState(ticket.assigned_to || '');

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const [isAssigning, setIsAssigning] = useState(false);
  const [assignNotification, setAssignNotification] = useState(null);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Sync internal states with prop updates
  useEffect(() => {
    setCurrentStatus(ticket.status || 'Open');
    setCurrentAssignedTo(ticket.assigned_to);
    setSelectedStaffId(ticket.assigned_to || '');
  }, [ticket.status, ticket.assigned_to]);

  // Handle Status Update (Staff or Admin)
  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    setStatusNotification(null);

    try {
      await ticketAPI.updateTicketStatus(ticket.id, newStatus);
      setCurrentStatus(newStatus);
      setStatusNotification({
        type: 'success',
        text: `Status updated to "${newStatus}"`,
      });

      if (typeof onStatusUpdated === 'function') {
        onStatusUpdated(ticket.id, newStatus);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setStatusNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update ticket status. Please try again.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Staff Assignment (Admin only)
  const handleAssignStaff = async (e) => {
    e?.preventDefault();
    if (!selectedStaffId) return;

    setIsAssigning(true);
    setAssignNotification(null);

    try {
      const res = await ticketAPI.assignTicket(ticket.id, selectedStaffId);
      const newStaffId = Number(selectedStaffId);
      setCurrentAssignedTo(newStaffId);

      // Backend automatically sets status to "In Progress" if it was "Open"
      if (res.ticket?.status) {
        setCurrentStatus(res.ticket.status);
      }

      const assignedStaffName = 
        staffList.find((s) => s.id === newStaffId)?.name || 
        res.ticket?.staff_name || 
        `Staff #${newStaffId}`;

      setAssignNotification({
        type: 'success',
        text: `Assigned to ${assignedStaffName}! Status updated to In Progress.`,
      });

      if (typeof onTicketAssigned === 'function') {
        onTicketAssigned(ticket.id, res.ticket);
      }
    } catch (err) {
      console.error('Failed to assign staff:', err);
      setAssignNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to assign staff. Please try again.',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Fetch comments when comments section is expanded for the first time
  const handleToggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && comments.length === 0) {
      setIsLoadingComments(true);
      setCommentError(null);
      try {
        const data = await ticketAPI.getComments(ticket.id);
        setComments(Array.isArray(data) ? data : []);
      } catch (err) {
        setCommentError(err.response?.data?.detail || 'Failed to load comments');
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  // Submit a new comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    setCommentError(null);
    try {
      await ticketAPI.addComment(ticket.id, commentText);
      // Re-fetch comments to show latest list
      const updated = await ticketAPI.getComments(ticket.id);
      setComments(Array.isArray(updated) ? updated : []);
      setCommentText('');
    } catch (err) {
      setCommentError(err.response?.data?.detail || 'Failed to post comment. Please try again.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const imageUrl = ticketAPI.getImageUrl(ticket.image_url);
  const assignedStaff = staffList.find((s) => s.id === currentAssignedTo);
  const assignedStaffName = assignedStaff?.name;

  return (
    <div className="bg-app-card rounded-2xl border border-app-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-5 sm:p-6 border-b border-app-border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-app-text bg-app-main px-2.5 py-1 rounded-lg border border-app-border">
              #{ticket.id}
            </span>

            {/* Student ID badge (Visible for admin/staff overview) */}
            {ticket.user_id && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-app-text bg-app-main px-2.5 py-1 rounded-lg border border-app-border">
                <User className="w-3 h-3 text-app-muted" />
                Student #{ticket.user_id}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-xs font-medium text-app-text bg-app-main px-2.5 py-1 rounded-lg border border-app-border">
              <Tag className="w-3 h-3 text-app-muted" />
              {ticket.category || 'General'}
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-medium text-app-text bg-app-main px-2.5 py-1 rounded-lg border border-app-border">
              <MapPin className="w-3 h-3 text-app-muted" />
              Room {ticket.room_no}
            </span>

            {/* Assigned Staff Badge (Admin & Overview) */}
            {currentAssignedTo ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                <Wrench className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                Assigned: {assignedStaffName || `Staff #${currentAssignedTo}`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Unassigned
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {getPriorityBadge(ticket.priority)}
            {getStatusBadge(currentStatus)}
          </div>
        </div>

        {/* Complaint Title & Description */}
        <h3 className="text-lg font-bold text-app-text mb-1.5">
          {ticket.title}
        </h3>
        {ticket.description && (
          <p className="text-sm text-app-muted leading-relaxed whitespace-pre-line">
            {ticket.description}
          </p>
        )}

        {/* Attached Photo Preview */}
        {imageUrl && (
          <div className="mt-4 pt-4 border-t border-app-border">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-app-text">
              <ImageIcon className="w-3.5 h-3.5 text-app-primary" />
              <span>Attached Photo Evidence</span>
            </div>
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="relative group rounded-xl overflow-hidden border border-app-border bg-app-main max-w-xs focus:outline-none focus:ring-2 focus:ring-app-primary focus:ring-offset-2"
              title="Click to view full image"
            >
              <img
                src={imageUrl}
                alt={`Photo for ticket #${ticket.id}`}
                className="w-48 h-32 object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5">
                <ZoomIn className="w-4 h-4" />
                <span>View Full</span>
              </div>
            </button>
          </div>
        )}

        {/* Admin Controls Panel: Staff Assignment & Status Controls */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-app-border space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Staff Assignment Dropdown */}
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`assign-select-${ticket.id}`} className="text-xs font-semibold text-app-text">
                  Assign Staff:
                </label>
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                  <select
                    id={`assign-select-${ticket.id}`}
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    disabled={isAssigning}
                    className="px-3 py-1.5 text-xs bg-app-main border border-app-border text-app-text rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary"
                  >
                    <option value="">-- Select Staff Member --</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id} className="bg-app-card text-app-text">
                        {staff.name} ({staff.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignStaff}
                    disabled={isAssigning || !selectedStaffId || Number(selectedStaffId) === currentAssignedTo}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-app-primary text-white dark:text-[#171525] text-xs font-bold rounded-xl hover:bg-app-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Assigning...</span>
                      </>
                    ) : (
                      <span>Assign</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Updater for Admin */}
              <div className="flex items-center gap-2 md:justify-end">
                <span className="text-xs font-semibold text-app-text">Status:</span>
                <div className="inline-flex rounded-xl p-1 bg-app-main border border-app-border gap-1">
                  {['Open', 'In Progress', 'Resolved'].map((st) => {
                    const isActive = currentStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? st === 'Resolved'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'In Progress'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-app-primary text-white dark:text-[#171525] font-bold shadow-xs'
                            : 'text-app-muted hover:text-app-text hover:bg-app-card'
                        } disabled:opacity-50`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Notifications for Admin Actions */}
            {assignNotification && (
              <div
                className={`text-xs px-3 py-2 rounded-xl flex items-center justify-between gap-2 animate-in fade-in ${
                  assignNotification.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {assignNotification.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{assignNotification.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignNotification(null)}
                  className="text-app-muted hover:text-app-text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {statusNotification && (
              <div
                className={`text-xs px-3 py-1.5 rounded-xl flex items-center justify-between gap-2 animate-in fade-in ${
                  statusNotification.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {statusNotification.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{statusNotification.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusNotification(null)}
                  className="text-app-muted hover:text-app-text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Staff Only Status Controls (When not Admin) */}
        {!isAdmin && isStaff && (
          <div className="mt-4 pt-4 border-t border-app-border space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-app-text">Update Status:</span>
                <div className="inline-flex rounded-xl p-1 bg-app-main border border-app-border gap-1">
                  {['Open', 'In Progress', 'Resolved'].map((st) => {
                    const isActive = currentStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? st === 'Resolved'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'In Progress'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-app-primary text-white dark:text-[#171525] font-bold shadow-xs'
                            : 'text-app-muted hover:text-app-text hover:bg-app-card'
                        } disabled:opacity-50`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isUpdatingStatus && (
                <div className="flex items-center gap-1.5 text-xs text-app-primary font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving status...</span>
                </div>
              )}
            </div>

            {statusNotification && (
              <div
                className={`text-xs px-3 py-1.5 rounded-xl flex items-center justify-between gap-2 animate-in fade-in ${
                  statusNotification.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {statusNotification.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{statusNotification.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusNotification(null)}
                  className="text-app-muted hover:text-app-text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Comments Toggle */}
      <div className="px-5 sm:px-6 py-3 bg-app-main border-t border-app-border flex items-center justify-between transition-colors">
        <button
          type="button"
          onClick={handleToggleComments}
          className="inline-flex items-center gap-2 text-xs font-semibold text-app-primary hover:text-app-secondary transition-colors focus:outline-none"
        >
          <MessageSquare className="w-4 h-4" />
          <span>
            {isAdmin
              ? comments.length > 0
                ? `Shared Discussion Thread (${comments.length})`
                : 'Shared Discussion Thread'
              : isStaff
              ? comments.length > 0
                ? `Work Notes & Resident Chat (${comments.length})`
                : 'Work Notes & Resident Chat'
              : comments.length > 0
              ? `Comments (${comments.length})`
              : 'Comments & Discussion'}
          </span>
          {showComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <span className="text-xs text-app-muted">
          Status: <strong className="text-app-text">{currentStatus}</strong>
        </span>
      </div>

      {/* Expandable Comments Drawer */}
      {showComments && (
        <div className="p-5 sm:p-6 bg-app-main border-t border-app-border space-y-4">
          {/* Transparency Notices */}
          {isAdmin ? (
            <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-900 dark:text-purple-200 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>
                <strong className="text-app-text">Administrator Notice:</strong> All updates and notes posted here are shared and visible to both the resident student and assigned maintenance staff.
              </span>
            </div>
          ) : isStaff ? (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong className="text-app-text">Shared Updates:</strong> Work notes and replies posted here are visible to the student resident in their portal.
              </span>
            </div>
          ) : null}

          {isLoadingComments ? (
            <div className="flex items-center justify-center py-6 text-app-muted text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-app-primary" />
              <span>Loading messages...</span>
            </div>
          ) : commentError ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{commentError}</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-app-muted text-xs">
              {isAdmin
                ? 'No messages recorded yet for this complaint. Post an administrative note below.'
                : isStaff
                ? 'No work notes or messages yet. Post an update below to notify the resident.'
                : 'No comments yet. Have a question or update regarding this ticket? Post below.'}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {comments.map((c, index) => (
                <div
                  key={c.id || index}
                  className="bg-app-card p-3.5 rounded-xl border border-app-border shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs text-app-muted mb-1">
                    <span className="font-semibold text-app-text">
                      Message #{c.id || index + 1}
                    </span>
                  </div>
                  <p className="text-xs text-app-text leading-relaxed whitespace-pre-line">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Comment Submission Form */}
          <form onSubmit={handlePostComment} className="pt-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  isAdmin
                    ? 'Post an administrative instruction or shared note...'
                    : isStaff
                    ? 'Post a repair update or reply to the resident...'
                    : 'Write a message or reply to staff...'
                }
                disabled={isPostingComment}
                className="flex-1 px-3.5 py-2 text-xs bg-app-card border border-app-border text-app-text placeholder:text-app-muted placeholder:opacity-60 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-primary focus:border-app-primary disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isPostingComment || !commentText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-app-primary text-white dark:text-[#171525] rounded-xl text-xs font-bold hover:bg-app-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
              >
                {isPostingComment ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAdmin ? 'Post Note' : isStaff ? 'Post Update' : 'Reply'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Full Image Modal Lightbox */}
      {showImageModal && imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-w-3xl w-full bg-app-card border border-app-border rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-app-card border-b border-app-border text-app-text flex items-center justify-between">
              <span className="text-sm font-semibold">
                Photo for Ticket #{ticket.id} - {ticket.title}
              </span>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1.5 rounded-lg text-app-muted hover:text-app-text hover:bg-app-main transition-colors"
                aria-label="Close photo preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-app-main flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={imageUrl}
                alt={`Full view for ticket #${ticket.id}`}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
