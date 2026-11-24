import axios from 'axios';

// Storage key used across the application
export const TOKEN_KEY = 'hostel_token';

// Create dedicated Axios instance pointing to FastAPI backend
export const baseURL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor:
 * Automatically attaches the JWT token from localStorage to every outgoing request.
 */
api.interceptors.request.use(
  (config) => {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Handles 401 Unauthorized errors gracefully.
 * Avoids infinite loops by ignoring 401 on the login endpoint itself.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Only handle 401 on protected routes, NOT when the user is trying to log in
    if (error.response?.status === 401 && !originalRequest?.url?.includes('/auth/login')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
      
      // Notify application state to log out without causing reload loops
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Dedicated Authentication API Service
 */
export const authAPI = {
  /**
   * Log in user with email and password
   * Returns: { access_token, token_type, user: { id, name, email, role } }
   */
  async login(email, password) {
    const response = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    return response.data;
  },

  /**
   * Public Student Registration
   * Returns: { id, name, email, role: 'student' }
   */
  async register(name, email, password) {
    const response = await api.post('/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    return response.data;
  },

  /**
   * Get Current Authenticated User Profile
   * Uses Authorization: Bearer <token>
   * Returns: { id, name, email, role }
   */
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Create Staff or Admin Account (Admin only)
   * Uses authenticated Admin JWT token automatically attached by interceptor.
   * Payload: { name, email, password, role }
   * Returns: { id, name, email, role }
   */
  async createPrivilegedUser({ name, email, password, role }) {
    const response = await api.post('/auth/admin/create-user', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    });
    return response.data;
  },

  /**
   * Storage helpers
   */
  getToken() {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  },

  setToken(token) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  removeToken() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
};
 
/**
 * Dedicated Ticket, Dashboard, and Comment API Service
 */
export const ticketAPI = {
  /**
   * Fetch tickets scoped to the authenticated user's role.
   * For students, returns only their own submitted tickets.
   */
  async getMyTickets() {
    const response = await api.get('/tickets');
    return response.data;
  },

  /**
   * Fetch a single ticket by ID.
   */
  async getTicketById(ticketId) {
    const response = await api.get(`/tickets/${ticketId}`);
    return response.data;
  },

  /**
   * Fetch dashboard statistics scoped to the authenticated user.
   * Returns: { role, total_tickets, open_tickets, in_progress_tickets, resolved_tickets }
   */
  async getDashboard() {
    const response = await api.get('/dashboard');
    return response.data;
  },

  /**
   * Upload complaint photo.
   * Accepts: file (File object)
   * Returns: { message: string, image_url: string }
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/tickets/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Submit a new maintenance ticket.
   * Automatically sets user_id to current authenticated student in backend.
   * Returns: { message: string, data: { id, title, category, image_url, status } }
   */
  async createTicket(ticketData) {
    const response = await api.post('/tickets', {
      title: ticketData.title.trim(),
      description: ticketData.description ? ticketData.description.trim() : '',
      room_no: ticketData.room_no.trim(),
      priority: ticketData.priority || 'Medium',
      category: ticketData.category || 'General',
      image_url: ticketData.image_url || null,
    });
    return response.data;
  },

  /**
   * Update ticket status (Staff for assigned tickets, Admin for any).
   * Status must be 'Open', 'In Progress', or 'Resolved'.
   * Returns: { message: string, ticket: { id, status, assigned_to } }
   */
  async updateTicketStatus(ticketId, status) {
    const response = await api.put(`/tickets/${ticketId}/status`, {
      status,
    });
    return response.data;
  },

  /**
   * Fetch all registered maintenance staff members (Admin only).
   * Returns array of staff profiles: [{ id, name, email, role }]
   */
  async getStaffMembers() {
    const response = await api.get('/staff');
    return response.data;
  },

  /**
   * Assign a ticket to a maintenance staff member (Admin only).
   * Payload: { staff_id: Number }
   * Automatically transitions 'Open' tickets to 'In Progress' in backend.
   * Returns: { message: string, ticket: { id, status, assigned_to, staff_name } }
   */
  async assignTicket(ticketId, staffId) {
    const response = await api.put(`/tickets/${ticketId}/assign`, {
      staff_id: Number(staffId),
    });
    return response.data;
  },

  /**
   * Fetch comments for a specific ticket.
   * Returns array of comments: [{ id, ticket_id, text }]
   */
  async getComments(ticketId) {
    const response = await api.get(`/comments/${ticketId}`);
    return response.data;
  },

  /**
   * Add a comment to a ticket.
   * Returns: { message: string, comment_id: number }
   */
  async addComment(ticketId, text) {
    const response = await api.post('/comments', {
      ticket_id: Number(ticketId),
      text: text.trim(),
    });
    return response.data;
  },

  /**
   * Helper to format image URLs:
   * - Keeps Cloudinary / absolute HTTP URLs unchanged.
   * - Prepends the backend baseURL to relative local upload paths (e.g. /uploads/photo.jpg).
   */
  getImageUrl(imageUrl) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseURL}${cleanPath}`;
  },
};

/**
 * Dedicated Admin Account Management API Service (Stage 5.3B)
 */
export const adminAPI = {
  /**
   * Fetch all user accounts with their active status (Admin only).
   * Returns: [{ id, name, email, role, is_active }]
   */
  async getAllUsers() {
    const response = await api.get('/admin/users');
    return response.data;
  },

  /**
   * Deactivate a user account (Admin only).
   * Returns: { message, unassigned_tickets, user }
   */
  async deactivateUser(userId) {
    const response = await api.put(`/admin/users/${userId}/deactivate`);
    return response.data;
  },

  /**
   * Reactivate a user account (Admin only).
   * Returns: { message, user }
   */
  async reactivateUser(userId) {
    const response = await api.put(`/admin/users/${userId}/reactivate`);
    return response.data;
  },
};

export default api;
