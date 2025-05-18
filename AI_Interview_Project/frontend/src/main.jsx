// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Import các components trang
import App from './App.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import QuestionSetsPage from './pages/admin/QuestionSetsPage.jsx';
import InterviewsPage from './pages/admin/InterviewsPage.jsx';
import LoginPageAdmin from './pages/admin/LoginPageAdmin.jsx';
import AdminInterviewDetailPage from './pages/admin/AdminInterviewDetailPage.jsx';
// Import các components chức năng
import ProtectedRouteAdmin from './components/ProtectedRouteAdmin.jsx';
import { AuthAdminProvider } from './contexts/AuthAdminContext';
import './index.css';

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
          <Route path="interviews/:interviewId" element={<AdminInterviewDetailPage />} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
</AuthAdminProvider>
);