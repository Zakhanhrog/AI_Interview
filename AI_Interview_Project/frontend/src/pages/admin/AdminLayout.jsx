import React, { useContext } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom'; 
import { AuthAdminContext } from '../../contexts/AuthAdminContext';
import './AdminLayout.css';

function AdminLayout() {
    const navigate = useNavigate();
    const authContext = useContext(AuthAdminContext);
  
    const handleLogout = () => {
      if (authContext) {
        authContext.logoutAdmin();
      } else { // Fallback nếu không dùng context
        localStorage.removeItem('admin_access_token');
      }
      navigate('/admin/login');
    };
  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <h2>Trang Quản Trị</h2>
        <ul>
          <li><Link to="/admin/question-sets">Quản lý Bộ Câu Hỏi</Link></li>
          <li><Link to="/admin/interviews">Xem Phỏng Vấn</Link></li>
          {/* Thêm các link khác nếu cần */}
        </ul>
        <hr />
        <Link to="/">Về trang phỏng vấn</Link>
        <button onClick={handleLogout} style={{ marginTop: '20px', width: '100%'}}>Đăng xuất</button>
      </nav>
      <main className="admin-content">
        <Outlet /> {/* Đây là nơi các component con (QuestionSetsPage, InterviewsPage) sẽ được render */}
      </main>
    </div>
  );
}

export default AdminLayout;