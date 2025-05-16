// frontend/src/components/ProtectedRouteAdmin.jsx
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthAdminContext } from '../contexts/AuthAdminContext'; // Hoặc kiểm tra trực tiếp localStorage

function ProtectedRouteAdmin() {
  // Cách 1: Dùng Context (khuyến nghị)
  const authContext = useContext(AuthAdminContext);
  const isAuthenticated = authContext ? authContext.isAdminLoggedIn : !!localStorage.getItem('admin_access_token');

  // Cách 2: Kiểm tra trực tiếp localStorage (nếu không dùng context)
  // const isAuthenticated = !!localStorage.getItem('admin_access_token');

  if (!isAuthenticated) {
    // Redirect về trang đăng nhập admin nếu chưa đăng nhập
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />; // Nếu đã đăng nhập, render component con (AdminLayout)
}

export default ProtectedRouteAdmin;