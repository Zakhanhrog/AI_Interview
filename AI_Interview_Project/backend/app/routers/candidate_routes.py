from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from datetime import datetime, timezone, date
import json
from typing import Dict, Any, List, Optional,Literal

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from .. import globals as app_globals
from ..db import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models import (
    InterviewQuestionResponse, AnswerPayload, AIFeedbackResponse,
    AnswerWithFeedback, OverallAssessment, Question, QuestionSetInDB,
    InterviewInDB, SpecializedField, SelectFieldPayload, InterviewLifecycleStatus,
    CandidateInfoPayload, SubmitCandidateInfoResponse, StrengthWeaknessDetail,
    DefaultQuestionSetSettings
)
router = APIRouter()

DEFAULT_SETTINGS_ID = "default_question_set_config"


async def get_default_qset_id_name_from_config(db: AsyncIOMotorDatabase,
                                               qset_type: Literal["general", "developer", "designer"]) -> Optional[str]:
    settings_collection = db.get_collection("settings")
    config_doc = await settings_collection.find_one({"_id": DEFAULT_SETTINGS_ID})
    if config_doc:
        if qset_type == "general":
            return config_doc.get("default_general_qset_id_name")
        elif qset_type == "developer":
            return config_doc.get("default_developer_qset_id_name")
        elif qset_type == "designer":
            return config_doc.get("default_designer_qset_id_name")
    return None


