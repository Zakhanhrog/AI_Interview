from fastapi import FastAPI, HTTPException, Body, Depends, status, APIRouter, Query
from fastapi.middleware.cors import CORSMiddleware
from uuid import UUID, uuid4
from datetime import datetime, timezone  # Thêm timezone
import json
from typing import Dict, List, Optional, Any  # Thêm Any

import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from bson import ObjectId

from .config import settings
from .models import (
    InterviewQuestionResponse, AnswerPayload, AIFeedbackResponse,
    AnswerWithFeedback, OverallAssessment, Question,
    QuestionSetInDB, InterviewInDB, InterviewCreate, QuestionSetCreate,
    QuestionSetPublic, QuestionSetUpdate, InterviewPublic, PyObjectId,
    Token  # Import Token
)
from .sample_data import (
    DEFAULT_QUESTION_SET_ID, SAMPLE_QUESTIONS
)
from .db import connect_to_mongo, close_mongo_connection, get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import router và dependency cho xác thực admin
from .routers import admin_auth  # Thư mục routers phải có __init__.py
from .security import get_current_admin_user

# --- Lifespan (thay thế on_event) ---
from contextlib import asynccontextmanager

gemini_model = None  # Khai báo ở global scope


@asynccontextmanager
async def lifespan(app: FastAPI):
    global gemini_model  # Để có thể gán giá trị
    await connect_to_mongo()
    db_instance = get_database()
    if db_instance is None:
        print("CRITICAL: Database connection failed at startup.")
    else:
        if not settings.GOOGLE_AI_API_KEY:
            print("FATAL ERROR: GOOGLE_AI_API_KEY is not set.")
        else:
            try:
                genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
                print("Successfully configured Google Generative AI API Key.")
                selected_model_name = 'gemini-1.5-flash-latest'
                gemini_model = genai.GenerativeModel(model_name=selected_model_name)
                print(f"Using Google Gemini model: {gemini_model.model_name}")
            except Exception as e:
                print(f"ERROR configuring Google Generative AI or initializing model: {str(e)}")
        await initial_data_setup(db_instance)  # Truyền db_instance vào
    print("Application startup complete.")
    yield
    await close_mongo_connection()
    print("Application shutdown complete.")


