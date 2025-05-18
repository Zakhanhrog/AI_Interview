// frontend/src/pages/admin/InterviewsPage.jsx
import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import axios from 'axios'; // Để dùng axios.isAxiosError

function InterviewsPage() {
  const [interviews, setInterviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInterviews = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) {
        params.status_filter = statusFilter;
      }
      const response = await adminApi.get('/admin/interviews', { params }); 
      setInterviews(response.data);
    } catch (err) {
      let errMsg = 'Không thể tải danh sách phỏng vấn. ';
      if (axios.isAxiosError(err) && err.response) { 
         errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
      } else {
         errMsg += err.message || 'Lỗi không xác định';
      }
      setError(errMsg);
      console.error("Error fetching interviews:", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInterviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]); // Thêm statusFilter vào dependency array

  return (
    // KHÔNG cần div bọc ngoài ở đây nếu AdminLayout.css đã có .admin-content-container
    // trừ khi bạn muốn style riêng cho toàn bộ nội dung trang này
    <> 
      <h1>Danh sách Các Buổi Phỏng Vấn</h1>
      {error && <p className="error-message" style={{ color: '#d93025', backgroundColor: '#fff0f1', padding: '10px', borderRadius: '6px', border: '1px solid #f5c6cb', marginBottom: '15px' }}>{error}</p>}
      
      <div className="admin-form-group" style={{maxWidth: '400px', marginBottom: '20px'}}> {/* Giới hạn độ rộng của bộ lọc */}
        <label htmlFor="statusFilter">Lọc theo trạng thái đánh giá:</label>
        <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="Đạt">Đạt</option>
          <option value="Không đạt">Không đạt</option>
          <option value="Cần xem xét thêm">Cần xem xét thêm</option>
          {/* Thêm các trạng thái khác từ model OverallAssessment nếu có */}
        </select>
      </div>

      {isLoading && <p>Đang tải danh sách phỏng vấn...</p>}
      {!isLoading && interviews.length === 0 && !error && <p>Không tìm thấy buổi phỏng vấn nào phù hợp.</p>}
      
      {!isLoading && interviews.length > 0 && (
        <div style={{ overflowX: 'auto' }}> {/* Thêm div này để bảng có thể scroll ngang trên màn hình nhỏ nếu cần */}
          <table className="admin-table">
            <thead>
                <tr>
                    <th>ID Phỏng vấn</th>
                    <th>Bộ câu hỏi chung</th>
                    <th>Lĩnh vực</th>
                    <th>Vị trí mong muốn</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái ĐG</th>
                    <th>Gợi ý (nếu có)</th>
                </tr>
            </thead>
            <tbody>
                {interviews.map(interview => (
                    <tr key={interview.id}>
                        <td style={{wordBreak: 'break-all'}}>{interview.id}</td>
                        <td>{interview.general_question_set_id_name || 'N/A'}</td>
                        <td>{interview.selected_field !== 'none' ? (interview.selected_field === 'developer' ? 'Developer' : 'Designer') : 'Chung'}</td>
                        <td>{interview.desired_position_in_field || 'N/A'}</td>
                        <td>{new Date(interview.start_time).toLocaleString('vi-VN')}</td>
                        <td>{interview.overall_assessment?.status || 'Chưa đánh giá'}</td>
                        <td>{interview.overall_assessment?.suggestions_if_not_pass || 'N/A'}</td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default InterviewsPage;