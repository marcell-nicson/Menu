/**
 * API Client para DevLinks
 */
class DevLinksAPI {
  constructor() {
    // Em produção na Vercel, usamos rotas relativas
    this.baseURL = '/api';
    this.tokenKey = 'devlinks_token';
  }

  // Token management
  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  // HTTP client
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle FormData (for file uploads)
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      console.log('Making API request to:', url, config);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('API Response:', data);
        return data;
      }
      
      return await response.text();
    } catch (error) {
      console.error('API Request failed:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique se a API está rodando.');
      }
      
      throw error;
    }
  }

  // Auth methods
  async register(email, password) {
    const data = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(data.token);
    return data.user;
  }

  async login(email, password) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(data.token);
    return data.user;
  }

  logout() {
    this.setToken(null);
  }

  // User methods
  async getMe() {
    const data = await this.request('/me');
    return data.user;
  }

  async getPublicProfile(handle) {
    const data = await this.request(`/u/${encodeURIComponent(handle)}`);
    return data.user;
  }

  async updateMe(updates) {
    const data = await this.request('/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.user;
  }

  // File upload
  async uploadAvatar(file, variant = 'dark') {
    const formData = new FormData();
    formData.append('file', file);
    
    const data = await this.request(`/upload/avatar?variant=${variant}`, {
      method: 'POST',
      body: formData,
    });
    
    return data;
  }

  // Health check
  async healthCheck() {
    return await this.request('/health');
  }
}

// Create global instance
window.api = new DevLinksAPI();
