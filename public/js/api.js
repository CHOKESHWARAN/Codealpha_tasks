/**
 * AlphaStore API Client Layer
 * Handles communication with Express REST backend and JWT authentication headers
 */

const API_BASE = '/api';

const API = {
  // Authentication token management
  getToken() {
    return localStorage.getItem('alpha_token') || null;
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('alpha_token', token);
    } else {
      localStorage.removeItem('alpha_token');
    }
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('alpha_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem('alpha_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('alpha_user');
    }
  },

  // Base fetch wrapper with error handling & auth header
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'}] ${url}:`, err);
      throw err;
    }
  },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    if (params.minPrice) query.append('minPrice', params.minPrice);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/products${qs}`);
  },

  async getProductById(id) {
    return this.request(`/products/${id}`);
  },

  async getCategories() {
    return this.request('/products/categories');
  },

  // Coupons
  async applyCoupon(code, subtotal) {
    return this.request('/coupons/apply', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal })
    });
  },

  // Authentication
  async register(name, email, password) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    if (res.token && res.user) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token && res.user) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  logout() {
    this.setToken(null);
    this.setCurrentUser(null);
  },

  // Orders
  async createOrder(orderPayload) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });
  },

  async getOrderById(id) {
    return this.request(`/orders/${id}`);
  },

  async getMyOrders() {
    return this.request('/orders/user/my-orders');
  }
};
