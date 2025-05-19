import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SequentialCandidateInfoCollector.css';

const CANDIDATE_INFO_FIELDS = [
    { key: "full_name", labelKey: "fullNameLabel", type: "text", required: true, placeholderKey: "fullNamePlaceholder" },
    { key: "email", labelKey: "emailLabel", type: "email", required: true, placeholderKey: "emailPlaceholder" },
    { key: "date_of_birth", labelKey: "dobLabel", type: "date", optional: true, placeholderKey: "dobPlaceholder" },
    { key: "gender", labelKey: "genderLabel", type: "select", optionsKey: "genderOptions", optional: true, placeholderKey: "selectGenderOption" },
    { key: "phone_number", labelKey: "phoneNumberLabel", type: "tel", optional: true, placeholderKey: "phoneNumberPlaceholder" },
    { key: "education_level", labelKey: "educationLevelLabel", type: "select", optionsKey: "educationOptions", optional: true, placeholderKey: "selectEducationOption" },
    { key: "major_specialization", labelKey: "majorLabel", type: "text", optional: true, placeholderKey: "majorPlaceholder" },
    { key: "school_university", labelKey: "schoolLabel", type: "text", optional: true, placeholderKey: "schoolPlaceholder" },
    { key: "has_work_experience", labelKey: "hasExperienceLabel", type: "checkbox", optional: true },
    { key: "years_of_experience", labelKey: "yearsExperienceLabel", type: "number", dependsOn: "has_work_experience", optional: true, step: "0.5", min: "0", placeholderKey: "yearsExperiencePlaceholder" },
    { key: "experience_field", labelKey: "fieldExperienceLabel", type: "text", dependsOn: "has_work_experience", optional: true, placeholderKey: "fieldExperiencePlaceholder" },
    { key: "interested_field", labelKey: "interestedFieldLabel", type: "text", optional: true, placeholderKey: "interestedFieldPlaceholder" },
    { key: "career_goal_short", labelKey: "careerGoalLabel", type: "textarea", optional: true, maxLength: 250, rows: 2, placeholderKey: "careerGoalPlaceholder" },
    { key: "key_skills", labelKey: "keySkillsLabel", type: "textarea", optional: true, placeholderKey: "keySkillsPlaceholder", noteKey: "keySkillsNote" },
    { key: "cv_link", labelKey: "cvLinkLabel", type: "url", optional: true, placeholderKey: "cvLinkPlaceholder" },
    { key: "linkedin_profile", labelKey: "linkedinLabel", type: "url", optional: true, placeholderKey: "linkedinPlaceholder" },
    { key: "portfolio_github", labelKey: "portfolioGithubLabel", type: "url", optional: true, placeholderKey: "portfolioGithubPlaceholder" }
];

const getLocalizedOptions = (t, currentLang, optionsKey) => {
    if (optionsKey === "genderOptions") {
        return [
            { value: "", label: t('selectGenderOption', currentLang) },
            { value: "Nam", label: t('genderMaleOption', currentLang) },
            { value: "Nữ", label: t('genderFemaleOption', currentLang) },
            { value: "Khác", label: t('genderOtherOption', currentLang) }
        ];
    }
    if (optionsKey === "educationOptions") {
        return [
            { value: "", label: t('selectEducationOption', currentLang) },
            { value: "Trung học", label: t('eduHighSchool', currentLang) },
            { value: "Cao đẳng", label: t('eduCollege', currentLang) },
            { value: "Đại học", label: t('eduUniversity', currentLang) },
            { value: "Sau đại học", label: t('eduPostGraduate', currentLang) }
        ];
    }
    return [];
};

