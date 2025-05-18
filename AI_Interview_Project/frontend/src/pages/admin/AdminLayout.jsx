// frontend/src/pages/admin/AdminLayout.jsx
import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'; 
import { AuthAdminContext } from '../../contexts/AuthAdminContext';

import './AdminGlobal.css'; // Import global styles
import './AdminLayout.css';         // Import layout specific styles

function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const authContext = useContext(AuthAdminContext);
    const [isNavOpen, setIsNavOpen] = useState(false);

    const handleLogout = () => {
      if (authContext) {
        authContext.logoutAdmin();
      } else {
        localStorage.removeItem('admin_access_token');
      }
      navigate('/admin/login');
    };

    const toggleNav = () => setIsNavOpen(!isNavOpen);

    // Đóng nav khi chuyển trang trên mobile
    useEffect(() => {
        if (isNavOpen) {
            setIsNavOpen(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

  return (
    <div className="admin-layout">
      <button className="admin-menu-toggle" onClick={toggleNav} aria-label="Toggle navigation" aria-expanded={isNavOpen}>
          <span className="material-icons">{isNavOpen ? 'close' : 'menu'}</span>
      </button>
      <nav className={`admin-nav ${isNavOpen ? 'open' : ''}`}>
        <div className="admin-nav-header">
          <h2>Trang Quản Trị</h2>
        </div>
        <ul>
          <li>
            <NavLink to="/admin/question-sets">
                <span className="material-icons">quiz</span>
                <span className="link-text">Quản lý Bộ Câu Hỏi</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/interviews">
                <span className="material-icons">history_edu</span>
                <span className="link-text">Xem Phỏng Vấn</span>
            </NavLink>
          </li>
        </ul>
        <div className="admin-nav-footer">
            <NavLink to="/" className="nav-link-button" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', borderLeftColor: 'transparent'}}>
                 <span className="material-icons">home</span>
                 <span className="link-text">Về trang phỏng vấn</span>
            </NavLink>
            <button onClick={handleLogout} className="admin-button admin-button-danger logout-button">
                <span className="material-icons">logout</span>
                <span className="link-text">Đăng xuất</span>
            </button>
        </div>
      </nav>
      
      <div className="admin-content-wrapper">
        <main className="admin-content-container">
            <Outlet /> 
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;