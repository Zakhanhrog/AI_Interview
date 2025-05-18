from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional, Dict, Any
from bson import ObjectId

from ..db import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models import InterviewPublic, InterviewInDB, InterviewLifecycleStatus
from ..security import get_current_admin_user

router = APIRouter(
    prefix="/admin/interviews",
    tags=["Admin - Interviews"],
    dependencies=[Depends(get_current_admin_user)]
)


@router.get("", response_model=List[InterviewPublic])
async def get_all_interviews(
        db: AsyncIOMotorDatabase = Depends(get_database),
        lifecycle_status_filter: Optional[InterviewLifecycleStatus] = Query(default=None,
                                                                            description="Filter by lifecycle status. If 'show_all_statuses' is false and this is null, defaults to 'completed'."),
        show_all_statuses: bool = Query(default=False,
                                        description="Set to true to ignore lifecycle_status_filter and show all interviews."),
        overall_assessment_status_filter: Optional[str] = Query(default=None,
                                                                description="Filter by the status string within overall_assessment (e.g., 'Đạt', 'Không đạt')."),
        limit: int = Query(20, ge=1, le=100),
        skip: int = Query(0, ge=0)
):
    interview_collection = db.get_collection("interviews")
    query: Dict[str, Any] = {}

    if not show_all_statuses:
        if lifecycle_status_filter:
            query["lifecycle_status"] = lifecycle_status_filter
        else:
            # Mặc định chỉ lấy các buổi đã hoàn thành nếu không có filter nào được chỉ định và không show_all
            query["lifecycle_status"] = "completed"
            # Hoặc query["is_completed"] = True, tùy thuộc bạn muốn dùng trường nào làm chính

    if overall_assessment_status_filter:
        # Filter này sẽ chỉ có ý nghĩa nếu lifecycle_status là 'completed' hoặc show_all=True
        query["overall_assessment.status"] = overall_assessment_status_filter

    interviews_cursor = interview_collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    interviews_list = []
    async for interview_doc in interviews_cursor:
        interview_doc_id_str = str(interview_doc["_id"])
        try:
            validated_interview = InterviewInDB(**interview_doc)
            # Tạo đối tượng InterviewPublic, có thể chọn lọc các trường ở đây nếu cần
            # Hoặc đảm bảo model InterviewPublic định nghĩa rõ các trường muốn trả về
            public_data = validated_interview.model_dump()  # Lấy tất cả từ model_dump của InterviewInDB
            public_data["id"] = interview_doc_id_str
            # Có thể bạn muốn loại bỏ các list câu hỏi/trả lời dài dòng ở view danh sách
            # và chỉ hiển thị chúng ở view chi tiết
            public_data.pop("general_questions_snapshot", None)
            public_data.pop("general_answers_and_feedback", None)
            public_data.pop("specialized_questions_snapshot", None)
            public_data.pop("specialized_answers_and_feedback", None)

            interviews_list.append(InterviewPublic(**public_data))
        except Exception as e:
            print(f"Error validating/transforming interview doc {interview_doc_id_str} from DB for list view: {e}")
    return interviews_list


@router.get("/{interview_db_id}", response_model=InterviewPublic)
async def get_interview_by_id(interview_db_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    interview_collection = db.get_collection("interviews")
    try:
        oid = ObjectId(interview_db_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview_db_id format.")

    interview_doc = await interview_collection.find_one({"_id": oid})
    if not interview_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    try:
        # Khi xem chi tiết, chúng ta muốn trả về tất cả thông tin, bao gồm cả Q&A
        interview_instance = InterviewInDB(**interview_doc)
        public_representation = InterviewPublic(
            id=str(interview_doc["_id"]),
            lifecycle_status=interview_instance.lifecycle_status,
            selected_field=interview_instance.selected_field,
            desired_position_in_field=interview_instance.desired_position_in_field,
            general_question_set_id_name=interview_instance.general_question_set_id_name,
            general_answers_and_feedback=interview_instance.general_answers_and_feedback,
            specialized_question_set_id_name=interview_instance.specialized_question_set_id_name,
            specialized_answers_and_feedback=interview_instance.specialized_answers_and_feedback,
            overall_assessment=interview_instance.overall_assessment,
            start_time=interview_instance.start_time,
            updated_at=interview_instance.updated_at,
            end_time=interview_instance.end_time,
            is_completed=interview_instance.is_completed
            # Không cần truyền general_questions_snapshot và specialized_questions_snapshot
            # trừ khi model InterviewPublic yêu cầu (hiện tại không)
        )
        return public_representation
    except Exception as e:
        print(f"Error validating/serializing interview doc {str(interview_doc['_id'])} for detail view: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Error processing interview data for detail view.")