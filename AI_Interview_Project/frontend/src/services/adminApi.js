// frontend/src/services/adminApi.js
import axios from 'axios';

const EFFECTIVE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const adminApi = axios.create({
  baseURL: EFFECTIVE_API_BASE_URL, // Sử dụng biến đã được xử lý ở trên
});

adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Admin API request unauthorized (401). Logging out or redirecting.");
      localStorage.removeItem('admin_access_token');
      // Cân nhắc điều hướng người dùng về trang đăng nhập ở đây nếu cần
      // Ví dụ: if (window.location.pathname !== '/admin/login') window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default adminApi;