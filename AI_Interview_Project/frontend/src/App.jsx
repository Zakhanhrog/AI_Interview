// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const defaultLang = 'vi'; // 'vi' or 'en'
const translations = {
  vi: {
    chatTitle: "Phỏng Vấn Viên AI",
    startNewInterviewButton: "Phỏng vấn lại",
    initializingInterview: "Đang khởi tạo buổi phỏng vấn...",
    cannotLoadFirstQuestion: "Không thể tải câu hỏi đầu tiên.",
    cannotStartInterview: "Không thể bắt đầu phỏng vấn. Vui lòng thử lại sau.",
    submitAnswerError: "Lỗi khi gửi câu trả lời.",
    submitAnswerErrorDetail: (detail) => `Lỗi khi gửi câu trả lời. (${detail})`,
    interviewEndedAssessment: (status) => `Buổi phỏng vấn đã kết thúc. Kết quả đánh giá: ${status}.`,
    errorReceivingFinalAssessment: "Đã có lỗi khi nhận kết quả đánh giá cuối cùng.",
    allQuestionsCompleted: "Đã hoàn thành tất cả câu hỏi.",
    waitingForFinalAssessment: "Đang chờ đánh giá cuối cùng...",
    inputPlaceholder: "Nhập câu trả lời của bạn ở đây...",
    sendButtonLabel: "Gửi câu trả lời",
    sendingButtonLabel: "Đang gửi",
    questionPrefix: "Hỏi: ",
    answerPrefix: "Bạn: ",
    aiFeedbackPrefix: "AI: ",
    infoPrefix: "Thông báo: ",
    errorPrefix: "Lỗi: ",
    finalAssessmentTitle: "Kết Quả Đánh Giá Cuối Cùng",
    statusLabel: "Trạng thái:",
    statusNotAvailable: "Chưa có",
    strengthsLabel: "Điểm mạnh:",
    weaknessesLabel: "Điểm yếu/Cần cải thiện:",
    suggestionsLabel: "Gợi ý:",
    rawAiSummaryDetails: "Xem chi tiết phản hồi gốc từ AI",
    chooseYourFieldPrompt: "Vui lòng chọn lĩnh vực bạn muốn phỏng vấn chuyên sâu:",
    developerField: "Developer",
    designerField: "Designer",
    errorLoadingSpecializedQuestion: "Lỗi tải câu hỏi chuyên môn. Vui lòng thử lại.",
    errorSelectingField: "Lỗi khi chọn lĩnh vực.",
    suitabilityForFieldLabel: "Mức độ phù hợp lĩnh vực:",
    suggestedPositionsLabel: "Vị trí gợi ý:"
  },
  en: {
    chatTitle: "AI Interviewer",
    startNewInterviewButton: "New Interview",
    initializingInterview: "Initializing interview session...",
    cannotLoadFirstQuestion: "Could not load the first question.",
    cannotStartInterview: "Could not start the interview. Please try again later.",
    submitAnswerError: "Error submitting answer.",
    submitAnswerErrorDetail: (detail) => `Error submitting answer. (${detail})`,
    interviewEndedAssessment: (status) => `The interview has ended. Assessment status: ${status}.`,
    errorReceivingFinalAssessment: "There was an error receiving the final assessment.",
    allQuestionsCompleted: "All questions have been completed.",
    waitingForFinalAssessment: "Waiting for final assessment...",
    inputPlaceholder: "Type your answer here...",
    sendButtonLabel: "Send Answer",
    sendingButtonLabel: "Sending...",
    questionPrefix: "Question: ",
    answerPrefix: "You: ",
    aiFeedbackPrefix: "AI: ",
    infoPrefix: "Notice: ",
    errorPrefix: "Error: ",
    finalAssessmentTitle: "Final Assessment Result",
    statusLabel: "Status:",
    statusNotAvailable: "Not yet available",
    strengthsLabel: "Strengths:",
    weaknessesLabel: "Weaknesses/Areas for Improvement:",
    suggestionsLabel: "Suggestions:",
    rawAiSummaryDetails: "View original AI response details",
    chooseYourFieldPrompt: "Please choose the field for specialized questions:",
    developerField: "Developer",
    designerField: "Designer",
    errorLoadingSpecializedQuestion: "Error loading specialized question. Please try again.",
    errorSelectingField: "Error selecting field.",
    suitabilityForFieldLabel: "Suitability for Field:",
    suggestedPositionsLabel: "Suggested Positions:"
  }
};

const t = (key, lang = defaultLang, params = null) => {
  const textSource = translations[lang] || translations['en'];
  const text = textSource?.[key] || key;
  if (typeof text === 'function' && params !== null) {
    if (Array.isArray(params)) return text(...params);
    return text(params);
  }
  return text;
};


