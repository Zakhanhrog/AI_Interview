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
from ..security import get_current_admin_user

router = APIRouter(
    prefix="/admin/question-sets",  # Prefix cục bộ cho router này
    tags=["Admin - Question Sets"],
    dependencies=[Depends(get_current_admin_user)]
)


@router.post("", response_model=QuestionSetPublic, status_code=status.HTTP_201_CREATED)
async def create_question_set(qset_data: QuestionSetCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")

    if qset_data.is_default_general and qset_data.field_type != "none":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Default general question set must have field_type 'none'.")

    if qset_data.id_name:
        existing_set = await question_set_collection.find_one({"id_name": qset_data.id_name})
        if existing_set:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Question set with id_name '{qset_data.id_name}' already exists.")
    else:
        qset_data.id_name = f"custom-set-{uuid4().hex[:8]}"  # Tự sinh nếu không cung cấp

    # Nếu bộ mới được đặt là mặc định chung, bỏ mặc định của các bộ khác
    if qset_data.is_default_general:
        await question_set_collection.update_many(
            {"is_default_general": True, "field_type": "none"},
            {"$set": {"is_default_general": False, "updated_at": datetime.now(timezone.utc)}}
        )

    new_qset_doc_data = qset_data.model_dump()
    new_qset_doc_data["created_at"] = datetime.now(timezone.utc)
    new_qset_doc_data["updated_at"] = datetime.now(timezone.utc)
    validated_qset = QuestionSetInDB(**new_qset_doc_data, _id=ObjectId())

    await question_set_collection.insert_one(validated_qset.model_dump(by_alias=True))

    created_doc = await question_set_collection.find_one({"id_name": validated_qset.id_name})
    if not created_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create and retrieve question set.")
    return QuestionSetPublic(**QuestionSetInDB(**created_doc).model_dump())


@router.get("", response_model=List[QuestionSetPublic])
async def get_all_question_sets(db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    qsets_cursor = question_set_collection.find()
    qsets_list = []
    async for qset_doc in qsets_cursor:
        qsets_list.append(QuestionSetPublic(**QuestionSetInDB(**qset_doc).model_dump()))
    return qsets_list


@router.put("/{id_name}", response_model=QuestionSetPublic)
async def update_question_set(id_name: str, qset_update_data: QuestionSetUpdate,
                              db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")

    existing_qset_doc = await question_set_collection.find_one({"id_name": id_name})
    if not existing_qset_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question set '{id_name}' not found.")

    existing_qset = QuestionSetInDB(**existing_qset_doc)

    update_data_dict = qset_update_data.model_dump(exclude_unset=True)
    if not update_data_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    # Kiểm tra logic cho is_default_general và field_type khi cập nhật
    final_field_type = update_data_dict.get("field_type", existing_qset.field_type)
    final_is_default = update_data_dict.get("is_default_general", existing_qset.is_default_general)

    if final_is_default and final_field_type != "none":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot set as default general: field_type must be 'none'.")

    # Nếu bộ này được cập nhật thành mặc định chung, bỏ mặc định của các bộ khác
    if final_is_default and (
            not existing_qset.is_default_general or update_data_dict.get("is_default_general") == True):
        # Điều kiện (not existing_qset.is_default_general ... ) để đảm bảo update_many chỉ chạy khi có sự thay đổi is_default_general thành True
        await question_set_collection.update_many(
            {"id_name": {"$ne": id_name}, "is_default_general": True, "field_type": "none"},  # không phải chính nó
            {"$set": {"is_default_general": False, "updated_at": datetime.now(timezone.utc)}}
        )
        # Đảm bảo bộ hiện tại được set đúng
        update_data_dict["is_default_general"] = True
        update_data_dict["field_type"] = "none"  # Force field_type to 'none' if set as default general

    update_data_dict["updated_at"] = datetime.now(timezone.utc)
    if "questions" in update_data_dict and update_data_dict["questions"] is not None:
        update_data_dict["questions"] = [Question(**q).model_dump() if isinstance(q, dict) else q.model_dump() for q in
                                         update_data_dict["questions"]]

    result = await question_set_collection.update_one({"id_name": id_name}, {"$set": update_data_dict})

    # if result.matched_count == 0: # Đã kiểm tra ở trên bằng find_one
    #     raise HTTPException(status_code=404, detail=f"Question set '{id_name}' not found.")
    if result.modified_count == 0 and not (
            len(update_data_dict) == 1 and "updated_at" in update_data_dict):  # If only updated_at changed, it's fine
        # Kiểm tra xem có thực sự update gì không (ngoại trừ updated_at)
        pass  # Có thể không có gì thay đổi ngoại trừ updated_at

    updated_doc = await question_set_collection.find_one({"id_name": id_name})
    if not updated_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Updated question set not found after update operation.")
    return QuestionSetPublic(**QuestionSetInDB(**updated_doc).model_dump())


# DELETE
@router.delete("/{id_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question_set(id_name: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")

    qset_to_delete = await question_set_collection.find_one({"id_name": id_name})
    if not qset_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question set '{id_name}' not found.")

    # Kiểm tra xem bộ này có phải là default general duy nhất không
    if qset_to_delete.get("is_default_general", False) and qset_to_delete.get("field_type") == "none":
        count_default_general = await question_set_collection.count_documents(
            {"is_default_general": True, "field_type": "none"})
        if count_default_general <= 1:  # Nếu đây là bộ duy nhất hoặc là một trong số ít (nên là 1)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Cannot delete the only default general question set. Please set another question set as default general first.")

    delete_result = await question_set_collection.delete_one({"id_name": id_name})
    if delete_result.deleted_count == 0:
        # Trường hợp này gần như không xảy ra nếu find_one ở trên thành công
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Question set '{id_name}' not found (delete operation failed).")

    return None  # No content response

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

@router.post("/{id_name}/set-default-general", response_model=QuestionSetPublic, status_code=status.HTTP_200_OK)
async def set_as_default_general_question_set(id_name: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")

    qset_to_set_default = await question_set_collection.find_one({"id_name": id_name})
    if not qset_to_set_default:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question set '{id_name}' not found.")

    current_qset_model = QuestionSetInDB(**qset_to_set_default)
    if current_qset_model.field_type != "none":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Only question sets with field_type 'none' can be set as default general.")

    if current_qset_model.is_default_general:
        # Đã là mặc định rồi, không cần làm gì, trả về luôn
        return QuestionSetPublic(**current_qset_model.model_dump())

    # Bỏ cờ default của các bộ "none" khác
    await question_set_collection.update_many(
        {"is_default_general": True, "field_type": "none"},  # Chỉ ảnh hưởng các bộ general khác
        {"$set": {"is_default_general": False, "updated_at": datetime.now(timezone.utc)}}
    )

    # Đặt bộ hiện tại làm mặc định
    await question_set_collection.update_one(
        {"id_name": id_name},
        {"$set": {"is_default_general": True, "updated_at": datetime.now(timezone.utc)}}
    )

    updated_doc = await question_set_collection.find_one({"id_name": id_name})  # Lấy lại để đảm bảo
    if not updated_doc:  # Should not happen
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to retrieve question set after setting as default.")

    return QuestionSetPublic(**QuestionSetInDB(**updated_doc).model_dump())
