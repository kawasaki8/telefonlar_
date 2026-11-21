/**
 * PHONE ARENA - API Client
 * Connects to the local Python REST API endpoints.
 */

const API = {
  baseUrl: '',

  getAuthToken() {
    return localStorage.getItem('phone_arena_token') || '';
  },

  setAuthToken(token) {
    if (token) {
      localStorage.setItem('phone_arena_token', token);
    } else {
      localStorage.removeItem('phone_arena_token');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || `Xatolik yuz berdi (${response.status})`);
      }
      return data;
    } catch (err) {
      console.error(`API Xatosi (${endpoint}):`, err);
      throw err;
    }
  },

  // 1. Get smartphone list with filters
  async getSmartphones(params = {}) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    return this.request(`/api/smartphones?${query.toString()}`);
  },

  // 2. Get single smartphone detail
  async getSmartphoneDetail(id) {
    return this.request(`/api/smartphones/${id}`);
  },

  // 3. Comparison
  async getComparison(ids = []) {
    return this.request(`/api/comparison?ids=${ids.join(',')}`);
  },

  // 4. AnTuTu Overview
  async getAntutuOverview() {
    return this.request('/api/antutu/overview');
  },

  // 5. System Stats
  async getStats() {
    return this.request('/api/stats');
  },

  // 6. Admin Login
  async adminLogin(pin) {
    const res = await this.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
    if (res.success && res.token) {
      this.setAuthToken(res.token);
    }
    return res;
  },

  // 7. Check Admin Auth
  async checkAdminAuth() {
    try {
      const res = await this.request('/api/admin/check');
      return res.authenticated;
    } catch {
      return false;
    }
  },

  // 8. Create Smartphone (Admin)
  async createSmartphone(phoneData) {
    return this.request('/api/smartphones', {
      method: 'POST',
      body: JSON.stringify(phoneData)
    });
  },

  // 9. Update Smartphone (Admin)
  async updateSmartphone(id, phoneData) {
    return this.request(`/api/smartphones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(phoneData)
    });
  },

  // 10. Delete Smartphone (Admin)
  async deleteSmartphone(id) {
    return this.request(`/api/smartphones/${id}`, {
      method: 'DELETE'
    });
  }
};

