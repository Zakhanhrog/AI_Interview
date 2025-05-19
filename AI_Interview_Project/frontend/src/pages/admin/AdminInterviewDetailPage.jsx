import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import axios from 'axios';
import './AdminInterviewDetailPage.css';

function AdminInterviewDetailPage() {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Nhãn cho các trường thông tin ứng viên
  const candidateInfoLabels = {
    full_name: "Họ và tên",
    email: "Email",
    date_of_birth: "Ngày sinh",
    gender: "Giới tính",
    phone_number: "Điện thoại",
    education_level: "Trình độ học vấn",
    major_specialization: "Chuyên ngành",
    school_university: "Trường học",
    has_work_experience: "Có kinh nghiệm làm việc",
    years_of_experience: "Số năm kinh nghiệm",
    experience_field: "Lĩnh vực kinh nghiệm",
    interested_field: "Lĩnh vực quan tâm",
    career_goal_short: "Mục tiêu nghề nghiệp",
    key_skills: "Kỹ năng nổi bật",
    cv_link: "Link CV",
    linkedin_profile: "LinkedIn Profile",
    portfolio_github: "Portfolio / GitHub"
  };


  useEffect(() => {
    const fetchInterviewDetail = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await adminApi.get(`/admin/interviews/${interviewId}`);
        setInterview(response.data);
      } catch (err) {
        let errMsg = `Không thể tải chi tiết phỏng vấn ID: ${interviewId}. `;
        if (axios.isAxiosError(err) && err.response) {
          errMsg += err.response.data?.detail || err.message;
        } else {
          errMsg += err.message || 'Lỗi không xác định.';
        }
        setError(errMsg);
        console.error("Error fetching interview detail:", err);
      }
      setIsLoading(false);
    };

    if (interviewId) {
      fetchInterviewDetail();
    }
  }, [interviewId]);

  if (isLoading) {
    return <div className="admin-loading-indicator"><p>Đang tải chi tiết buổi phỏng vấn...</p></div>;
  }

  if (error) {
    return <p className="admin-message-box admin-message-error">{error}</p>;
  }

  if (!interview) {
    return <p>Không tìm thấy thông tin buổi phỏng vấn.</p>;
  }

  const getFieldTypeName = (fieldType) => {
    if (fieldType === 'developer') return 'Developer';
    if (fieldType === 'designer') return 'Designer';
    return 'Chung';
  };
  
  const getLifecycleStatusName = (status) => {
    const names = {
        "info_submitted": "Đã gửi thông tin",
        "general_in_progress": "Đang hỏi chung",
        "awaiting_specialization": "Chờ chọn lĩnh vực",
        "specialized_in_progress": "Đang hỏi chuyên ngành",
        "completed": "Đã hoàn thành",
        "abandoned": "Đã bỏ dở" 
    };
    return names[status] || status;
  }
  
  const renderQnAItem = (item, index, typePrefix) => (
    <div key={`${typePrefix}-${item.question_id}-${index}`} className="qna-item">
        <p className="qna-question"><strong>Câu hỏi {index + 1}:</strong> {item.question_text}</p>
        <p className="qna-answer"><strong>Ứng viên trả lời:</strong> <span dangerouslySetInnerHTML={{ __html: item.candidate_answer ? item.candidate_answer.replace(/\n/g, '<br />') : "<em>Chưa trả lời</em>" }} /></p>
        {item.ai_feedback_per_answer && (
            <p className="qna-ai-feedback"><strong>Nhận xét AI:</strong> <span dangerouslySetInnerHTML={{ __html: item.ai_feedback_per_answer.replace(/\n/g, '<br />') }} /></p>
        )}
    </div>
  );

  const formatDateString = (dateString) => {
    if (!dateString) return 'Chưa cung cấp';
    try {
      // Giả sử dateString là dạng YYYY-MM-DD (từ datetime.date.isoformat())
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      // Nếu là datetime string đầy đủ
      const dateObj = new Date(dateString);
      return dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateString; // Trả về chuỗi gốc nếu không parse được
    }
  };
  
  const renderCandidateInfo = (info) => {
    if (!info || Object.keys(info).length === 0) {
      return <p>Không có thông tin ứng viên được cung cấp.</p>;
    }
    return Object.entries(info).map(([key, value]) => {
      if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
        return null; // Bỏ qua các trường null, undefined hoặc mảng rỗng
      }
      const label = candidateInfoLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let displayValue = value;

      if (key === 'date_of_birth') {
        displayValue = formatDateString(value);
      } else if (key === 'has_work_experience') {
        displayValue = value ? `Có (${info.years_of_experience || 0} năm kinh nghiệm - Lĩnh vực: ${info.experience_field || 'Không rõ'})` : 'Chưa có kinh nghiệm';
        // Không hiển thị years_of_experience và experience_field riêng nữa nếu đã gộp
        if(value) {
            delete info.years_of_experience; 
            delete info.experience_field;
        }
      } else if (Array.isArray(value)) {
        displayValue = value.join(', ');
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Có' : 'Không';
      } else if ((key.includes('link') || key.includes('profile') || key.includes('portfolio')) && typeof value === 'string' && value.startsWith('http')) {
        displayValue = <a href={value} target="_blank" rel="noopener noreferrer" className="admin-link">{value}</a>;
      }


      // Chỉ render nếu key không bị xóa (như years_of_experience, experience_field sau khi gộp)
      if (info.hasOwnProperty(key)) {
          return (
            <p key={key}><strong>{label}:</strong> {displayValue}</p>
          );
      }
      return null;
    }).filter(Boolean); // Lọc bỏ các giá trị null
  };


  return (
    <div className="admin-interview-detail-page">
      <div style={{ marginBottom: '25px' }}>
        <Link to="/admin/interviews" className="admin-button admin-button-secondary">
            <span className="material-icons">arrow_back</span>
            Quay lại Danh sách
        </Link>
      </div>

      <h1>Chi Tiết Buổi Phỏng Vấn</h1>

      <div className="admin-section-card interview-summary-card">
        <h3>Thông Tin Buổi Phỏng Vấn</h3>
        <div className="info-grid">
            <p><strong>ID:</strong> <span style={{wordBreak: 'break-all'}}>{interview.id}</span></p>
            <p><strong>Bắt đầu:</strong> {new Date(interview.start_time).toLocaleString('vi-VN')}</p>
            {interview.end_time && <p><strong>Kết thúc:</strong> {new Date(interview.end_time).toLocaleString('vi-VN')}</p>}
            <p><strong>Cập nhật cuối:</strong> {new Date(interview.updated_at).toLocaleString('vi-VN')}</p>
            <p><strong>Đã hoàn thành:</strong> {interview.is_completed ? 'Có' : 'Không'}</p>
            <p><strong>Trạng thái vòng đời:</strong> {getLifecycleStatusName(interview.lifecycle_status)}</p>
            {interview.selected_field && interview.selected_field !== 'none' && (
                <p><strong>Lĩnh vực đã chọn:</strong> {getFieldTypeName(interview.selected_field)}</p>
            )}
            {interview.desired_position_in_field && (
                <p><strong>Vị trí ứng tuyển (từ Q&A):</strong> {interview.desired_position_in_field}</p>
            )}
            <p><strong>Bộ câu hỏi chung:</strong> {interview.general_question_set_id_name || 'N/A'}</p>
            {interview.specialized_question_set_id_name && (
                <p><strong>Bộ câu hỏi chuyên môn:</strong> {interview.specialized_question_set_id_name}</p>
            )}
        </div>
      </div>
      
      {/* PHẦN HIỂN THỊ THÔNG TIN ỨNG VIÊN */}
      {interview.candidate_info_raw && (
           <div className="admin-section-card interview-candidate-info-card">
               <h3>Thông Tin Ứng Viên Đã Cung Cấp</h3>
               <div className="info-grid">
                    {renderCandidateInfo(interview.candidate_info_raw)}
               </div>
           </div>
       )}

      {interview.general_answers_and_feedback && interview.general_answers_and_feedback.length > 0 && (
        <div className="admin-section-card interview-qna-section">
          <h3>Phần Câu Hỏi Chung</h3>
          {interview.general_answers_and_feedback.map((item, index) => renderQnAItem(item, index, 'general'))}
        </div>
      )}

      {interview.specialized_answers_and_feedback && interview.specialized_answers_and_feedback.length > 0 && (
        <div className="admin-section-card interview-qna-section">
          <h3>Phần Câu Hỏi Chuyên Môn ({getFieldTypeName(interview.selected_field)})</h3>
          {interview.specialized_answers_and_feedback.map((item, index) => {
              return renderQnAItem(item, index, 'specialized');
          })}
        </div>
      )}
      
      {interview.overall_assessment && (
        <div className="admin-section-card interview-assessment-section">
          <h3>Đánh Giá Tổng Thể của AI</h3>
          <p><strong>Trạng thái đánh giá:</strong> {interview.overall_assessment.status || 'Chưa có'}</p>
          {interview.overall_assessment.suitability_for_field && (
             <p><strong>Độ phù hợp với lĩnh vực ({getFieldTypeName(interview.selected_field)}):</strong> {interview.overall_assessment.suitability_for_field}</p>
          )}
          {interview.overall_assessment.suggested_positions && interview.overall_assessment.suggested_positions.length > 0 && (
            <div>
                <strong>Vị trí gợi ý:</strong>
                <ul>
                    {interview.overall_assessment.suggested_positions.map((pos, i) => <li key={`pos-${i}`}>{pos}</li>)}
                </ul>
            </div>
          )}
          {interview.overall_assessment.strengths && interview.overall_assessment.strengths.length > 0 && (
            <div>
                <strong>Điểm mạnh:</strong>
                <ul>
                    {interview.overall_assessment.strengths.map((s, i) => <li key={`s-${i}`}>{s}</li>)}
                </ul>
            </div>
          )}
          {interview.overall_assessment.weaknesses && interview.overall_assessment.weaknesses.length > 0 && (
            <div>
                <strong>Điểm yếu/Cần cải thiện:</strong>
                <ul>
                    {interview.overall_assessment.weaknesses.map((w, i) => <li key={`w-${i}`}>{w}</li>)}
                </ul>
            </div>
          )}
           {interview.overall_assessment.suggestions_if_not_pass && (
            <p><strong>Gợi ý (nếu không đạt):</strong> {interview.overall_assessment.suggestions_if_not_pass}</p>
          )}
          {interview.overall_assessment.raw_ai_summary_text && (
            <details className="raw-summary-details">
              <summary>Xem chi tiết phản hồi gốc từ AI</summary>
              <pre>
                {interview.overall_assessment.raw_ai_summary_text}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminInterviewDetailPage;