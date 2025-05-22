import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'; 
import { AuthAdminContext } from '../../contexts/AuthAdminContext';

import './AdminGlobal.css';
import './AdminLayout.css';
import './AdminEffects.css';
import './AdminNeumorphicTheme.css';
import './AdminQuestionSets.css'; // Thêm file CSS mới
         
function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const authContext = useContext(AuthAdminContext);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    // Giả sử thông tin admin được lấy từ context hoặc hardcode
    // Nếu lấy từ context, bạn sẽ dùng: const { adminInfo } = authContext;
    const adminInfo = authContext?.adminInfo || { // Fallback nếu adminInfo chưa có trong context
        fullName: 'Ngô Gia Khánh',
        nickname: 'devfromzk',
        email: '18khanh.2003@gmail.com'
    };
    
    // Kiểm tra xem admin đã đăng nhập chưa (ví dụ dựa vào token hoặc thông tin trong context)
    const isAdminLoggedIn = !!localStorage.getItem('admin_access_token') || (authContext && authContext.adminToken);


    const handleLogout = () => {
      if (authContext) {
        authContext.logoutAdmin();
      } else {
        localStorage.removeItem('admin_access_token');
      }
      navigate('/admin/login');
    };

    const toggleNav = () => setIsNavOpen(!isNavOpen);

    useEffect(() => {
        if (isNavOpen) {
            setIsNavOpen(false);
        }
    }, [location.pathname]);

  return (
    <div className="admin-layout">
      <header className="admin-main-header">
        <button className="admin-menu-toggle" onClick={toggleNav} aria-label="Toggle navigation" aria-expanded={isNavOpen}>
            <span className="material-icons">{isNavOpen ? 'close' : 'menu'}</span>
        </button>
        <div className="admin-header-title-area">
            <h2>Trang Quản Trị AI Interview</h2>
        </div>
        {isAdminLoggedIn && adminInfo && (
          <div className="admin-user-info-container">
            <button 
              className="admin-user-button" 
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              aria-expanded={showUserDropdown}
              aria-controls="admin-user-dropdown"
            >
              <span className="material-icons admin-user-avatar-icon">account_circle</span>
              <span className="admin-user-greeting">Chào, {adminInfo.nickname || adminInfo.fullName}!</span>
              <span className="material-icons admin-user-dropdown-icon">
                {showUserDropdown ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
            </button>
            {showUserDropdown && (
              <div className="admin-user-dropdown" id="admin-user-dropdown">
                <div className="dropdown-item-info">
                  <strong>{adminInfo.fullName}</strong>
                  <small>{adminInfo.email}</small>
                </div>
                <hr className="dropdown-divider"/>
                <button onClick={handleLogout} className="dropdown-item-action">
                  <span className="material-icons">logout</span>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        )}
      </header>
      
      <div className="admin-content-body">
        <nav className={`admin-nav ${isNavOpen ? 'open' : ''}`}>
            <div className="admin-nav-header-placeholder">
            </div>
            <ul>
            <li>
                <NavLink to="/admin/question-sets" className={({ isActive }) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
                    <span className="material-icons">quiz</span>
                    <span className="link-text">Quản lý Bộ Câu Hỏi</span>
                </NavLink>
            </li>
            <li>
                <NavLink to="/admin/interviews" className={({ isActive }) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
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
            </div>
        </nav>
        
        <div className="admin-content-wrapper">
            <main className="admin-content-container">
                <Outlet /> 
            </main>
        </div>
      </div>
    </div>
  );
}
export default AdminLayout;