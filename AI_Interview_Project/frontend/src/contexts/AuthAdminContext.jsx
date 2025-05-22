import React, { createContext, useState, useEffect } from 'react';
import adminApi from '../services/adminApi'; // Giả sử bạn có API để lấy thông tin /me

export const AuthAdminContext = createContext(null);

export const AuthAdminProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_access_token'));
  const [adminInfo, setAdminInfo] = useState(null); // State mới để lưu thông tin admin
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(!!localStorage.getItem('admin_access_token'));
  const [authLoading, setAuthLoading] = useState(true); // State để quản lý việc tải thông tin ban đầu

  const fetchAdminInfo = async (currentToken) => {
    if (currentToken) {
      try {
        // Gắn token vào header cho request này, adminApi interceptor sẽ làm việc này
        // Nếu bạn không muốn dùng interceptor ở đây, bạn có thể set header thủ công
        const response = await adminApi.get('/admin/auth/me'); // Endpoint /admin/auth/me
        setAdminInfo(response.data); // Lưu thông tin admin
        setIsAdminLoggedIn(true);
      } catch (error) {
        console.error("Failed to fetch admin info:", error);
        // Nếu lỗi (ví dụ token hết hạn), thực hiện logout
        logoutAdmin(); // Để đảm bảo trạng thái nhất quán
      }
    } else {
      setIsAdminLoggedIn(false);
      setAdminInfo(null);
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    const tokenFromStorage = localStorage.getItem('admin_access_token');
    setAdminToken(tokenFromStorage);
    fetchAdminInfo(tokenFromStorage);
  }, []);

  const loginAdmin = (token, receivedAdminInfo = null) => {
    localStorage.setItem('admin_access_token', token);
    setAdminToken(token);
    if (receivedAdminInfo) {
      setAdminInfo(receivedAdminInfo); // Nếu API login trả về info
      setIsAdminLoggedIn(true);
      setAuthLoading(false);
    } else {
      fetchAdminInfo(token); // Nếu không, fetch riêng
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('admin_access_token');
    setAdminToken(null);
    setAdminInfo(null);
    setIsAdminLoggedIn(false);
    setAuthLoading(false); // Không cần tải gì nữa sau khi logout
  };

  // Nếu đang tải thông tin xác thực ban đầu, có thể hiển thị một loader chung
  // if (authLoading) {
  //   return <div>Loading authentication...</div>; 
  // }

  return (
    <AuthAdminContext.Provider value={{ adminToken, adminInfo, isAdminLoggedIn, authLoading, loginAdmin, logoutAdmin, fetchAdminInfo }}>
      {children}
    </AuthAdminContext.Provider>
  );
};