// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Vẫn cần cho việc submit ban đầu nếu không tách adminApi
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);
  const [interviewId, setInterviewId] = useState(null);
  const [finalAssessment, setFinalAssessment] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, finalAssessment]);

  const startNewInterview = async () => {
    setIsInitialLoading(true);
    setIsLoading(false);
    setMessages([]);
    setCurrentQuestion(null);
    setIsInterviewFinished(false);
    setInterviewId(null);
    setFinalAssessment(null);
    setUserInput('');

    try {
      const response = await axios.get(`${API_BASE_URL}/start-interview`);
      const { interview_db_id, feedback, next_question } = response.data;
      setInterviewId(interview_db_id);
      if (feedback) {
        setMessages(prev => [...prev, { type: 'feedback', text: feedback }]);
      }
      if (next_question) {
        setCurrentQuestion({
          id: next_question.question_id,
          text: next_question.question_text,
          is_last_question: next_question.is_last_question
        });
        setMessages(prev => [...prev, { type: 'question', text: next_question.question_text }]);
      } else {
        setMessages(prev => [...prev, { type: 'error', text: 'Không thể tải câu hỏi đầu tiên.' }]);
        setIsInterviewFinished(true);
      }
    } catch (error) {
      console.error("Error starting new interview:", error.response?.data || error.message);
      setMessages([{ type: 'error', text: 'Không thể bắt đầu phỏng vấn. Vui lòng thử lại sau.' }]);
      setIsInterviewFinished(true);
    }
    setIsInitialLoading(false);
  };

  useEffect(() => {
    startNewInterview();
  }, []);

  const handleSubmitAnswer = async () => {
    if (!userInput.trim() || !currentQuestion || isLoading || !interviewId) return;
    const userAnswerText = userInput.trim();
    setMessages(prev => [...prev, { type: 'answer', text: userAnswerText }]);
    setUserInput('');
    setIsLoading(true);
    try {
      const payload = {
        interview_db_id: interviewId,
        question_id: currentQuestion.id,
        answer_text: userAnswerText,
      };
      const response = await axios.post(`${API_BASE_URL}/submit-answer`, payload);
      const { feedback, next_question, is_final_assessment_ready, final_assessment } = response.data;
      if (feedback) {
        setMessages(prev => [...prev, { type: 'feedback', text: feedback }]);
      }
      if (is_final_assessment_ready) {
        if (final_assessment) {
            setFinalAssessment(final_assessment);
            setMessages(prev => [...prev, { type: 'info', text: `Buổi phỏng vấn đã kết thúc. Kết quả đánh giá: ${final_assessment.status}.` }]);
        } else {
            setMessages(prev => [...prev, { type: 'error', text: 'Đã có lỗi khi nhận kết quả đánh giá cuối cùng.' }]);
        }
        setIsInterviewFinished(true);
        setCurrentQuestion(null);
      } else if (next_question) {
        setCurrentQuestion({
          id: next_question.question_id,
          text: next_question.question_text,
          is_last_question: next_question.is_last_question
        });
        setMessages(prev => [...prev, { type: 'question', text: next_question.question_text }]);
      } else {
        setMessages(prev => [...prev, { type: 'info', text: 'Đã hoàn thành tất cả câu hỏi.' }]);
        setIsInterviewFinished(true);
        setCurrentQuestion(null);
      }
    } catch (error) {
      console.error("Error submitting answer:", error.response?.data || error.message);
      let errorMsg = 'Lỗi khi gửi câu trả lời.';
      if (error.response?.data?.detail) {
        errorMsg = `${errorMsg} (${error.response.data.detail})`;
      }
      setMessages(prev => [...prev, { type: 'error', text: errorMsg }]);
    }
    setIsLoading(false);
  };

  if (isInitialLoading && messages.length === 0 && !interviewId) {
    return (
      <div className="loading-initial">
        <span>Đang khởi tạo buổi phỏng vấn...</span>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Phỏng Vấn Viên AI</h2>
        {(isInterviewFinished || (!isInitialLoading && !currentQuestion && !interviewId)) && (
          <button onClick={startNewInterview} disabled={isInitialLoading || isLoading}>Phỏng vấn lại</button>
        )}
      </div>
      <div className="messages-area">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <p>
              {msg.type === 'question' && <strong>Hỏi: </strong>}
              {msg.type === 'answer' && <strong>Bạn: </strong>}
              {msg.type === 'feedback' && <strong>AI: </strong>}
              {msg.type === 'info' && <strong>Thông báo: </strong>}
              {msg.type === 'error' && <strong>Lỗi: </strong>}
              {msg.text}
            </p>
          </div>
        ))}
        {isInterviewFinished && finalAssessment && (
          <div className="final-assessment">
            <h3>Kết Quả Đánh Giá Cuối Cùng</h3>
            <p><strong>Trạng thái:</strong> {finalAssessment.status || "Chưa có"}</p>
            {finalAssessment.strengths && finalAssessment.strengths.length > 0 && (
              <div>
                <strong>Điểm mạnh:</strong>
                <ul>{finalAssessment.strengths.map((s, i) => <li key={`s-${i}`}>{s}</li>)}</ul>
              </div>
            )}
            {finalAssessment.weaknesses && finalAssessment.weaknesses.length > 0 && (
              <div>
                <strong>Điểm yếu/Cần cải thiện:</strong>
                <ul>{finalAssessment.weaknesses.map((w, i) => <li key={`w-${i}`}>{w}</li>)}</ul>
              </div>
            )}
            {finalAssessment.status && !finalAssessment.status.toLowerCase().includes("đạt") && finalAssessment.suggestions_if_not_pass && (
              <p><strong>Gợi ý:</strong> {finalAssessment.suggestions_if_not_pass}</p>
            )}
            {finalAssessment.raw_ai_summary_text && (
                <details>
                    <summary>Xem chi tiết phản hồi gốc từ AI</summary>
                    <pre>{finalAssessment.raw_ai_summary_text}</pre>
                </details>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isInterviewFinished && currentQuestion && (
        <div className="input-area">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Nhập câu trả lời của bạn ở đây..."
            rows={1}
            disabled={isLoading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitAnswer();
              }
            }}
          />
          <button 
            onClick={handleSubmitAnswer} 
            disabled={isLoading || !userInput.trim()}
            className={isLoading ? 'button-loading' : ''} // Thêm class khi loading
            aria-label={isLoading ? "Đang gửi" : "Gửi câu trả lời"} // Cho accessibility
          >
            <span className="button-text">Gửi</span> {/* Text này có thể bị ẩn bởi CSS nếu chỉ muốn icon */}
            <span className="button-icon material-icons">send</span>
            <span className="button-spinner"></span> {/* Element cho spinner CSS */}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;