import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import axios from 'axios';
import './InterviewsPage.css'; 

function InterviewsPage() {
  const [interviews, setInterviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [lifecycleFilter, setLifecycleFilter] = useState(''); // Mặc định là rỗng, backend sẽ hiểu là 'completed' nếu showAll là false
  const [overallAssessmentStatusFilter, setOverallAssessmentStatusFilter] = useState('');
  const [showAllStatuses, setShowAllStatuses] = useState(false);

  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      const params = {
        limit: 50, // Ví dụ: giới hạn số lượng kết quả
        skip: 0,
      };
      if (showAllStatuses) {
        params.show_all_statuses = true;
        // Nếu show_all_statuses, không cần gửi lifecycleFilter nếu muốn backend bỏ qua nó hoàn toàn
        // Hoặc nếu backend logic là show_all_statuses = true sẽ ghi đè lifecycle_filter
      } else {
         if (lifecycleFilter) {
            params.lifecycle_status_filter = lifecycleFilter;
         } else {
             params.lifecycle_status_filter = "completed"; // Mặc định khi không show all và không có filter cụ thể
         }
      }

      if (overallAssessmentStatusFilter) {
        params.overall_assessment_status_filter = overallAssessmentStatusFilter;
      }
      
      const response = await adminApi.get('/admin/interviews', { params }); 
      setInterviews(response.data);
      setError('');
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
  }, [lifecycleFilter, overallAssessmentStatusFilter, showAllStatuses]);

  const getLifecycleStatusName = (status) => {
    const names = {
        "pending_start": "Chờ bắt đầu",
        "general_in_progress": "Đang hỏi chung",
        "awaiting_specialization": "Chờ chọn lĩnh vực",
        "specialized_in_progress": "Đang hỏi chuyên ngành",
        "completed": "Hoàn thành",
        "abandoned": "Bỏ dở"
    };
    return names[status] || status;
  }

  return (
    <> 
      <h1>Danh sách Các Buổi Phỏng Vấn</h1>
      {error && <p className="admin-message-box admin-message-error">{error}</p>}
      
      <div className="admin-filters-container">
        <div className="admin-form-group interviews-filter-group">
          <label htmlFor="lifecycleFilter">Lọc theo trạng thái vòng đời:</label>
          <select id="lifecycleFilter" value={lifecycleFilter} onChange={(e) => setLifecycleFilter(e.target.value)} disabled={showAllStatuses}>
            <option value="">Tất cả (nếu "Hiện tất cả" được chọn)</option>
            <option value="pending_start">Chờ bắt đầu</option>
            <option value="general_in_progress">Đang hỏi chung</option>
            <option value="awaiting_specialization">Chờ chọn lĩnh vực</option>
            <option value="specialized_in_progress">Đang hỏi chuyên ngành</option>
            <option value="completed">Đã Hoàn thành</option>
            <option value="abandoned">Đã Bỏ dở</option>
          </select>
        </div>

        <div className="admin-form-group interviews-filter-group">
            <label htmlFor="overallAssessmentStatusFilter">Lọc theo trạng thái đánh giá cuối:</label>
            <select id="overallAssessmentStatusFilter" value={overallAssessmentStatusFilter} onChange={(e) => setOverallAssessmentStatusFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="Đạt">Đạt</option>
            <option value="Không đạt">Không đạt</option>
            <option value="Cần xem xét thêm">Cần xem xét thêm</option>
            </select>
        </div>
        
        <div className="admin-form-group admin-form-checkbox-group">
            <input type="checkbox" id="showAllStatuses" checked={showAllStatuses} onChange={(e) => setShowAllStatuses(e.target.checked)} />
            <label htmlFor="showAllStatuses">Hiển thị tất cả các trạng thái vòng đời (bỏ qua bộ lọc vòng đời ở trên)</label>
        </div>
      </div>


      {isLoading && <p>Đang tải danh sách phỏng vấn...</p>}
      {!isLoading && interviews.length === 0 && !error && <p>Không tìm thấy buổi phỏng vấn nào phù hợp với tiêu chí lọc.</p>}
      
      {!isLoading && interviews.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
                <tr>
                    <th>ID Phỏng vấn</th>
                    <th>Lĩnh vực</th>
                    <th>Vị trí mong muốn</th>
                    <th>Ngày bắt đầu</th>
                    <th>Cập nhật cuối</th>
                    <th>Trạng thái vòng đời</th>
                    <th>Trạng thái ĐG</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                {interviews.map(interview => (
                    <tr key={interview.id}>
                        <td style={{wordBreak: 'break-all', maxWidth: '150px'}}>{interview.id}</td>
                        <td>{interview.selected_field && interview.selected_field !== 'none' ? (interview.selected_field.charAt(0).toUpperCase() + interview.selected_field.slice(1)) : 'Chung'}</td>
                        <td>{interview.desired_position_in_field || 'N/A'}</td>
                        <td>{new Date(interview.start_time).toLocaleString('vi-VN')}</td>
                        <td>{new Date(interview.updated_at).toLocaleString('vi-VN')}</td>
                        <td>{getLifecycleStatusName(interview.lifecycle_status)}</td>
                        <td>{interview.overall_assessment?.status || 'Chưa ĐG'}</td>
                        <td>
                            <Link 
                                to={`/admin/interviews/${interview.id}`} 
                                className="admin-button admin-button-small admin-button-outline"
                            >
                                <span className="material-icons" style={{fontSize: '1em', marginRight:'4px'}}>visibility</span>
                                Xem
                            </Link>
                        </td>
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