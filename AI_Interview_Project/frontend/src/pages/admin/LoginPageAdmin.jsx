import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthAdminContext } from '../../contexts/AuthAdminContext';
import './LoginPageAdmin.css'; // Import file CSS mới

const API_BASE_URL = 'http://localhost:8000';

function LoginPageAdmin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const authContext = useContext(AuthAdminContext);
  const { loginAdmin } = authContext || {};
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const response = await axios.post(`${API_BASE_URL}/api/v1/admin/auth/token`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const { access_token } = response.data;
      if (access_token) {
        if (loginAdmin) {
            loginAdmin(access_token);
        } else {
            localStorage.setItem('admin_access_token', access_token);
        }
        navigate('/admin/question-sets'); 
      } else {
        setError('Đăng nhập thất bại, không nhận được token.');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="login-admin-page-wrapper"> {/* Bọc ngoài */}
      <div className="login-admin-container">
        <h2>Đăng nhập Quản trị</h2>
        <form onSubmit={handleSubmit} className="login-admin-form">
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              type="text"
              id="username"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button 
            type="submit" 
            disabled={isLoading}
            className={isLoading ? 'loading-state' : ''} // Class cho hiệu ứng loading
          >
            {isLoading ? 'Đang xử lý' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPageAdmin;