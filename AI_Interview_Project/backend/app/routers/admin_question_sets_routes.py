from fastapi import APIRouter, HTTPException, Depends, status, Body
from typing import List, Optional
from uuid import uuid4
from datetime import datetime, timezone
from bson import ObjectId

from ..db import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models import (
    QuestionSetCreate, QuestionSetPublic, QuestionSetUpdate,
    QuestionSetInDB, Question, DefaultQuestionSetSettings
)
from ..security import get_current_admin_user

router = APIRouter(
    prefix="/admin/question-sets",
    tags=["Admin - Question Sets"],
    dependencies=[Depends(get_current_admin_user)]
)

DEFAULT_SETTINGS_ID = "default_question_set_config"


@router.post("", response_model=QuestionSetPublic, status_code=status.HTTP_201_CREATED)
async def create_question_set(qset_data: QuestionSetCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")

    if qset_data.id_name:
        existing_set = await question_set_collection.find_one({"id_name": qset_data.id_name})
        if existing_set:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Question set with id_name '{qset_data.id_name}' already exists.")
    else:
        qset_data.id_name = f"{qset_data.field_type}-{uuid4().hex[:6]}"

    new_qset_doc_data = qset_data.model_dump()
    new_qset_doc_data["created_at"] = datetime.now(timezone.utc)
    new_qset_doc_data["updated_at"] = datetime.now(timezone.utc)

    validated_qset_data = {k: v for k, v in new_qset_doc_data.items() if k in QuestionSetInDB.model_fields}
    validated_qset = QuestionSetInDB(**validated_qset_data, _id=ObjectId())

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
        if 'is_default_general' in qset_doc:
            del qset_doc['is_default_general']
        qsets_list.append(QuestionSetPublic(**QuestionSetInDB(**qset_doc).model_dump()))
    return qsets_list


@router.get("/default-config", response_model=DefaultQuestionSetSettings)
async def get_default_question_set_config(db: AsyncIOMotorDatabase = Depends(get_database)):
    settings_collection = db.get_collection("settings")
    config_doc = await settings_collection.find_one({"_id": DEFAULT_SETTINGS_ID})
    if not config_doc:
        default_config = DefaultQuestionSetSettings(_id=DEFAULT_SETTINGS_ID)
        await settings_collection.insert_one(default_config.model_dump(by_alias=True))
        return default_config
    return DefaultQuestionSetSettings(**config_doc)


@router.put("/default-config", response_model=DefaultQuestionSetSettings)
async def update_default_question_set_config(
        config_update: DefaultQuestionSetSettings = Body(...),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    settings_collection = db.get_collection("settings")
    question_set_collection = db.get_collection("question_sets")

    update_data = config_update.model_dump(exclude_unset=True, exclude={"id", "_id"})
    update_data["updated_at"] = datetime.now(timezone.utc)

    if "default_general_qset_id_name" in update_data and update_data["default_general_qset_id_name"]:
        qset = await question_set_collection.find_one({"id_name": update_data["default_general_qset_id_name"]})
        if not qset or qset.get("field_type") != "none":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid default_general_qset_id_name: '{update_data['default_general_qset_id_name']}' not found or not a 'none' type.")

    if "default_developer_qset_id_name" in update_data and update_data["default_developer_qset_id_name"]:
        qset = await question_set_collection.find_one({"id_name": update_data["default_developer_qset_id_name"]})
        if not qset or qset.get("field_type") != "developer":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid default_developer_qset_id_name: '{update_data['default_developer_qset_id_name']}' not found or not a 'developer' type.")

    if "default_designer_qset_id_name" in update_data and update_data["default_designer_qset_id_name"]:
        qset = await question_set_collection.find_one({"id_name": update_data["default_designer_qset_id_name"]})
        if not qset or qset.get("field_type") != "designer":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Invalid default_designer_qset_id_name: '{update_data['default_designer_qset_id_name']}' not found or not a 'designer' type.")

    result = await settings_collection.update_one(
        {"_id": DEFAULT_SETTINGS_ID},
        {"$set": update_data},
        upsert=True
    )

    updated_config_doc = await settings_collection.find_one({"_id": DEFAULT_SETTINGS_ID})
    if not updated_config_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update or retrieve default question set configuration.")
    return DefaultQuestionSetSettings(**updated_config_doc)


@router.get("/{id_name}", response_model=QuestionSetPublic)
async def get_question_set_by_id_name(id_name: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    qset_doc = await question_set_collection.find_one({"id_name": id_name})
    if not qset_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question set '{id_name}' not found.")
    if 'is_default_general' in qset_doc:
        del qset_doc['is_default_general']
    return QuestionSetPublic(**QuestionSetInDB(**qset_doc).model_dump())


@router.put("/{id_name}", response_model=QuestionSetPublic)
async def update_question_set_endpoint(id_name: str, qset_update_data: QuestionSetUpdate,
                                       db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")

    existing_qset_doc = await question_set_collection.find_one({"id_name": id_name})
    if not existing_qset_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question set '{id_name}' not found.")

    update_data_dict = qset_update_data.model_dump(exclude_unset=True)
    if not update_data_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    update_data_dict["updated_at"] = datetime.now(timezone.utc)
    if "questions" in update_data_dict and update_data_dict["questions"] is not None:
        update_data_dict["questions"] = [Question(**q).model_dump() if isinstance(q, dict) else q.model_dump() for q in
                                         update_data_dict["questions"]]

    result = await question_set_collection.update_one({"id_name": id_name}, {"$set": update_data_dict})

    if result.modified_count == 0 and not (len(update_data_dict) == 1 and "updated_at" in update_data_dict):
        pass

    updated_doc = await question_set_collection.find_one({"id_name": id_name})
    if not updated_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Updated question set not found after update operation.")
    if 'is_default_general' in updated_doc:
        del updated_doc['is_default_general']
    return QuestionSetPublic(**QuestionSetInDB(**updated_doc).model_dump())


@router.delete("/{id_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question_set(id_name: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    question_set_collection = db.get_collection("question_sets")
    settings_collection = db.get_collection("settings")

    qset_to_delete = await question_set_collection.find_one({"id_name": id_name})
    if not qset_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question set '{id_name}' not found.")

    default_config_doc = await settings_collection.find_one({"_id": DEFAULT_SETTINGS_ID})
    if default_config_doc:
        if default_config_doc.get("default_general_qset_id_name") == id_name or \
                default_config_doc.get("default_developer_qset_id_name") == id_name or \
                default_config_doc.get("default_designer_qset_id_name") == id_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Cannot delete question set '{id_name}' as it is currently set as a default. Please change the default configuration first.")

    delete_result = await question_set_collection.delete_one({"id_name": id_name})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Question set '{id_name}' not found (delete operation failed).")

    return None