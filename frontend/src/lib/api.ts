import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
let isRedirectingToLogin = false;

const api = axios.create({
  baseURL: API_URL,
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined') {
        const isAlreadyOnLogin = window.location.pathname === '/login';

        if (!isAlreadyOnLogin && !isRedirectingToLogin) {
          isRedirectingToLogin = true;
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
