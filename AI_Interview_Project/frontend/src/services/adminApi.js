// frontend/src/services/adminApi.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Hoặc URL API của bạn

const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1/admin`, // Base URL cho các API admin
});

// Interceptor để tự động thêm token vào header
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

// Interceptor để xử lý lỗi 401 (Unauthorized) - ví dụ: tự động logout
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      console.warn("Admin API request unauthorized (401). Logging out.");
      localStorage.removeItem('admin_access_token');
      // Có thể điều hướng về trang login hoặc dispatch một action logout
      // window.location.href = '/admin/login'; // Cách đơn giản nhất
    }
    return Promise.reject(error);
  }
);

export default adminApi;