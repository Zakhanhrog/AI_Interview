# backend/app/routers/admin_question_sets_routes.py
from fastapi import APIRouter, HTTPException, Depends, status, Body
from typing import List
from uuid import uuid4, UUID
from datetime import datetime, timezone
from bson import ObjectId

from ..db import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models import (
    QuestionSetCreate, QuestionSetPublic, QuestionSetUpdate,
    QuestionSetInDB, Question  # Question cũng cần ở đây
)
from ..sample_data import DEFAULT_GENERAL_QSET_ID # Để kiểm tra không xóa default set
from ..security import get_current_admin_user

router = APIRouter(
    prefix="/admin/question-sets",  # Prefix cục bộ cho router này
    tags=["Admin - Question Sets"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("", response_model=QuestionSetPublic, status_code=status.HTTP_201_CREATED)
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
    validated_qset = QuestionSetInDB(**new_qset_doc_data, _id=ObjectId())
    await question_set_collection.insert_one(validated_qset.model_dump(by_alias=True))

    created_doc = await question_set_collection.find_one({"id_name": validated_qset.id_name})
    if not created_doc:
        raise HTTPException(status_code=500, detail="Failed to create and retrieve question set.")
    return QuestionSetPublic(**QuestionSetInDB(**created_doc).model_dump())


@router.get("", response_model=List[QuestionSetPublic])
async def get_all_question_sets(db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    qsets_cursor = question_set_collection.find()
    qsets_list = []
    async for qset_doc in qsets_cursor:
        qsets_list.append(QuestionSetPublic(**QuestionSetInDB(**qset_doc).model_dump()))
    return qsets_list


@router.get("/{id_name}", response_model=QuestionSetPublic)
async def get_question_set_by_id_name(id_name: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    qset_doc = await question_set_collection.find_one({"id_name": id_name})
    if not qset_doc:
        raise HTTPException(status_code=404, detail=f"Question set '{id_name}' not found.")
    return QuestionSetPublic(**QuestionSetInDB(**qset_doc).model_dump())


@router.put("/{id_name}", response_model=QuestionSetPublic)
async def update_question_set(id_name: str, qset_update_data: QuestionSetUpdate,
                              db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    update_data_dict = qset_update_data.model_dump(exclude_unset=True)
    if not update_data_dict:
        raise HTTPException(status_code=400, detail="No update data provided.")

    update_data_dict["updated_at"] = datetime.now(timezone.utc)
    if "questions" in update_data_dict and update_data_dict["questions"] is not None:
         # Đảm bảo Question models bên trong được dump đúng cách nếu cần
        update_data_dict["questions"] = [Question(**q).model_dump() if isinstance(q, dict) else q.model_dump() for q in update_data_dict["questions"]]


    result = await question_set_collection.update_one({"id_name": id_name}, {"$set": update_data_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Question set '{id_name}' not found.")

    updated_doc = await question_set_collection.find_one({"id_name": id_name})
    if not updated_doc:
        raise HTTPException(status_code=404, detail="Updated question set not found after update.")
    return QuestionSetPublic(**QuestionSetInDB(**updated_doc).model_dump())


@router.delete("/{id_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question_set(id_name: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if id_name == DEFAULT_GENERAL_QSET_ID:
        raise HTTPException(status_code=400, detail="Cannot delete the default question set.")

    question_set_collection = db.get_collection("question_sets")
    delete_result = await question_set_collection.delete_one({"id_name": id_name})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Question set '{id_name}' not found.")
    return None