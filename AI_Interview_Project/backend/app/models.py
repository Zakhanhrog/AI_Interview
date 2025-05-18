# backend/app/models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from uuid import UUID, uuid4
from datetime import datetime, timezone
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v, field):
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

SpecializedField = Literal["developer", "designer", "none"] # "none" cho giai đoạn đầu hoặc nếu không chọn

class QuestionSetBase(BaseModel):
    name: str
    questions: List[Question] = []
    # Thêm trường để phân loại bộ câu hỏi
    field_type: SpecializedField = Field(default="none", description="Loại bộ câu hỏi: none (chung), developer, designer")
    is_default_general: bool = Field(default=False, description="Đây có phải bộ câu hỏi chung mặc định không?")


class QuestionSetCreate(QuestionSetBase):
    id_name: Optional[str] = None

class QuestionSetUpdate(BaseModel):
    name: Optional[str] = None
    questions: Optional[List[Question]] = None
    field_type: Optional[SpecializedField] = None # Cho phép cập nhật field_type
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionSetInDB(QuestionSetBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    id_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # field_type và is_default_general đã có từ QuestionSetBase

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class QuestionSetPublic(BaseModel): # Giữ lại các trường cần thiết cho public
    id_name: str
    name: str
    questions: List[Question]
    field_type: SpecializedField
    is_default_general: bool # Thêm is_default_general nếu admin cần xem
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
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Sử dụng timezone-aware

class OverallAssessment(BaseModel):
    strengths: List[str] = []
    weaknesses: List[str] = []
    status: str
    suggestions_if_not_pass: Optional[str] = None
    suitability_for_field: Optional[str] = None
    suggested_positions: Optional[List[str]] = None
    raw_ai_summary_text: Optional[str] = None

class InterviewBase(BaseModel):
    current_phase: str = Field(default="general")
    selected_field: SpecializedField = Field(default="none")
    desired_position_in_field: Optional[str] = None

    general_question_set_id_name: Optional[str] = None # ID của bộ câu hỏi chung đã dùng
    general_questions_snapshot: List[Question] = []
    general_answers_and_feedback: List[AnswerWithFeedback] = []

    specialized_question_set_id_name: Optional[str] = None # ID của bộ câu hỏi chuyên môn đã dùng
    specialized_questions_snapshot: Optional[List[Question]] = None # Optional vì có thể chưa đến giai đoạn này
    specialized_answers_and_feedback: List[AnswerWithFeedback] = []

    overall_assessment: Optional[OverallAssessment] = None
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    is_completed: bool = False

class InterviewCreate(BaseModel):
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InterviewInDB(InterviewBase):  # Kế thừa tất cả từ InterviewBase
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
        from_attributes = True


class InterviewPublic(BaseModel):
    id: str  # Sẽ là string của ObjectId
    current_phase: str
    selected_field: SpecializedField
    desired_position_in_field: Optional[str]
    general_question_set_id_name: Optional[str]
    specialized_question_set_id_name: Optional[str]
    overall_assessment: Optional[OverallAssessment]
    start_time: datetime
    end_time: Optional[datetime]
    is_completed: bool

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class SelectFieldPayload(BaseModel):
    interview_db_id: str
    field: SpecializedField # 'developer' or 'designer'

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
    # Thông tin về giai đoạn mới
    interview_phase: str
    available_fields_to_choose: Optional[
    List[SpecializedField]] = None
    is_final_assessment_ready: bool = False
    final_assessment: Optional[OverallAssessment] = None

# THÊM MODEL TOKEN Ở ĐÂY
class Token(BaseModel):
    access_token: str
    token_type: str

# Thêm timezone import cho datetime
from datetime import timezone