function SequentialCandidateInfoCollector({ onInfoCollected, t, currentLang, API_BASE_URL }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({});
    const [fieldError, setFieldError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [overallError, setOverallError] = useState('');
    const inputRef = useRef(null);

    const getVisibleFields = () => CANDIDATE_INFO_FIELDS.filter(field => !field.dependsOn || (field.dependsOn && formData[field.dependsOn]));
    
    let visibleFields = getVisibleFields();
    const currentField = visibleFields[currentStep];


    useEffect(() => {
        visibleFields = getVisibleFields(); 
        if(inputRef.current) {
            inputRef.current.focus();
            if (inputRef.current.type === "text" || inputRef.current.type === "textarea" || inputRef.current.type === "email" || inputRef.current.type === "url" || inputRef.current.type === "tel" || inputRef.current.type === "number") {
                 inputRef.current.select(); 
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, formData.has_work_experience]);
    
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (fieldError) setFieldError('');
    };

    const validateCurrentField = () => {
        if (!currentField) return true; // Nếu không còn trường nào thì coi như hợp lệ
        const value = formData[currentField.key];
        
        if (currentField.required && (!value || (typeof value === 'string' && !value.trim()))) {
            setFieldError(t('fieldRequiredError', currentLang, { fieldName: t(currentField.labelKey, currentLang) }));
            return false;
        }
        if (currentField.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setFieldError(t('invalidEmailError', currentLang));
            return false;
        }
        if (currentField.type === 'url' && value && !/^(ftp|http|https):\/\/[^ "]+$/.test(value)) {
             setFieldError(t('invalidUrlError', currentLang));
             return false;
        }
        if (currentField.type === 'date' && value) {
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if(!datePattern.test(value)){
                setFieldError(t('invalidDateError', currentLang) || "Định dạng ngày YYYY-MM-DD không hợp lệ.");
                return false;
            }
            const dateObj = new Date(value);
            if (isNaN(dateObj.getTime())) {
                 setFieldError(t('invalidDateError', currentLang) || "Ngày không hợp lệ.");
                 return false;
            }
        }
        return true;
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        if (!validateCurrentField()) {
            if (inputRef.current) inputRef.current.focus();
            return;
        }
        visibleFields = getVisibleFields(); // Recalculate visible fields
        if (currentStep < visibleFields.length - 1) {
            setCurrentStep(currentStep + 1);
        } else { 
            submitAllData();
        }
    };

    const submitAllData = async () => {
        setIsSubmitting(true);
        setOverallError('');
        const payload = {
            ...formData,
            key_skills: formData.key_skills ? formData.key_skills.split(',').map(skill => skill.trim()).filter(skill => skill) : [],
            years_of_experience: formData.has_work_experience && formData.years_of_experience ? parseFloat(formData.years_of_experience) : null,
            date_of_birth: formData.date_of_birth || null,
        };
        const finalPayload = {};
        for (const key in payload) {
            if (payload[key] !== null && payload[key] !== "" && !(Array.isArray(payload[key]) && payload[key].length === 0) ) {
                finalPayload[key] = payload[key];
            }
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/submit-candidate-info`, finalPayload);
            if (response.data && response.data.interview_id) {
                onInfoCollected(response.data.interview_id);
            } else {
                setOverallError(t('errorReceivingInterviewId', currentLang));
            }
        } catch (err) {
            let errMsg = t('errorSubmittingCandidateInfo', currentLang);
            if (axios.isAxiosError(err) && err.response) {
                errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
            } else {
                errMsg += err.message || t('unknownError', currentLang);
            }
            setOverallError(errMsg);
            console.error("Error submitting candidate info:", err);
        }
        setIsSubmitting(false);
    };
    
    if (!currentField && !isSubmitting) {
        return null; 
    }
    
    const buttonText = (currentStep === visibleFields.length - 1) ? 
                       (t('submitInfoAndStartShort', currentLang)) : 
                       (t('nextStepButton', currentLang));

    return (
        <div className="sequential-info-collector">
            <h2 className="collector-title">{t('candidateInformationTitle', currentLang)}</h2>
            {overallError && <p className="collector-error-message overall-error">{overallError}</p>}
            {currentField && (
                <form onSubmit={handleNextStep} className="collector-form">
                    <div className="collector-progress">
                        {t('stepProgress', currentLang, { current: currentStep + 1, total: visibleFields.length } )}
                    </div>
                    <div className="admin-form-group collector-field">
                        <label htmlFor={currentField.key}>
                            {t(currentField.labelKey, currentLang)}
                            {currentField.required && <span className="required-asterisk">*</span>}
                        </label>
                        
                        {currentField.type === 'text' && <input type="text" id={currentField.key} name={currentField.key} value={formData[currentField.key] || ''} onChange={handleInputChange} placeholder={t(currentField.placeholderKey, currentLang)} required={currentField.required} ref={inputRef} />}
                        {currentField.type === 'email' && <input type="email" id={currentField.key} name={currentField.key} value={formData[currentField.key] || ''} onChange={handleInputChange} placeholder={t(currentField.placeholderKey, currentLang)} required={currentField.required} ref={inputRef} />}
                        {currentField.type === 'tel' && <input type="tel" id={currentField.key} name={currentField.key} value={formData[currentField.key] || ''} onChange={handleInputChange} placeholder={t(currentField.placeholderKey, currentLang)} ref={inputRef} />}
                        {currentField.type === 'date' && <input type="date" id={currentField.key} name={currentField.key} value={formData[currentField.key] || ''} onChange={handleInputChange} ref={inputRef} />}
                        {currentField.type === 'number' && <input type="number" id={currentField.key} name={currentField.key} value={formData[currentField.key] || ''} onChange={handleInputChange} step={currentField.step || '1'} min={currentField.min} placeholder={t(currentField.placeholderKey, currentLang)} ref={inputRef} />}
                        {currentField.type === 'url' && <input type="url" id={currentField.key} name={currentField.key} value={formData[currentField.key] || ''} onChange={handleInputChange} placeholder={t(currentField.placeholderKey, currentLang)} ref={inputRef} />}
                        {currentField.type === 'textarea' && <textarea id={currentField.key} name={currentField.key} value={formData[currentField.key] || ''} onChange={handleInputChange} rows={currentField.rows || 3} maxLength={currentField.maxLength} placeholder={t(currentField.placeholderKey, currentLang)} ref={inputRef} />}
                        
                        {currentField.type === 'select' && (
                            <select id={currentField.key} name={currentField.key} value={formData[currentField.key] || ''} onChange={handleInputChange} required={currentField.required} ref={inputRef}>
                                {getLocalizedOptions(t, currentLang, currentField.optionsKey).map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        )}
                        {currentField.type === 'checkbox' && (
                            <div className="admin-form-checkbox-group collector-checkbox-group">
                                 <input type="checkbox" id={currentField.key} name={currentField.key} checked={!!formData[currentField.key]} onChange={handleInputChange} ref={inputRef} />
                                 <label htmlFor={currentField.key} className="collector-checkbox-label">{t(currentField.labelKey, currentLang)}</label>
                            </div>
                        )}
                        {currentField.noteKey && <small className="field-note">{t(currentField.noteKey, currentLang)}</small>}
                        {fieldError && <p className="collector-error-message field-error">{fieldError}</p>}
                    </div>
                    <button type="submit" disabled={isSubmitting} className="admin-button collector-button">
                        {isSubmitting ? (t('submittingInProgress', currentLang) || "Đang xử lý...") : buttonText}
                    </button>
                </form>
            )}
        </div>
    );
}

export default SequentialCandidateInfoCollector;