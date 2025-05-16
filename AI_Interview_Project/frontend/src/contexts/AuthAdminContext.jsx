// frontend/src/contexts/AuthAdminContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthAdminContext = createContext(null);

export const AuthAdminProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_access_token'));
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(!!localStorage.getItem('admin_access_token'));

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token');
    if (token) {
      setAdminToken(token);
      setIsAdminLoggedIn(true);
    } else {
      setIsAdminLoggedIn(false);
    }
  }, []);

  const loginAdmin = (token) => {
    localStorage.setItem('admin_access_token', token);
    setAdminToken(token);
    setIsAdminLoggedIn(true);
  };

  const logoutAdmin = () => {
    localStorage.removeItem('admin_access_token');
    setAdminToken(null);
    setIsAdminLoggedIn(false);
  };

  return (
    <AuthAdminContext.Provider value={{ adminToken, isAdminLoggedIn, loginAdmin, logoutAdmin }}>
      {children}
    </AuthAdminContext.Provider>
  );
};