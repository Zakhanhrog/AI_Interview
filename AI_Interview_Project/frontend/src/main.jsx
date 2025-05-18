// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import các components trang
import App from './App.jsx'; // Trang phỏng vấn của ứng viên
import AdminLayout from './pages/admin/AdminLayout.jsx';
import QuestionSetsPage from './pages/admin/QuestionSetsPage.jsx';
import InterviewsPage from './pages/admin/InterviewsPage.jsx';
import LoginPageAdmin from './pages/admin/LoginPageAdmin.jsx';

// Import các components chức năng
import ProtectedRouteAdmin from './components/ProtectedRouteAdmin.jsx';
import { AuthAdminProvider } from './contexts/AuthAdminContext'; // Import Auth Provider

import './index.css'; // CSS global

// Chỉ gọi ReactDOM.createRoot().render() MỘT LẦN DUY NHẤT
ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthAdminProvider> 
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin/login" element={<LoginPageAdmin />} />
          <Route element={<ProtectedRouteAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="question-sets" replace />} />
              <Route path="question-sets" element={<QuestionSetsPage />} />
              <Route path="interviews" element={<InterviewsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthAdminProvider>
);