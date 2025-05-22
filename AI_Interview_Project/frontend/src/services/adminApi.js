import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const adminApi = axios.create({
  baseURL: 'http://localhost:8000/api/v1', 
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
      console.warn("Admin API request unauthorized (401). Consider redirecting to login.");
      localStorage.removeItem('admin_access_token');
    }
    return Promise.reject(error);
  }
);

export default adminApi;