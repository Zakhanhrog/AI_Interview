// frontend/src/pages/admin/InterviewsPage.jsx
import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import axios from 'axios';

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
      // SỬA: Dùng adminApi và đường dẫn tương đối
      const response = await adminApi.get('/interviews', { params }); 
      setInterviews(response.data);
    } catch (err) {
      let errMsg = 'Không thể tải danh sách phỏng vấn. ';
      if (axios.isAxiosError(err) && err.response) { 
         errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
      } else {
         errMsg += err.message;
      }
      setError(errMsg);
      console.error("Error fetching interviews:", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter]);

  return (
    // Phần JSX return giữ nguyên
    <div>
      <h1>Danh sách Các Buổi Phỏng Vấn</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label htmlFor="statusFilter">Lọc theo trạng thái: </label>
        <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="Đạt">Đạt</option>
          <option value="Không đạt">Không đạt</option>
          <option value="Cần xem xét thêm">Cần xem xét thêm</option>
        </select>
      </div>
      {isLoading && <p>Đang tải...</p>}
      {!isLoading && interviews.length === 0 && <p>Không tìm thấy buổi phỏng vấn nào.</p>}
      <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
         <thead>
             <tr style={{borderBottom: '1px solid #ccc', backgroundColor: '#f0f0f0'}}>
                 <th style={{padding: '8px', textAlign: 'left'}}>ID Phỏng vấn (DB)</th>
                 <th style={{padding: '8px', textAlign: 'left'}}>Bộ câu hỏi</th>
                 <th style={{padding: '8px', textAlign: 'left'}}>Ngày tạo</th>
                 <th style={{padding: '8px', textAlign: 'left'}}>Trạng thái ĐG</th>
                 <th style={{padding: '8px', textAlign: 'left'}}>Gợi ý (nếu có)</th>
             </tr>
         </thead>
         <tbody>
             {interviews.map(interview => (
                 <tr key={interview.id} style={{borderBottom: '1px solid #eee'}}>
                     <td style={{padding: '8px'}}>{interview.id}</td>
                     <td style={{padding: '8px'}}>{interview.question_set_id_name}</td>
                     <td style={{padding: '8px'}}>{new Date(interview.created_at).toLocaleString()}</td>
                     <td style={{padding: '8px'}}>{interview.overall_assessment?.status || 'Chưa có'}</td>
                     <td style={{padding: '8px'}}>{interview.overall_assessment?.suggestions_if_not_pass || 'N/A'}</td>
                 </tr>
             ))}
         </tbody>
      </table>
    </div>
  );
}

export default InterviewsPage;