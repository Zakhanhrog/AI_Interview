import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import SequentialCandidateInfoCollector from './components/SequentialCandidateInfoCollector';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const defaultLang = 'vi';
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
    suggestedPositionsLabel: "Vị trí gợi ý:",
    iChooseField: (fieldName) => `Tôi chọn lĩnh vực: ${fieldName}.`,
    candidateInformationTitle: "Thông Tin Ứng Viên",
    personalInfoLegend: "1. Thông tin cá nhân",
    fullNameLabel: "Họ và tên:",
    emailLabel: "Email:",
    dobLabel: "Ngày sinh (YYYY-MM-DD):",
    genderLabel: "Giới tính:",
    selectGenderOption: "Chọn giới tính",
    genderMaleOption: "Nam",
    genderFemaleOption: "Nữ",
    genderOtherOption: "Khác",
    phoneNumberLabel: "Số điện thoại:",
    educationLegend: "2. Học vấn & Chuyên môn",
    educationLevelLabel: "Trình độ học vấn cao nhất:",
    selectEducationOption: "Chọn trình độ",
    eduHighSchool: "Trung học",
    eduCollege: "Cao đẳng",
    eduUniversity: "Đại học",
    eduPostGraduate: "Sau đại học",
    majorLabel: "Ngành học / Chuyên ngành:",
    schoolLabel: "Trường đã/đang học:",
    experienceLegend: "3. Kinh nghiệm & Định hướng",
    hasExperienceLabel: "Đã có kinh nghiệm làm việc",
    yearsExperienceLabel: "Số năm kinh nghiệm:",
    fieldExperienceLabel: "Lĩnh vực kinh nghiệm:",
    interestedFieldLabel: "Lĩnh vực quan tâm/mong muốn phát triển:",
    careerGoalLabel: "Mục tiêu nghề nghiệp (ngắn gọn):",
    skillsLegend: "4. Kỹ năng & Ngôn ngữ",
    keySkillsLabel: "Kỹ năng nổi bật (cách nhau bằng dấu phẩy):",
    keySkillsPlaceholder: "Ví dụ: JavaScript, React, Python, Teamwork",
    keySkillsNote: "Nhập các kỹ năng chính của bạn, phân cách bằng dấu phẩy.",
    additionalInfoLegend: "5. Thông tin khác (Tùy chọn)",
    cvLinkLabel: "Link CV (URL):",
    linkedinLabel: "LinkedIn Profile (URL):",
    portfolioGithubLabel: "Portfolio / GitHub (URL):",
    submitInfoAndStart: "Gửi Thông Tin & Bắt Đầu Phỏng Vấn",
    submitInfoAndStartShort: "Hoàn tất & Bắt đầu",
    nextStepButton: "Tiếp tục",
    submittingAllData: "Đang gửi thông tin...",
    fieldRequiredError: ({ fieldName }) => `Trường "${fieldName}" là bắt buộc.`,
    invalidEmailError: "Địa chỉ email không hợp lệ.",
    invalidUrlError: "URL không hợp lệ.",
    invalidDateError: "Ngày không hợp lệ. Vui lòng nhập theo định dạng YYYY-MM-DD.",
    stepProgress: ({ current, total }) => `Bước ${current} / ${total}`,
    errorReceivingInterviewId: "Không nhận được ID phỏng vấn từ server.",
    errorSubmittingCandidateInfo: "Lỗi khi gửi thông tin ứng viên ban đầu. ",
    unknownError: "Đã có lỗi không xác định xảy ra.",
    waitingForCandidateInfo: "Đang tải biểu mẫu thông tin ứng viên...",
    fullNamePlaceholder: "Nhập họ tên đầy đủ của bạn",
    emailPlaceholder: "Nhập địa chỉ email",
    dobPlaceholder: "YYYY-MM-DD",
    phoneNumberPlaceholder: "Nhập số điện thoại",
    majorPlaceholder: "Ví dụ: Kỹ thuật phần mềm",
    schoolPlaceholder: "Ví dụ: Đại học Bách Khoa",
    yearsExperiencePlaceholder: "Ví dụ: 2.5",
    fieldExperienceLabelPlaceholder: "Ví dụ: Phát triển Web",
    interestedFieldPlaceholder: "Ví dụ: AI, Machine Learning",
    careerGoalPlaceholder: "Mô tả ngắn gọn mục tiêu của bạn",
    cvLinkPlaceholder: "https://example.com/cv.pdf",
    linkedinPlaceholder: "https://linkedin.com/in/yourprofile",
    portfolioGithubPlaceholder: "https://github.com/yourusername"
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
    suggestedPositionsLabel: "Suggested Positions:",
    iChooseField: (fieldName) => `I choose the field: ${fieldName}.`,
    candidateInformationTitle: "Candidate Information",
    personalInfoLegend: "1. Personal Information",
    fullNameLabel: "Full Name:",
    emailLabel: "Email:",
    dobLabel: "Date of Birth (YYYY-MM-DD):",
    genderLabel: "Gender:",
    selectGenderOption: "Select Gender",
    genderMaleOption: "Male",
    genderFemaleOption: "Female",
    genderOtherOption: "Other",
    phoneNumberLabel: "Phone Number:",
    educationLegend: "2. Education & Specialization",
    educationLevelLabel: "Highest Education Level:",
    selectEducationOption: "Select Level",
    eduHighSchool: "High School",
    eduCollege: "College",
    eduUniversity: "University",
    eduPostGraduate: "Post Graduate",
    majorLabel: "Major / Specialization:",
    schoolLabel: "School / University:",
    experienceLegend: "3. Experience & Orientation",
    hasExperienceLabel: "Have work experience",
    yearsExperienceLabel: "Years of Experience:",
    fieldExperienceLabel: "Field of Experience:",
    interestedFieldLabel: "Interested Field / Desired Development:",
    careerGoalLabel: "Career Goal (short):",
    skillsLegend: "4. Skills & Languages",
    keySkillsLabel: "Key Skills (comma-separated):",
    keySkillsPlaceholder: "E.g., JavaScript, React, Python, Teamwork",
    keySkillsNote: "Enter your main skills, separated by commas.",
    additionalInfoLegend: "5. Additional Information (Optional)",
    cvLinkLabel: "CV Link (URL):",
    linkedinLabel: "LinkedIn Profile (URL):",
    portfolioGithubLabel: "Portfolio / GitHub (URL):",
    submitInfoAndStart: "Submit Information & Start Interview",
    submitInfoAndStartShort: "Complete & Start",
    nextStepButton: "Continue",
    submittingAllData: "Submitting...",
    fieldRequiredError: ({ fieldName }) => `Field "${fieldName}" is required.`,
    invalidEmailError: "Invalid email address.",
    invalidUrlError: "Invalid URL.",
    invalidDateError: "Invalid date. Please use YYYY-MM-DD format.",
    stepProgress: ({ current, total }) => `Step ${current} / ${total}`,
    errorReceivingInterviewId: "Could not retrieve interview ID from server.",
    errorSubmittingCandidateInfo: "Error submitting candidate information. ",
    unknownError: "An unknown error occurred.",
    waitingForCandidateInfo: "Loading candidate information form..."
  }
};

