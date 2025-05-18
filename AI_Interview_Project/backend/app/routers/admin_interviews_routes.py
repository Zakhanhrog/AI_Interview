# backend/app/routers/admin_interviews_routes.py
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional, Dict, Any
from bson import ObjectId

from ..db import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models import InterviewPublic, InterviewInDB # Thêm InterviewInDB
from ..security import get_current_admin_user


router = APIRouter(
    prefix="/admin/interviews",  # Prefix cục bộ cho router này
    tags=["Admin - Interviews"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.get("", response_model=List[InterviewPublic])
async def get_all_interviews(
        db: AsyncIOMotorDatabase = Depends(get_database),
        status_filter: Optional[str] = None,
        limit: int = Query(20, ge=1, le=100),
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
            # Chuyển đổi ObjectId về str cho 'id' của InterviewPublic
            public_data = InterviewInDB(**interview_doc).model_dump()
            public_data["id"] = interview_doc_id_str
            interviews_list.append(InterviewPublic(**public_data))
        except Exception as e:
            print(f"Error validating interview doc {interview_doc_id_str} from DB: {e}")
            # Có thể bỏ qua bản ghi lỗi hoặc xử lý khác
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

    interview_doc_id_str = str(interview_doc["_id"])
    try:
        public_data = InterviewInDB(**interview_doc).model_dump()
        public_data["id"] = interview_doc_id_str
        return InterviewPublic(**public_data)
    except Exception as e:
        print(f"Error validating interview doc {interview_doc_id_str} for detail view: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error processing interview data.")