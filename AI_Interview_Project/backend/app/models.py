from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from uuid import UUID, uuid4
from datetime import datetime, timezone # Bỏ import date nếu không dùng ở đâu khác
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v, field): # field có thể không cần nếu là Pydantic V2 và không dùng
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string", "format": "objectid"}

class Question(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    text: str
    order: int

SpecializedField = Literal["developer", "designer", "none"]

class QuestionSetBase(BaseModel):
    name: str
    questions: List[Question] = []
    field_type: SpecializedField = Field(default="none", description="Loại bộ câu hỏi: none (chung), developer, designer")
    is_default_general: bool = Field(default=False, description="Đây có phải bộ câu hỏi chung mặc định không?")

class QuestionSetCreate(QuestionSetBase):
    id_name: Optional[str] = None

class QuestionSetUpdate(BaseModel):
    name: Optional[str] = None
    questions: Optional[List[Question]] = None
    field_type: Optional[SpecializedField] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionSetInDB(QuestionSetBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    id_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class QuestionSetPublic(BaseModel):
    id_name: str
    name: str
    questions: List[Question]
    field_type: SpecializedField
    is_default_general: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class AnswerWithFeedback(BaseModel):
    question_id: UUID
    question_text: str
    candidate_answer: str
    ai_feedback_per_answer: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OverallAssessment(BaseModel):
    strengths: List[str] = []
    weaknesses: List[str] = []
    status: str
    suggestions_if_not_pass: Optional[str] = None
    suitability_for_field: Optional[str] = None
    suggested_positions: Optional[List[str]] = None
    raw_ai_summary_text: Optional[str] = None

InterviewLifecycleStatus = Literal[
    "general_in_progress",
    "awaiting_specialization",
    "specialized_in_progress",
    "completed",
    "abandoned"
]

class InterviewBase(BaseModel):
    lifecycle_status: InterviewLifecycleStatus = Field(default="general_in_progress")
    selected_field: SpecializedField = Field(default="none")
    desired_position_in_field: Optional[str] = None
    general_question_set_id_name: Optional[str] = None
    general_questions_snapshot: List[Question] = []
    general_answers_and_feedback: List[AnswerWithFeedback] = []
    specialized_question_set_id_name: Optional[str] = None
    specialized_questions_snapshot: Optional[List[Question]] = None
    specialized_answers_and_feedback: List[AnswerWithFeedback] = []
    overall_assessment: Optional[OverallAssessment] = None
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    is_completed: bool = False

class InterviewInDB(InterviewBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class InterviewPublic(BaseModel):
    id: str
    lifecycle_status: InterviewLifecycleStatus
    selected_field: SpecializedField
    desired_position_in_field: Optional[str]
    general_question_set_id_name: Optional[str]
    specialized_question_set_id_name: Optional[str]
    overall_assessment: Optional[OverallAssessment]
    start_time: datetime
    updated_at: datetime
    end_time: Optional[datetime]
    is_completed: bool
    general_answers_and_feedback: Optional[List[AnswerWithFeedback]] = None
    specialized_answers_and_feedback: Optional[List[AnswerWithFeedback]] = None

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class SelectFieldPayload(BaseModel):
    interview_db_id: str
    field: SpecializedField

class InterviewQuestionResponse(BaseModel):
    question_id: UUID
    question_text: str
    is_last_question: bool

class AnswerPayload(BaseModel):
    interview_db_id: Optional[str] = None
    question_id: UUID
    answer_text: str

class AIFeedbackResponse(BaseModel):
    interview_db_id: str
    feedback: Optional[str] = None
    next_question: Optional[InterviewQuestionResponse] = None
    interview_lifecycle_status: InterviewLifecycleStatus
    available_fields_to_choose: Optional[List[SpecializedField]] = None
    is_final_assessment_ready: bool = False
    final_assessment: Optional[OverallAssessment] = None

class Token(BaseModel):
    access_token: str
    token_type: str
