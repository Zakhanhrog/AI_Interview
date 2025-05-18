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
        "pending_start": "Chờ bắt đầu",
        "general_in_progress": "Đang hỏi chung",
        "awaiting_specialization": "Chờ chọn lĩnh vực",
        "specialized_in_progress": "Đang hỏi chuyên ngành",
        "completed": "Hoàn thành",
        "abandoned": "Bỏ dở (Timeout)"
    };
    return names[status] || status;
  }
  
  const renderQnAItem = (item, index, type) => (
    <div key={`${type}-${index}`} className="qna-item">
        <p className="qna-question"><strong>Câu hỏi {index + 1}:</strong> {item.question_text}</p>
        <p className="qna-answer"><strong>Ứng viên trả lời:</strong> {item.candidate_answer || "Chưa trả lời"}</p>
        {item.ai_feedback_per_answer && (
            <p className="qna-ai-feedback"><strong>Nhận xét AI:</strong> {item.ai_feedback_per_answer}</p>
        )}
    </div>
  );

  return (
    <div className="admin-interview-detail-page">
      <div style={{ marginBottom: '25px' }}>
        <Link to="/admin/interviews" className="admin-button admin-button-secondary">
            <span className="material-icons">arrow_back</span>
            Quay lại Danh sách
        </Link>
      </div>

      <h1>Chi Tiết Buổi Phỏng Vấn</h1>

      {interview.candidate_info && (
           <div className="admin-section-card interview-candidate-info-card">
               <h3>Thông Tin Ứng Viên</h3>
               <div className="info-grid">
                    <p><strong>Họ và tên:</strong> {interview.candidate_info.full_name}</p>
                    <p><strong>Email:</strong> {interview.candidate_info.email}</p>
                    {interview.candidate_info.date_of_birth && <p><strong>Ngày sinh:</strong> {new Date(interview.candidate_info.date_of_birth).toLocaleDateString('vi-VN')}</p>}
                    {interview.candidate_info.gender && <p><strong>Giới tính:</strong> {interview.candidate_info.gender}</p>}
                    {interview.candidate_info.phone_number && <p><strong>Điện thoại:</strong> {interview.candidate_info.phone_number}</p>}
                    <p><strong>Trình độ học vấn:</strong> {interview.candidate_info.education_level || 'Chưa cung cấp'}</p>
                    <p><strong>Chuyên ngành:</strong> {interview.candidate_info.major_specialization || 'Chưa cung cấp'}</p>
                    <p><strong>Trường học:</strong> {interview.candidate_info.school_university || 'Chưa cung cấp'}</p>
                    <p><strong>Kinh nghiệm:</strong> {interview.candidate_info.has_work_experience ? `${interview.candidate_info.years_of_experience || 0} năm (Lĩnh vực: ${interview.candidate_info.experience_field || 'Không rõ'})` : 'Chưa có kinh nghiệm'}</p>
                    <p><strong>Lĩnh vực quan tâm:</strong> {interview.candidate_info.interested_field || 'Chưa cung cấp'}</p>
                    <p><strong>Mục tiêu nghề nghiệp:</strong> {interview.candidate_info.career_goal_short || 'Chưa cung cấp'}</p>
                    <p><strong>Kỹ năng nổi bật:</strong> {interview.candidate_info.key_skills && interview.candidate_info.key_skills.length > 0 ? interview.candidate_info.key_skills.join(', ') : 'Chưa cung cấp'}</p>
                    {interview.candidate_info.cv_link && <p><strong>CV:</strong> <a href={interview.candidate_info.cv_link} target="_blank" rel="noopener noreferrer" className="admin-link">Xem CV</a></p>}
                    {interview.candidate_info.linkedin_profile && <p><strong>LinkedIn:</strong> <a href={interview.candidate_info.linkedin_profile} target="_blank" rel="noopener noreferrer" className="admin-link">Xem LinkedIn</a></p>}
                    {interview.candidate_info.portfolio_github && <p><strong>Portfolio/GitHub:</strong> <a href={interview.candidate_info.portfolio_github} target="_blank" rel="noopener noreferrer" className="admin-link">Xem Portfolio/GitHub</a></p>}
                     <p><strong>Thời gian nộp thông tin:</strong> {new Date(interview.candidate_info.submitted_at).toLocaleString('vi-VN')}</p>
               </div>
           </div>
       )}

      <div className="admin-section-card interview-summary-card">
        <h3>Thông Tin Buổi Phỏng Vấn</h3>
        <div className="info-grid">
            <p><strong>ID:</strong> <span style={{wordBreak: 'break-all'}}>{interview.id}</span></p>
            <p><strong>Bắt đầu:</strong> {new Date(interview.start_time).toLocaleString('vi-VN')}</p>
            {interview.end_time && <p><strong>Kết thúc:</strong> {new Date(interview.end_time).toLocaleString('vi-VN')}</p>}
            <p><strong>Hoàn thành:</strong> {interview.is_completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</p>
            <p><strong>Trạng thái vòng đời:</strong> {getLifecycleStatusName(interview.lifecycle_status)}</p>
            {interview.selected_field && interview.selected_field !== 'none' && (
                <p><strong>Lĩnh vực đã chọn:</strong> {getFieldTypeName(interview.selected_field)}</p>
            )}
            {interview.desired_position_in_field && (
                <p><strong>Vị trí ứng tuyển:</strong> {interview.desired_position_in_field}</p>
            )}
            <p><strong>Bộ câu hỏi chung:</strong> {interview.general_question_set_id_name || 'N/A'}</p>
            {interview.specialized_question_set_id_name && (
                <p><strong>Bộ câu hỏi chuyên môn:</strong> {interview.specialized_question_set_id_name}</p>
            )}
        </div>
      </div>

      {interview.general_answers_and_feedback && interview.general_answers_and_feedback.length > 0 && (
        <div className="admin-section-card interview-qna-section">
          <h3>Phần Câu Hỏi Chung</h3>
          {interview.general_answers_and_feedback.map((item, index) => renderQnAItem(item, index, 'general'))}
        </div>
      )}

      {interview.specialized_answers_and_feedback && interview.specialized_answers_and_feedback.length > 0 && (
        <div className="admin-section-card interview-qna-section">
          <h3>Phần Câu Hỏi Chuyên Môn ({getFieldTypeName(interview.selected_field)})</h3>
          {interview.selected_field !== 'none' && 
           interview.desired_position_in_field && 
           interview.specialized_answers_and_feedback[0]?.question_text.toLowerCase().includes("vị trí cụ thể nào") &&
           (
                <div className="qna-item highlight-desired-position">
                    <p className="qna-question"><strong>Câu hỏi về vị trí ứng tuyển:</strong> {interview.specialized_answers_and_feedback[0].question_text}</p>
                    <p className="qna-answer"><strong>Ứng viên trả lời (Vị trí mong muốn):</strong> {interview.desired_position_in_field}</p>
                </div>
            )}
          {interview.specialized_answers_and_feedback.map((item, index) => {
              if (index === 0 && item.question_text.toLowerCase().includes("vị trí cụ thể nào")) return null; 
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
              <summary>Xem chi tiết phản hồi gốc từ AI (JSON)</summary>
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