app = FastAPI(
    title="AI Interview API with Google Gemini - Phase 3 Auth",
    description="API with DB integration and admin authentication.",
    version="0.3.1",
    lifespan=lifespan  # Sử dụng lifespan mới
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def initial_data_setup(db_instance: AsyncIOMotorDatabase):  # Nhận db_instance
    if db_instance is None: return

    question_set_collection = db_instance.get_collection("question_sets")
    default_set_doc = await question_set_collection.find_one({"id_name": DEFAULT_QUESTION_SET_ID})
    if not default_set_doc:
        print(f"Initializing default question set '{DEFAULT_QUESTION_SET_ID}' in DB.")
        questions_for_db = [q.model_dump() for q in SAMPLE_QUESTIONS]
        new_set_data = QuestionSetInDB(
            id_name=DEFAULT_QUESTION_SET_ID,
            name="Bộ câu hỏi Kỹ năng mềm Cơ bản (Mẫu từ Code)",
            questions=questions_for_db,
            created_at=datetime.now(timezone.utc),  # Timezone-aware
            updated_at=datetime.now(timezone.utc)  # Timezone-aware
        )
        # insert_one mong đợi một dict, không phải Pydantic model trực tiếp trừ khi có cấu hình đặc biệt
        await question_set_collection.insert_one(new_set_data.model_dump(by_alias=True))
        print(f"Default question set '{DEFAULT_QUESTION_SET_ID}' initialized.")
    else:
        print(f"Default question set '{DEFAULT_QUESTION_SET_ID}' already exists.")


# --- Include Routers ---
app.include_router(admin_auth.router, prefix="/api/v1/admin/auth", tags=["Admin Authentication"])


# --- API Endpoints cho Ứng viên (Giữ nguyên) ---
@app.get("/start-interview", response_model=AIFeedbackResponse)
async def start_interview_endpoint(db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    interview_collection = db.get_collection("interviews")
    default_qset_doc = await question_set_collection.find_one({"id_name": DEFAULT_QUESTION_SET_ID})
    if not default_qset_doc:
        raise HTTPException(status_code=500, detail="Default question set not available.")
    qset_from_db = QuestionSetInDB(**default_qset_doc)
    questions_snapshot = qset_from_db.questions
    if not questions_snapshot:
        raise HTTPException(status_code=500, detail="Default question set has no questions.")
    new_interview_data = InterviewCreate(
        question_set_id_name=DEFAULT_QUESTION_SET_ID,
        question_list_snapshot=questions_snapshot,
        start_time=datetime.now(timezone.utc)  # Timezone-aware
    )
    result = await interview_collection.insert_one(new_interview_data.model_dump())
    interview_db_id = str(result.inserted_id)
    current_question_for_response = questions_snapshot[0]
    total_questions = len(questions_snapshot)
    is_last = (0 == total_questions - 1)
    return AIFeedbackResponse(
        interview_db_id=interview_db_id,
        feedback="Chào mừng bạn đến với buổi phỏng vấn tự động!",
        next_question=InterviewQuestionResponse(
            question_id=current_question_for_response.id,
            question_text=current_question_for_response.text,
            is_last_question=is_last
        ),
        is_final_assessment_ready=False,
        final_assessment=None
    )


@app.post("/submit-answer", response_model=AIFeedbackResponse)
async def submit_answer_endpoint(payload: AnswerPayload, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not payload.interview_db_id:
        raise HTTPException(status_code=400, detail="interview_db_id is required.")
    interview_collection = db.get_collection("interviews")
    try:
        interview_oid = ObjectId(payload.interview_db_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview_db_id format.")
    interview_doc = await interview_collection.find_one({"_id": interview_oid})
    if not interview_doc:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    current_interview = InterviewInDB(**interview_doc)
    if current_interview.is_completed:
        raise HTTPException(status_code=400, detail="This interview has already been completed.")
    current_question_index = len(current_interview.answers_and_feedback)
    if current_question_index >= len(current_interview.question_list_snapshot) or \
            current_interview.question_list_snapshot[current_question_index].id != payload.question_id:
        raise HTTPException(status_code=400, detail="Invalid question submission or out of order.")
    question_answered = current_interview.question_list_snapshot[current_question_index]
    ai_generated_feedback_for_answer = "Lỗi AI khi xử lý câu trả lời này."
    global gemini_model
    if gemini_model:
        try:
            prompt_for_individual_feedback = f"""Phân tích câu trả lời phỏng vấn sau đây một cách ngắn gọn (1-2 câu):
Câu hỏi: "{question_answered.text}"
Câu trả lời của ứng viên: "{payload.answer_text}"
Nhận xét của bạn:"""
            response_individual = await gemini_model.generate_content_async(prompt_for_individual_feedback)
            if response_individual.parts:
                ai_generated_feedback_for_answer = response_individual.text.strip()
            elif response_individual.prompt_feedback and response_individual.prompt_feedback.block_reason:
                ai_generated_feedback_for_answer = f"Phản hồi AI bị chặn: {response_individual.prompt_feedback.block_reason_message or 'Safety reasons'}"
        except Exception as e:
            print(f"ERROR calling Gemini for individual answer feedback: {str(e)}")
    new_answer_with_feedback = AnswerWithFeedback(
        question_id=question_answered.id,
        question_text=question_answered.text,
        candidate_answer=payload.answer_text,
        ai_feedback_per_answer=ai_generated_feedback_for_answer,
        timestamp=datetime.now(timezone.utc)  # Timezone-aware
    )
    updated_answers = current_interview.answers_and_feedback + [new_answer_with_feedback]
    update_fields: Dict[str, Any] = {"answers_and_feedback": [ans.model_dump() for ans in updated_answers]}
    next_question_to_send = None
    is_final_assessment_now_ready = False
    final_assessment_payload = None
    next_question_index = current_question_index + 1
    if next_question_index < len(current_interview.question_list_snapshot):
        next_q_object = current_interview.question_list_snapshot[next_question_index]
        is_it_the_last_question_in_sequence = (next_question_index == len(current_interview.question_list_snapshot) - 1)
        next_question_to_send = InterviewQuestionResponse(
            question_id=next_q_object.id,
            question_text=next_q_object.text,
            is_last_question=is_it_the_last_question_in_sequence
        )
    else:
        is_final_assessment_now_ready = True
        update_fields["is_completed"] = True
        update_fields["end_time"] = datetime.now(timezone.utc)  # Timezone-aware
        if gemini_model:
            try:
                interview_transcript = ""
                for i, item in enumerate(updated_answers):
                    interview_transcript += f"Câu hỏi {i + 1}: {item.question_text}\n"
                    interview_transcript += f"Ứng viên trả lời: {item.candidate_answer}\n"
                    interview_transcript += f"Nhận xét AI cho câu này: {item.ai_feedback_per_answer}\n\n"
                prompt_for_final_assessment = f"""Dựa vào toàn bộ nội dung buổi phỏng vấn dưới đây:
{interview_transcript}
Hãy đưa ra đánh giá tổng thể theo định dạng JSON sau. Đảm bảo output là một JSON object hợp lệ.
{{
  "strengths": ["Liệt kê 2-3 điểm mạnh chính của ứng viên"],
  "weaknesses": ["Liệt kê 1-2 điểm yếu/cần cải thiện"],
  "status": "Đạt" / "Không đạt" / "Cần xem xét thêm",
  "suggestions_if_not_pass": "Nếu 'Không đạt', đưa ra 1-2 gợi ý ngắn gọn. Nếu 'Đạt' hoặc 'Cần xem xét thêm', để giá trị này là null hoặc một chuỗi rỗng."
}}
JSON Output:"""
                response_final = await gemini_model.generate_content_async(
                    prompt_for_final_assessment,
                    generation_config=GenerationConfig(response_mime_type="application/json")
                )
                if response_final.parts:
                    raw_json_text_from_ai = response_final.text.strip()
                    if raw_json_text_from_ai.startswith("```json"):
                        raw_json_text_from_ai = raw_json_text_from_ai[len("```json"):]
                    if raw_json_text_from_ai.endswith("```"):
                        raw_json_text_from_ai = raw_json_text_from_ai[:-len("```")]
                    raw_json_text_from_ai = raw_json_text_from_ai.strip()
                    assessment_dict = json.loads(raw_json_text_from_ai)
                    final_assessment_payload = OverallAssessment(**assessment_dict,
                                                                 raw_ai_summary_text=response_final.text)
                elif response_final.prompt_feedback and response_final.prompt_feedback.block_reason:
                    reason = response_final.prompt_feedback.block_reason_message or "Safety reasons"
                    final_assessment_payload = OverallAssessment(status=f"Đánh giá bị chặn: {reason}",
                                                                 raw_ai_summary_text=f"Blocked: {reason}")
                else:
                    final_assessment_payload = OverallAssessment(status="AI không thể tạo đánh giá cuối cùng",
                                                                 raw_ai_summary_text="No content returned by AI for final assessment.")
            except Exception as e:
                print(f"ERROR calling Google Gemini API for final assessment: {str(e)}")
                final_assessment_payload = OverallAssessment(status="Lỗi gọi AI đánh giá cuối",
                                                             raw_ai_summary_text=str(e))
            if final_assessment_payload:
                update_fields["overall_assessment"] = final_assessment_payload.model_dump()
        else:
            final_assessment_payload = OverallAssessment(status="Model AI không sẵn sàng để đánh giá cuối.")
            update_fields["overall_assessment"] = final_assessment_payload.model_dump()
    await interview_collection.update_one({"_id": interview_oid}, {"$set": update_fields})
    return AIFeedbackResponse(
        interview_db_id=payload.interview_db_id,
        feedback=ai_generated_feedback_for_answer,
        next_question=next_question_to_send,
        is_final_assessment_ready=is_final_assessment_now_ready,
        final_assessment=final_assessment_payload
    )


# --- Admin: Question Sets ---
# Di chuyển các API này vào một file router riêng, ví dụ: backend/app/routers/admin_question_sets.py
# Sau đó include router đó ở đây. Tạm thời để đây cho bạn dễ theo dõi.

admin_question_sets_router = APIRouter(
    prefix="/admin/question-sets",
    tags=["Admin - Question Sets"],
    dependencies=[Depends(get_current_admin_user)]  # ÁP DỤNG XÁC THỰC CHO TOÀN BỘ ROUTER NÀY
)


@admin_question_sets_router.post("", response_model=QuestionSetPublic, status_code=status.HTTP_201_CREATED)
async def create_question_set(qset_data: QuestionSetCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    if qset_data.id_name:
        existing_set = await question_set_collection.find_one({"id_name": qset_data.id_name})
        if existing_set:
            raise HTTPException(status_code=400,
                                detail=f"Question set with id_name '{qset_data.id_name}' already exists.")
    else:
        qset_data.id_name = f"custom-set-{uuid4().hex[:8]}"
    new_qset_doc_data = {
        "id_name": qset_data.id_name,
        "name": qset_data.name,
        "questions": [q.model_dump() for q in qset_data.questions],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    # Validate bằng QuestionSetInDB trước khi insert
    validated_qset = QuestionSetInDB(**new_qset_doc_data,
                                     _id=ObjectId())  # _id sẽ được MongoDB tạo, nhưng Pydantic cần nó
    await question_set_collection.insert_one(validated_qset.model_dump(by_alias=True))  # by_alias để _id được dùng
    created_doc = await question_set_collection.find_one({"id_name": validated_qset.id_name})
    if not created_doc:  # Thêm kiểm tra
        raise HTTPException(status_code=500, detail="Failed to create and retrieve question set.")
    return QuestionSetPublic(**QuestionSetInDB(**created_doc).model_dump())


@admin_question_sets_router.get("", response_model=List[QuestionSetPublic])
async def get_all_question_sets(db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    qsets_cursor = question_set_collection.find()
    qsets_list = []
    async for qset_doc in qsets_cursor:
        qsets_list.append(QuestionSetPublic(**QuestionSetInDB(**qset_doc).model_dump()))
    return qsets_list


@admin_question_sets_router.get("/{id_name}", response_model=QuestionSetPublic)
async def get_question_set_by_id_name(id_name: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    qset_doc = await question_set_collection.find_one({"id_name": id_name})
    if not qset_doc:
        raise HTTPException(status_code=404, detail=f"Question set '{id_name}' not found.")
    return QuestionSetPublic(**QuestionSetInDB(**qset_doc).model_dump())


@admin_question_sets_router.put("/{id_name}", response_model=QuestionSetPublic)
async def update_question_set(id_name: str, qset_update_data: QuestionSetUpdate,
                              db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    update_data_dict = qset_update_data.model_dump(exclude_unset=True)
    if not update_data_dict:  # Nếu không có gì để update
        raise HTTPException(status_code=400, detail="No update data provided.")

    update_data_dict["updated_at"] = datetime.now(timezone.utc)
    if "questions" in update_data_dict and update_data_dict["questions"] is not None:
        update_data_dict["questions"] = [q.model_dump() for q in update_data_dict["questions"]]

    result = await question_set_collection.update_one({"id_name": id_name}, {"$set": update_data_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Question set '{id_name}' not found.")
    updated_doc = await question_set_collection.find_one({"id_name": id_name})
    if not updated_doc:  # Thêm kiểm tra
        raise HTTPException(status_code=404, detail="Updated question set not found after update.")
    return QuestionSetPublic(**QuestionSetInDB(**updated_doc).model_dump())


@admin_question_sets_router.delete("/{id_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question_set(id_name: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if id_name == DEFAULT_QUESTION_SET_ID:
        raise HTTPException(status_code=400, detail="Cannot delete the default question set.")
    question_set_collection = db.get_collection("question_sets")
    delete_result = await question_set_collection.delete_one({"id_name": id_name})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Question set '{id_name}' not found.")
    return None

app.include_router(admin_question_sets_router, prefix="/api/v1")

# --- Admin: Interviews ---
admin_interviews_router = APIRouter(
    prefix="/admin/interviews",
    tags=["Admin - Interviews"],
    dependencies=[Depends(get_current_admin_user)]
)

@admin_interviews_router.get("", response_model=List[InterviewPublic])
async def get_all_interviews(
        db: AsyncIOMotorDatabase = Depends(get_database),
        status_filter: Optional[str] = None,
        limit: int = Query(20, ge=1, le=100),  # Thêm Query validation
        skip: int = Query(0, ge=0)
):
    interview_collection = db.get_collection("interviews")
    query: Dict[str, Any] = {}
    if status_filter:
        query["overall_assessment.status"] = status_filter
    interviews_cursor = interview_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    interviews_list = []
    async for interview_doc in interviews_cursor:
        interview_doc_id_str = str(interview_doc["_id"])
        try:
            validated_interview = InterviewInDB(**interview_doc)
            public_interview_data = validated_interview.model_dump()
            public_interview_data["id"] = interview_doc_id_str
            interviews_list.append(InterviewPublic(**public_interview_data))
        except Exception as e:
            print(f"Error validating interview doc {interview_doc_id_str} from DB: {e}")
    return interviews_list


@admin_interviews_router.get("/{interview_db_id}", response_model=InterviewPublic)
async def get_interview_by_id(interview_db_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    interview_collection = db.get_collection("interviews")
    try:
        oid = ObjectId(interview_db_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview_db_id format.")
    interview_doc = await interview_collection.find_one({"_id": oid})
    if not interview_doc:
        raise HTTPException(status_code=404, detail="Interview not found.")
    interview_doc_id_str = str(interview_doc["_id"])
    try:
        validated_interview = InterviewInDB(**interview_doc)
        public_interview_data = validated_interview.model_dump()
        public_interview_data["id"] = interview_doc_id_str
        return InterviewPublic(**public_interview_data)
    except Exception as e:
        print(f"Error validating interview doc {interview_doc_id_str} for detail view: {e}")
        raise HTTPException(status_code=500, detail="Error processing interview data.")
app.include_router(admin_interviews_router, prefix="/api/v1")