# backend/app/models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
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

class QuestionSetBase(BaseModel):
    name: str
    questions: List[Question] = []

class QuestionSetCreate(QuestionSetBase):
    id_name: Optional[str] = None

class QuestionSetUpdate(BaseModel):
    name: Optional[str] = None
    questions: Optional[List[Question]] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Sử dụng timezone-aware

class QuestionSetInDB(QuestionSetBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    id_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Sử dụng timezone-aware
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Sử dụng timezone-aware

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class QuestionSetPublic(BaseModel):
    id_name: str
    name: str
    questions: List[Question]
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
    raw_ai_summary_text: Optional[str] = None

class InterviewBase(BaseModel):
    question_set_id_name: str
    question_list_snapshot: List[Question]
    answers_and_feedback: List[AnswerWithFeedback] = []
    overall_assessment: Optional[OverallAssessment] = None
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Sử dụng timezone-aware
    end_time: Optional[datetime] = None
    is_completed: bool = False

class InterviewCreate(InterviewBase):
    pass

class InterviewInDB(InterviewBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Sử dụng timezone-aware

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
        from_attributes = True

class InterviewPublic(InterviewBase):
    id: str
    created_at: datetime

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        from_attributes = True

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
    feedback: str
    next_question: Optional[InterviewQuestionResponse] = None
    is_final_assessment_ready: bool = False
    final_assessment: Optional[OverallAssessment] = None

# THÊM MODEL TOKEN Ở ĐÂY
class Token(BaseModel):
    access_token: str
    token_type: str

# Thêm timezone import cho datetime
from datetime import timezone