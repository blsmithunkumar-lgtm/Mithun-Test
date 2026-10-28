import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Login must be independent of any token left behind by an old browser session.
// A stale Authorization header should never interfere with a fresh sign-in.
axiosClient.interceptors.request.use((config) => {
  const isLoginRequest = /\/auth\/login\/?$/.test(config.url || '');
  if (isLoginRequest) {
    if (config.headers) delete config.headers.Authorization;
    return config;
  }

  const token = localStorage.getItem('cbt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers) {
    delete config.headers.Authorization;
  }
  return config;
});

// Normalize API errors while distinguishing server responses from browser-level
// failures such as CORS, offline connections, DNS, or blocked requests.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    let message = serverMessage || 'Something went wrong. Please try again.';
    const fieldErrors = error.response?.data?.errors || [];

    if (!error.response) {
      message = 'Cannot reach the server. Check your connection or try again shortly.';
    } else if (status >= 500) {
      message = serverMessage || 'The server is temporarily unavailable. Please try again shortly.';
    }

    // Clear expired/invalid sessions, but never redirect a failed login request.
    if (status === 401 && !/\/auth\/login\/?$/.test(error.config?.url || '')) {
      localStorage.removeItem('cbt_token');
      localStorage.removeItem('cbt_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ status, message, fieldErrors, raw: error });
  },
);

export default axiosClient;