const t = (key, lang = defaultLang, params = null) => {
  const textSource = translations[lang] || translations['en'];
  const textForKey = textSource?.[key] || key;
  if (typeof textForKey === 'function' && params !== null) {
    if (Array.isArray(params)) return textForKey(...params);
    return textForKey(params);
  }
  return textForKey;
};

function App() {
  const [showCandidateInfoCollector, setShowCandidateInfoCollector] = useState(true);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); 
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);
  const [interviewId, setInterviewId] = useState(null);
  const [finalAssessment, setFinalAssessment] = useState(null);
  const [currentLang, setCurrentLang] = useState(defaultLang);
  const [interviewLifecycleStatus, setInterviewLifecycleStatus] = useState('pending_start');
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
      const maxHeightStyle = getComputedStyle(textareaRef.current).maxHeight;
      const maxHeight = maxHeightStyle && maxHeightStyle !== 'none' ? parseInt(maxHeightStyle, 10) : Infinity;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(scrollToBottom, [messages, finalAssessment, interviewLifecycleStatus]);
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
        interview_lifecycle_status: newStatus,
        available_fields_to_choose
    } = data;

    setInterviewLifecycleStatus(newStatus || interviewLifecycleStatus);

    if (feedback) {
        addMessageWithAnimation({ type: 'feedback', text: feedback });
    }

    if (next_question) {
        setCurrentQuestion({
            id: next_question.question_id,
            text: next_question.question_text,
            is_last_question: next_question.is_last_question
        });
        addMessageWithAnimation({ type: 'question', text: next_question.question_text });
        setFieldsToChoose([]);
    } else if (newStatus === "awaiting_specialization" && available_fields_to_choose) {
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
    } else if (newStatus === "completed" && !is_final_assessment_ready) {
        addMessageWithAnimation({ type: 'info', text: `${t('allQuestionsCompleted', currentLang)} ${t('waitingForFinalAssessment', currentLang)}` });
        setIsInterviewFinished(true);
        setCurrentQuestion(null);
    } else if (!next_question && newStatus !== "awaiting_specialization" && newStatus !== "completed" && newStatus !== "info_submitted" && newStatus !== "pending_start") {
        addMessageWithAnimation({ type: 'info', text: t('allQuestionsCompleted', currentLang) });
        setIsInterviewFinished(true);
        setCurrentQuestion(null);
    }
  };
  
  const startActualInterview = async (currentInterviewId) => {
    setIsInitialLoading(true);
    setMessages([]);
    setCurrentQuestion(null);
    setIsInterviewFinished(false);
    setFinalAssessment(null);
    setUserInput('');
    setFieldsToChoose([]);
    try {
      const response = await axios.post(`${API_BASE_URL}/interviews/${currentInterviewId}/start-general`);
      processApiResponse(response.data); 
    } catch (error) {
      console.error("Error starting actual interview:", error.response?.data || error.message);
      let errorMessage = t('cannotStartInterview', currentLang);
        if (error.response?.data?.detail) {
            errorMessage = `${errorMessage} (${error.response.data.detail})`;
        }
      addMessageWithAnimation({ type: 'error', text: errorMessage });
      setIsInterviewFinished(true); 
    }
    setIsInitialLoading(false);
  };

  const handleCandidateInfoSuccess = (receivedInterviewId) => {
      setInterviewId(receivedInterviewId);
      setShowCandidateInfoCollector(false);
      setInterviewLifecycleStatus('info_submitted');
      startActualInterview(receivedInterviewId); 
  };

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
    }
    setIsLoading(false);
  };

  const handleSelectField = async (field) => {
    if (!interviewId || isLoading) return;
    setIsLoading(true);
    const fieldText = field === 'developer' ? t('developerField', currentLang) : t('designerField', currentLang);
    addMessageWithAnimation({ type: 'answer', text: t('iChooseField', currentLang, fieldText) });

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
  
  const handleRestartInterview = () => {
    setShowCandidateInfoCollector(true);
    setMessages([]);
    setCurrentQuestion(null);
    setIsInterviewFinished(false);
    setInterviewId(null);
    setFinalAssessment(null);
    setUserInput('');
    setInterviewLifecycleStatus('pending_start');
    setFieldsToChoose([]);
    setIsInitialLoading(false); 
  };

  if (showCandidateInfoCollector) {
    return (
        <div className="candidate-info-form-page-wrapper"> 
            <SequentialCandidateInfoCollector 
                onInfoCollected={handleCandidateInfoSuccess} 
                t={t} 
                currentLang={currentLang} 
                API_BASE_URL={API_BASE_URL} 
            />
        </div>
    );
  }
  
  if (isInitialLoading && messages.length === 0 && !showCandidateInfoCollector) {
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
        {(isInterviewFinished || (interviewLifecycleStatus === 'completed')) && (
          <button onClick={handleRestartInterview} disabled={isLoading && isInitialLoading}>
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
      
      {interviewLifecycleStatus === 'awaiting_specialization' && !isInterviewFinished && fieldsToChoose.length > 0 && (
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

      {(interviewLifecycleStatus === 'general_in_progress' || interviewLifecycleStatus === 'specialized_in_progress') && !isInterviewFinished && currentQuestion && (
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