@router.post("/submit-candidate-info", response_model=SubmitCandidateInfoResponse)
async def submit_candidate_info_endpoint(
        payload: CandidateInfoPayload,
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    interview_collection = db.get_collection("interviews")
    current_time = datetime.now(timezone.utc)

    candidate_info_to_save = payload.model_dump(exclude_none=True)
    if 'date_of_birth' in candidate_info_to_save and isinstance(candidate_info_to_save['date_of_birth'], date):
        candidate_info_to_save['date_of_birth'] = candidate_info_to_save['date_of_birth'].isoformat()

    new_interview_data = InterviewInDB(
        candidate_info_raw=candidate_info_to_save,
        lifecycle_status="info_submitted",
        updated_at=current_time,
        start_time=current_time,
        desired_position_in_field=payload.interested_field,
    )

    try:
        db_entry = new_interview_data.model_dump(by_alias=True, exclude_none=True)
        result = await interview_collection.insert_one(db_entry)
        interview_db_id = str(result.inserted_id)

        return SubmitCandidateInfoResponse(
            interview_id=interview_db_id,
            message="Candidate info submitted successfully. Interview record created."
        )

    except Exception as e:
        print(f"Error saving to MongoDB or creating interview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save candidate information: {str(e)}"
        )


@router.post("/interviews/{interview_id}/start-general", response_model=AIFeedbackResponse)
async def start_general_phase_endpoint(
        interview_id: str,
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    interview_collection = db.get_collection("interviews")
    question_set_collection = db.get_collection("question_sets")

    try:
        interview_oid = ObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview_id format.")

    interview_doc = await interview_collection.find_one({"_id": interview_oid})
    if not interview_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    current_interview = InterviewInDB(**interview_doc)

    if current_interview.lifecycle_status not in ["info_submitted", "awaiting_specialization", "completed",
                                                  "abandoned"]:
        if current_interview.lifecycle_status == "general_in_progress" and current_interview.general_questions_snapshot:
            first_q = current_interview.general_questions_snapshot[0]
            is_last = len(current_interview.general_questions_snapshot) == 1
            return AIFeedbackResponse(
                interview_db_id=interview_id,
                feedback="Continuing interview session.",
                next_question=InterviewQuestionResponse(
                    question_id=first_q.id,
                    question_text=first_q.text,
                    is_last_question=is_last
                ),
                interview_lifecycle_status=current_interview.lifecycle_status,
            )

    default_general_qset_id_name = await get_default_qset_id_name_from_config(db, "general")
    if not default_general_qset_id_name:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Default general question set ID name not configured in settings.")

    default_general_qset_doc = await question_set_collection.find_one(
        {"id_name": default_general_qset_id_name, "field_type": "none"})
    if not default_general_qset_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Configured default general question set '{default_general_qset_id_name}' not found or not a 'none' type.")

    qset_from_db = QuestionSetInDB(**default_general_qset_doc)
    general_questions_snapshot = qset_from_db.questions

    if not general_questions_snapshot:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Default general question set '{default_general_qset_id_name}' has no questions.")

    current_time = datetime.now(timezone.utc)

    update_data = {
        "start_time": current_interview.start_time or current_time,
        "updated_at": current_time,
        "lifecycle_status": "general_in_progress",
        "general_question_set_id_name": qset_from_db.id_name,
        "general_questions_snapshot": [q.model_dump() for q in general_questions_snapshot],
        "general_answers_and_feedback": [],
        "selected_field": "none",
        "specialized_question_set_id_name": None,
        "specialized_questions_snapshot": None,
        "specialized_answers_and_feedback": [],
        "overall_assessment": None,
        "is_completed": False,
        "end_time": None
    }

    await interview_collection.update_one(
        {"_id": interview_oid},
        {"$set": update_data}
    )

    current_question_for_response = general_questions_snapshot[0]
    is_last_in_phase = (len(general_questions_snapshot) == 1)

    return AIFeedbackResponse(
        interview_db_id=interview_id,
        feedback="Chào mừng bạn đến với buổi phỏng vấn tự động! Hãy bắt đầu với một số câu hỏi chung.",
        next_question=InterviewQuestionResponse(
            question_id=current_question_for_response.id,
            question_text=current_question_for_response.text,
            is_last_question=is_last_in_phase
        ),
        interview_lifecycle_status="general_in_progress",
        available_fields_to_choose=None,
        is_final_assessment_ready=False,
        final_assessment=None
    )


@router.post("/select-field", response_model=AIFeedbackResponse)
async def select_field_endpoint(payload: SelectFieldPayload, db: AsyncIOMotorDatabase = Depends(get_database)):
    interview_collection = db.get_collection("interviews")
    question_set_collection = db.get_collection("question_sets")

    try:
        interview_oid = ObjectId(payload.interview_db_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview_db_id format.")

    interview_doc = await interview_collection.find_one({"_id": interview_oid})
    if not interview_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    current_interview = InterviewInDB(**interview_doc)

    if current_interview.lifecycle_status != "awaiting_specialization":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Not in the phase to select specialization.")

    if payload.field not in ["developer", "designer"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid field selected. Must be 'developer' or 'designer'.")

    specialized_qset_id_name = await get_default_qset_id_name_from_config(db, payload.field)  # type: ignore

    if not specialized_qset_id_name:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Default question set ID name for field '{payload.field}' not configured in settings.")

    specialized_qset_doc = await question_set_collection.find_one(
        {"id_name": specialized_qset_id_name, "field_type": payload.field})

    if not specialized_qset_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Configured default specialized question set '{specialized_qset_id_name}' for '{payload.field}' not found or type mismatch.")

    qset_specialized = QuestionSetInDB(**specialized_qset_doc)
    specialized_questions_snapshot = qset_specialized.questions

    if not specialized_questions_snapshot:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Default specialized question set for '{payload.field}' is empty.")

    first_specialized_question = specialized_questions_snapshot[0]
    is_last_specialized = (len(specialized_questions_snapshot) == 1)

    update_fields = {
        "selected_field": payload.field,
        "lifecycle_status": "specialized_in_progress",
        "specialized_question_set_id_name": specialized_qset_id_name,
        "specialized_questions_snapshot": [q.model_dump() for q in specialized_questions_snapshot],
        "specialized_answers_and_feedback": [],
        "updated_at": datetime.now(timezone.utc)
    }
    await interview_collection.update_one({"_id": interview_oid}, {"$set": update_fields})

    return AIFeedbackResponse(
        interview_db_id=payload.interview_db_id,
        feedback=f"Cảm ơn bạn đã chọn lĩnh vực {payload.field}. Chúng ta sẽ tiếp tục với các câu hỏi chuyên môn.",
        next_question=InterviewQuestionResponse(
            question_id=first_specialized_question.id,
            question_text=first_specialized_question.text,
            is_last_question=is_last_specialized
        ),
        interview_lifecycle_status="specialized_in_progress",
        available_fields_to_choose=None,
        is_final_assessment_ready=False,
        final_assessment=None
    )


@router.post("/submit-answer", response_model=AIFeedbackResponse)
async def submit_answer_endpoint(payload: AnswerPayload, db: AsyncIOMotorDatabase = Depends(get_database)):
    if not payload.interview_db_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="interview_db_id is required.")

    interview_collection = db.get_collection("interviews")
    try:
        interview_oid = ObjectId(payload.interview_db_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview_db_id format.")

    interview_doc = await interview_collection.find_one({"_id": interview_oid})
    if not interview_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    current_interview = InterviewInDB(**interview_doc)

    if current_interview.is_completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="This interview has already been completed.")

    questions_snapshot: List[Question]
    answers_list: List[AnswerWithFeedback]
    answer_update_field_name: str

    if current_interview.lifecycle_status == "general_in_progress":
        if not current_interview.general_questions_snapshot:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="General questions not loaded for this interview phase.")
        questions_snapshot = current_interview.general_questions_snapshot
        answers_list = current_interview.general_answers_and_feedback
        answer_update_field_name = "general_answers_and_feedback"
    elif current_interview.lifecycle_status == "specialized_in_progress":
        if not current_interview.specialized_questions_snapshot:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="Specialized questions not loaded for this interview phase.")
        questions_snapshot = current_interview.specialized_questions_snapshot
        answers_list = current_interview.specialized_answers_and_feedback
        answer_update_field_name = "specialized_answers_and_feedback"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot submit answer in lifecycle_status: {current_interview.lifecycle_status}")

    current_question_index_in_list = len(answers_list)
    if current_question_index_in_list >= len(questions_snapshot) or \
            questions_snapshot[current_question_index_in_list].id != payload.question_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid question submission or out of order.")

    question_answered = questions_snapshot[current_question_index_in_list]

    desired_position_update = current_interview.desired_position_in_field
    if current_interview.lifecycle_status == "specialized_in_progress" and current_question_index_in_list == 0:
        desired_position_update = payload.answer_text

    ai_generated_feedback_for_answer = "Phản hồi AI đang được xử lý..."
    if app_globals.gemini_model:
        try:
            prompt_for_individual_feedback = f"""Phân tích câu trả lời phỏng vấn sau đây một cách ngắn gọn (1-2 câu), tập trung vào sự rõ ràng và liên quan đến câu hỏi:
Câu hỏi: "{question_answered.text}"
Câu trả lời của ứng viên: "{payload.answer_text}"
Nhận xét của bạn:"""
            response_individual = await app_globals.gemini_model.generate_content_async(prompt_for_individual_feedback)
            if response_individual.parts:
                ai_generated_feedback_for_answer = response_individual.text.strip()
            elif response_individual.prompt_feedback and response_individual.prompt_feedback.block_reason:
                ai_generated_feedback_for_answer = f"Phản hồi AI bị chặn: {response_individual.prompt_feedback.block_reason_message or 'Safety reasons'}"
            else:
                ai_generated_feedback_for_answer = "AI không thể đưa ra nhận xét cho câu trả lời này."
        except Exception as e:
            print(f"ERROR calling Gemini for individual answer feedback: {str(e)}")
            ai_generated_feedback_for_answer = "Lỗi khi AI xử lý câu trả lời này."
    else:
        print("WARNING: Gemini model not available for individual feedback.")
        ai_generated_feedback_for_answer = "Phản hồi từ AI hiện không khả dụng."

    new_answer_with_feedback = AnswerWithFeedback(
        question_id=question_answered.id,
        question_text=question_answered.text,
        candidate_answer=payload.answer_text,
        ai_feedback_per_answer=ai_generated_feedback_for_answer,
        timestamp=datetime.now(timezone.utc)
    )
    updated_answers_for_current_phase = answers_list + [new_answer_with_feedback]

    current_time_for_update = datetime.now(timezone.utc)
    update_fields_to_db: Dict[str, Any] = {
        answer_update_field_name: [ans.model_dump() for ans in updated_answers_for_current_phase],
        "updated_at": current_time_for_update
    }
    if desired_position_update is not None:
        update_fields_to_db["desired_position_in_field"] = desired_position_update

    next_question_to_send: Optional[InterviewQuestionResponse] = None
    response_lifecycle_status: InterviewLifecycleStatus = current_interview.lifecycle_status
    available_fields: Optional[List[SpecializedField]] = None
    is_final_assessment_now_ready = False
    final_assessment_payload: Optional[OverallAssessment] = None
    next_question_index_in_phase = current_question_index_in_list + 1

    if next_question_index_in_phase < len(questions_snapshot):
        next_q_object = questions_snapshot[next_question_index_in_phase]
        is_it_the_last_question_in_this_phase = (next_question_index_in_phase == len(questions_snapshot) - 1)
        next_question_to_send = InterviewQuestionResponse(
            question_id=next_q_object.id,
            question_text=next_q_object.text,
            is_last_question=is_it_the_last_question_in_this_phase
        )
    else:
        if current_interview.lifecycle_status == "general_in_progress":
            response_lifecycle_status = "awaiting_specialization"
            available_fields = ["developer", "designer"]
            update_fields_to_db["lifecycle_status"] = "awaiting_specialization"
        elif current_interview.lifecycle_status == "specialized_in_progress":
            response_lifecycle_status = "completed"
            is_final_assessment_now_ready = True
            update_fields_to_db["lifecycle_status"] = "completed"
            update_fields_to_db["is_completed"] = True
            update_fields_to_db["end_time"] = current_time_for_update

            full_transcript = "Phần câu hỏi chung:\n"
            answers_for_general_transcript = current_interview.general_answers_and_feedback
            if answer_update_field_name == "general_answers_and_feedback":
                answers_for_general_transcript = updated_answers_for_current_phase

            for i, item in enumerate(answers_for_general_transcript):
                full_transcript += f"  Câu hỏi {i + 1}: {item.question_text}\n  Trả lời: {item.candidate_answer}\n\n"

            answers_for_specialized_transcript = current_interview.specialized_answers_and_feedback
            if answer_update_field_name == "specialized_answers_and_feedback":
                answers_for_specialized_transcript = updated_answers_for_current_phase

            if answers_for_specialized_transcript:
                full_transcript += f"Phần câu hỏi chuyên môn ({current_interview.selected_field}):\n"
                actual_desired_position = desired_position_update if desired_position_update else (
                        current_interview.desired_position_in_field or "Chưa rõ")
                full_transcript += f"  Vị trí ứng tuyển mong muốn: {actual_desired_position}\n"
                for i, item in enumerate(answers_for_specialized_transcript):
                    full_transcript += f"  Câu hỏi {i + 1}: {item.question_text}\n  Trả lời: {item.candidate_answer}\n\n"

            if app_globals.gemini_model:
                raw_json_text_from_ai_for_error = "AI response not captured yet for error logging."
                try:
                    final_assessment_field = current_interview.selected_field if current_interview.selected_field != "none" else "Chung"
                    final_desired_position = desired_position_update if desired_position_update else (
                            current_interview.desired_position_in_field or "Chưa rõ")

                    prompt_for_final_assessment = f"""Bạn là một chuyên gia tuyển dụng AI giàu kinh nghiệm. Nhiệm vụ của bạn là phân tích kỹ lưỡng TOÀN BỘ buổi phỏng vấn dưới đây và đưa ra đánh giá chi tiết, khách quan.
Buổi phỏng vấn bao gồm:
1. Phần câu hỏi chung.
2. Phần câu hỏi chuyên môn cho lĩnh vực: '{final_assessment_field}'.
Ứng viên mong muốn ứng tuyển vào vị trí: '{final_desired_position}'.

Đây là toàn bộ nội dung buổi phỏng vấn (chỉ bao gồm câu hỏi và câu trả lời của ứng viên):
--- BEGIN INTERVIEW TRANSCRIPT ---
{full_transcript}
--- END INTERVIEW TRANSCRIPT ---

YÊU CẦU PHÂN TÍCH VÀ ĐÁNH GIÁ:
Hãy xem xét TẤT CẢ các câu trả lời của ứng viên từ ĐẦU ĐẾN CUỐI buổi phỏng vấn.
Đối với mỗi nhận định về điểm mạnh hoặc điểm yếu, hãy cố gắng chỉ ra nó được thể hiện qua câu trả lời cho câu hỏi nào hoặc qua tình huống nào trong buổi phỏng vấn.

Hãy đưa ra đánh giá của bạn theo định dạng JSON sau. Đảm bảo output là một JSON object hợp lệ:

{{
  "overall_summary_comment": "Một đoạn nhận xét tổng quan (3-5 câu) về phong thái chung, khả năng giao tiếp, sự tự tin, và tư duy phản biện của ứng viên xuyên suốt buổi phỏng vấn. Nhận xét này phải dựa trên cảm nhận từ toàn bộ quá trình, không chỉ một vài câu hỏi.",
  "strengths_analysis": [
    {{
      "point": "Mô tả điểm mạnh cụ thể (ví dụ: Kiến thức chuyên môn sâu về Java Spring Boot).",
      "evidence": "Thể hiện qua câu trả lời cho câu hỏi về [Nêu tên/nội dung câu hỏi] ở phần [Chung/Chuyên môn], nơi ứng viên đã [Mô tả cách ứng viên trả lời, ví dụ: giải thích chi tiết về cách sử dụng annotation XYZ, hoặc đưa ra ví dụ dự án thực tế]."
    }}
  ],
  "weaknesses_analysis": [
    {{
      "point": "Mô tả điểm yếu/cần cải thiện (ví dụ: Kinh nghiệm thực tế với Kubernetes còn hạn chế).",
      "evidence": "Qua câu trả lời cho câu hỏi về [Nêu tên/nội dung câu hỏi], ứng viên có vẻ chưa tự tin hoặc kiến thức còn ở mức lý thuyết."
    }}
  ],
  "status": "Đạt",
  "suitability_for_field": "Phù hợp với lĩnh vực '{final_assessment_field}' do [lý do ngắn gọn dựa trên phân tích]",
  "suggested_positions": ["Vị trí gợi ý 1 (cụ thể hơn nếu có thể, ví dụ: Junior Java Developer with Spring Focus)"],
  "suggestions_if_not_pass": "Nếu không đạt, ứng viên nên tập trung vào [Nêu cụ thể kỹ năng/kiến thức cần cải thiện dựa trên điểm yếu đã phân tích]"
}}

JSON Output:
"""
                    response_final = await app_globals.gemini_model.generate_content_async(
                        prompt_for_final_assessment,
                        generation_config=GenerationConfig(response_mime_type="application/json")
                    )
                    if response_final.parts:
                        raw_json_text_from_ai_for_error = response_final.text.strip()
                        cleaned_json_text = raw_json_text_from_ai_for_error
                        if cleaned_json_text.startswith("```json"):
                            cleaned_json_text = cleaned_json_text[len("```json"):]
                        if cleaned_json_text.endswith("```"):
                            cleaned_json_text = cleaned_json_text[:-len("```")]
                        cleaned_json_text = cleaned_json_text.strip()
                        assessment_dict = json.loads(cleaned_json_text)
                        final_assessment_payload = OverallAssessment(
                            **assessment_dict,
                            raw_ai_summary_text=raw_json_text_from_ai_for_error
                        )
                    elif response_final.prompt_feedback and response_final.prompt_feedback.block_reason:
                        reason = response_final.prompt_feedback.block_reason_message or "Safety reasons"
                        final_assessment_payload = OverallAssessment(status=f"Đánh giá bị chặn: {reason}",
                                                                     raw_ai_summary_text=f"Blocked: {reason}")
                    else:
                        final_assessment_payload = OverallAssessment(status="AI không thể tạo đánh giá cuối cùng",
                                                                     raw_ai_summary_text="No content returned by AI for final assessment.")
                except json.JSONDecodeError as json_e:
                    print(
                        f"ERROR decoding JSON from Gemini final assessment: {json_e}. Raw text: {raw_json_text_from_ai_for_error}")
                    final_assessment_payload = OverallAssessment(status="Lỗi định dạng JSON từ AI",
                                                                 raw_ai_summary_text=f"JSON Decode Error. Raw text: {raw_json_text_from_ai_for_error}")
                except Exception as e:
                    print(f"ERROR calling Google Gemini API for final assessment: {str(e)}")
                    final_assessment_payload = OverallAssessment(status="Lỗi gọi AI đánh giá cuối",
                                                                 raw_ai_summary_text=str(e))

                if final_assessment_payload:
                    update_fields_to_db["overall_assessment"] = final_assessment_payload.model_dump()
            else:
                print("WARNING: Gemini model not available for final assessment.")
                final_assessment_payload = OverallAssessment(status="Model AI không sẵn sàng để đánh giá cuối.")
                update_fields_to_db["overall_assessment"] = final_assessment_payload.model_dump()

    await interview_collection.update_one({"_id": interview_oid}, {"$set": update_fields_to_db})

    return AIFeedbackResponse(
        interview_db_id=payload.interview_db_id,
        feedback=ai_generated_feedback_for_answer,
        next_question=next_question_to_send,
        interview_lifecycle_status=response_lifecycle_status,
        available_fields_to_choose=available_fields,
        is_final_assessment_ready=is_final_assessment_now_ready,
        final_assessment=final_assessment_payload
    )