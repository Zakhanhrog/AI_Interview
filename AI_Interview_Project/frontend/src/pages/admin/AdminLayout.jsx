// frontend/src/pages/admin/AdminLayout.jsx
import React, { useContext, useState } from 'react'; // Thêm useState
import { NavLink, Outlet, useNavigate } from 'react-router-dom'; 
import { AuthAdminContext } from '../../contexts/AuthAdminContext';
import './AdminLayout.css'; // CSS đã cập nhật

function AdminLayout() {
    const navigate = useNavigate();
    const authContext = useContext(AuthAdminContext);
    // const [isNavOpen, setIsNavOpen] = useState(false); // Cho responsive mobile drawer

    const handleLogout = () => {
      if (authContext) {
        authContext.logoutAdmin();
      } else {
        localStorage.removeItem('admin_access_token');
      }
      navigate('/admin/login');
    };

    // const toggleNav = () => setIsNavOpen(!isNavOpen);

  return (
    <div className="admin-layout">
      {/* <button className="admin-menu-toggle" onClick={toggleNav}>
          <span className="material-icons">menu</span>
      </button> */}
      {/* <nav className={`admin-nav ${isNavOpen ? 'open' : ''}`}> */}
      <nav className="admin-nav">
        <div className="admin-nav-header">
          <h2>Trang Quản Trị</h2>
          {/* <p className="app-version">v1.0.0</p>  */}
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
          {/* Thêm các link khác nếu cần, ví dụ:
          <li>
            <NavLink to="/admin/settings">
                <span className="material-icons">settings</span>
                <span className="link-text">Cài đặt</span>
            </NavLink>
          </li>
          */}
        </ul>
        <div className="admin-nav-footer">
            {/* Ví dụ link về trang chủ (trang ứng viên) */}
            <NavLink to="/" className="nav-link-button" style={{ borderLeft: '3px solid transparent', display: 'flex', alignItems: 'center', marginBottom: '15px'}}>
                 <span className="material-icons">home</span>
                 <span className="link-text">Về trang phỏng vấn</span>
            </NavLink>
            <button onClick={handleLogout} className="logout-button">
                <span className="material-icons">logout</span>
                <span className="link-text">Đăng xuất</span>
            </button>
        </div>
      </nav>
      
      <div className="admin-content-wrapper"> {/* Thêm một div bọc ngoài content */}
        <main className="admin-content-container"> {/* Container bên trong có padding */}
            <Outlet /> {/* Đây là nơi các component con sẽ được render */}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;