function App() {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);
  const [interviewId, setInterviewId] = useState(null);
  const [finalAssessment, setFinalAssessment] = useState(null);
  const [currentLang, setCurrentLang] = useState(defaultLang);
  const [interviewPhase, setInterviewPhase] = useState('general');
  const [fieldsToChoose, setFieldsToChoose] = useState([]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = parseInt(getComputedStyle(textareaRef.current).maxHeight, 10) || Infinity;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(scrollToBottom, [messages, finalAssessment, interviewPhase]);
  useEffect(adjustTextareaHeight, [userInput]);

  const addMessageWithAnimation = (newMessageContent) => {
    const messageWithAppearance = { ...newMessageContent, id: Date.now() + Math.random(), appeared: false };
    setMessages(prev => [...prev, messageWithAppearance]);
    setTimeout(() => {
      setMessages(prevMsgs => prevMsgs.map(m => m.id === messageWithAppearance.id ? { ...m, appeared: true } : m));
    }, 50);
  };

  const processApiResponse = (data) => {
    const { 
        feedback, 
        next_question, 
        is_final_assessment_ready, 
        final_assessment: apiFinalAssessment,
        interview_phase: newPhase,
        available_fields_to_choose
    } = data;

    setInterviewPhase(newPhase || interviewPhase); // Fallback to current if undefined

    if (feedback) {
        addMessageWithAnimation({ type: 'feedback', text: feedback });
    }

    if (newPhase === "specialization_choice" && available_fields_to_choose) {
        setFieldsToChoose(available_fields_to_choose);
        setCurrentQuestion(null);
    } else if (is_final_assessment_ready) {
        if (apiFinalAssessment) {
            setFinalAssessment(apiFinalAssessment);
            addMessageWithAnimation({ type: 'info', text: t('interviewEndedAssessment', currentLang, apiFinalAssessment.status) });
        } else {
            addMessageWithAnimation({ type: 'error', text: t('errorReceivingFinalAssessment', currentLang) });
        }
        setIsInterviewFinished(true);
        setCurrentQuestion(null);
    } else if (next_question) {
        setCurrentQuestion({
            id: next_question.question_id,
            text: next_question.question_text,
            is_last_question: next_question.is_last_question
        });
        addMessageWithAnimation({ type: 'question', text: next_question.question_text });
        setFieldsToChoose([]); // Clear choices if moving to a question
    } else if (newPhase === "completed" && !is_final_assessment_ready) {
        addMessageWithAnimation({ type: 'info', text: `${t('allQuestionsCompleted', currentLang)} ${t('waitingForFinalAssessment', currentLang)}` });
        setIsInterviewFinished(true);
        setCurrentQuestion(null);
    } else if (!next_question && newPhase !== "specialization_choice" && newPhase !== "completed") {
         // It means the current phase is done but no clear next step from API (e.g. error, or general phase ended without triggering choice)
        addMessageWithAnimation({ type: 'info', text: t('allQuestionsCompleted', currentLang) });
        setIsInterviewFinished(true); // Tentatively finish
        setCurrentQuestion(null);
    }
  };

  const startNewInterview = async () => {
    setIsInitialLoading(true);
    setIsLoading(false);
    setMessages([]);
    setCurrentQuestion(null);
    setIsInterviewFinished(false);
    setInterviewId(null);
    setFinalAssessment(null);
    setUserInput('');
    setInterviewPhase('general');
    setFieldsToChoose([]);

    try {
      const response = await axios.get(`${API_BASE_URL}/start-interview`);
      setInterviewId(response.data.interview_db_id);
      processApiResponse(response.data);
    } catch (error) {
      console.error("Error starting new interview:", error.response?.data || error.message);
      addMessageWithAnimation({ type: 'error', text: t('cannotStartInterview', currentLang) });
      setIsInterviewFinished(true);
    }
    setIsInitialLoading(false);
  };

  useEffect(() => {
    startNewInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitAnswer = async () => {
    if (!userInput.trim() || !currentQuestion || isLoading || !interviewId) return;
    const userAnswerText = userInput.trim();
    addMessageWithAnimation({ type: 'answer', text: userAnswerText });
    setUserInput('');
    if(textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsLoading(true);
    try {
      const payload = {
        interview_db_id: interviewId,
        question_id: currentQuestion.id,
        answer_text: userAnswerText,
      };
      const response = await axios.post(`${API_BASE_URL}/submit-answer`, payload);
      processApiResponse(response.data);
    } catch (error) {
      console.error("Error submitting answer:", error.response?.data || error.message);
      let errorMsg = t('submitAnswerError', currentLang);
      if (error.response?.data?.detail) {
        errorMsg = t('submitAnswerErrorDetail', currentLang, error.response.data.detail);
      }
      addMessageWithAnimation({ type: 'error', text: errorMsg });
      // Potentially set phase to an error state or allow retry?
    }
    setIsLoading(false);
  };

  const handleSelectField = async (field) => {
    if (!interviewId || isLoading) return;
    setIsLoading(true);
    // Visual feedback for user's choice
    const fieldText = field === 'developer' ? t('developerField', currentLang) : t('designerField', currentLang);
    addMessageWithAnimation({ type: 'answer', text: `${t('iChooseField', currentLang, fieldText)}.` });
    // Add 'iChooseField': (fieldName) => `Tôi chọn lĩnh vực: ${fieldName}` to translations

    try {
        const payload = {
            interview_db_id: interviewId,
            field: field,
        };
        const response = await axios.post(`${API_BASE_URL}/select-field`, payload);
        processApiResponse(response.data);
    } catch (error) {
        console.error("Error selecting field:", error.response?.data || error.message);
        let errorMsg = t('errorSelectingField', currentLang);
        if (error.response?.data?.detail) {
            errorMsg = `${errorMsg} (${error.response.data.detail})`;
        }
        addMessageWithAnimation({ type: 'error', text: errorMsg });
    }
    setIsLoading(false);
  };


  if (isInitialLoading && messages.length === 0 && !interviewId) {
    return (
      <div className="loading-initial">
        <span>{t('initializingInterview', currentLang)}</span>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>{t('chatTitle', currentLang)}</h2>
        {/* <select onChange={(e) => setCurrentLang(e.target.value)} value={currentLang} style={{marginLeft: 'auto', marginRight: '10px'}}>
          <option value="vi">VIE</option>
          <option value="en">ENG</option>
        </select> */}
        {(isInterviewFinished || (interviewPhase === 'completed')) && (
          <button onClick={startNewInterview} disabled={isInitialLoading || isLoading}>
            {t('startNewInterviewButton', currentLang)}
          </button>
        )}
      </div>

      <div className="messages-area" aria-live="polite" aria-atomic="false">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.type} ${msg.appeared ? 'message-appeared' : ''}`}>
            <p>
              {msg.type === 'question' && <strong>{t('questionPrefix', currentLang)}</strong>}
              {msg.type === 'answer' && <strong>{t('answerPrefix', currentLang)}</strong>}
              {msg.type === 'feedback' && <strong>{t('aiFeedbackPrefix', currentLang)}</strong>}
              {msg.type === 'info' && <strong>{t('infoPrefix', currentLang)}</strong>}
              {msg.type === 'error' && <strong>{t('errorPrefix', currentLang)}</strong>}
              {msg.text}
            </p>
          </div>
        ))}
        {isInterviewFinished && finalAssessment && (
          <div className="final-assessment">
            <h3>{t('finalAssessmentTitle', currentLang)}</h3>
            <p><strong>{t('statusLabel', currentLang)}</strong> {finalAssessment.status || t('statusNotAvailable', currentLang)}</p>
            {finalAssessment.suitability_for_field && <p><strong>{t('suitabilityForFieldLabel', currentLang)}</strong> {finalAssessment.suitability_for_field}</p>}
            {finalAssessment.suggested_positions && finalAssessment.suggested_positions.length > 0 && (
              <div>
                <strong>{t('suggestedPositionsLabel', currentLang)}</strong>
                <ul>{finalAssessment.suggested_positions.map((pos, i) => <li key={`pos-${i}`}>{pos}</li>)}</ul>
              </div>
            )}
            {finalAssessment.strengths && finalAssessment.strengths.length > 0 && (
              <div>
                <strong>{t('strengthsLabel', currentLang)}</strong>
                <ul>{finalAssessment.strengths.map((s, i) => <li key={`s-${i}`}>{s}</li>)}</ul>
              </div>
            )}
            {finalAssessment.weaknesses && finalAssessment.weaknesses.length > 0 && (
              <div>
                <strong>{t('weaknessesLabel', currentLang)}</strong>
                <ul>{finalAssessment.weaknesses.map((w, i) => <li key={`w-${i}`}>{w}</li>)}</ul>
              </div>
            )}
            {finalAssessment.status && !finalAssessment.status.toLowerCase().includes("đạt") && finalAssessment.suggestions_if_not_pass && (
              <p><strong>{t('suggestionsLabel', currentLang)}</strong> {finalAssessment.suggestions_if_not_pass}</p>
            )}
            {finalAssessment.raw_ai_summary_text && (
                <details>
                    <summary>{t('rawAiSummaryDetails', currentLang)}</summary>
                    <pre>{finalAssessment.raw_ai_summary_text}</pre>
                </details>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {interviewPhase === 'specialization_choice' && !isInterviewFinished && fieldsToChoose.length > 0 && (
          <div className="specialization-choice-area input-area">
            <p style={{textAlign: 'center', margin: '5px 0 10px', color: 'var(--text-primary-color)', width: '100%'}}>{t('chooseYourFieldPrompt', currentLang)}</p> 
            {fieldsToChoose.map(field => (
                <button 
                    key={field} 
                    onClick={() => handleSelectField(field)}
                    disabled={isLoading}
                    className="field-choice-button"
                >
                    {field === 'developer' ? t('developerField', currentLang) : t('designerField', currentLang)} 
                </button>
            ))}
          </div>
      )}

      {(interviewPhase === 'general' || interviewPhase === 'specialized_questions') && !isInterviewFinished && currentQuestion && (
        <div className="input-area">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={t('inputPlaceholder', currentLang)}
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
            className={isLoading ? 'button-loading' : ''}
            aria-label={isLoading ? t('sendingButtonLabel', currentLang) : t('sendButtonLabel', currentLang)}
          >
            <span className="button-text">{t('sendButtonLabel', currentLang)}</span>
            <span className="button-icon material-icons">send</span>
            <span className="button-spinner"></span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;