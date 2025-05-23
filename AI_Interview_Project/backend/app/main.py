from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import google.generativeai as genai

from .config import settings
from .db import connect_to_mongo, close_mongo_connection, get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from .models import QuestionSetInDB, Question, DefaultQuestionSetSettings
from .sample_data import (
    INITIAL_DEFAULT_GENERAL_QSET_ID, SAMPLE_GENERAL_QUESTIONS,
    INITIAL_DEFAULT_DEVELOPER_QSET_ID, SAMPLE_DEVELOPER_QUESTIONS,
    INITIAL_DEFAULT_DESIGNER_QSET_ID, SAMPLE_DESIGNER_QUESTIONS
)

from .routers import admin_auth, candidate_routes, admin_question_sets_routes, admin_interviews_routes
from . import globals as app_globals

DEFAULT_SETTINGS_ID = "default_question_set_config"


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application starting up...")
    await connect_to_mongo()
    db_instance = get_database()

    if db_instance is None:
        print("CRITICAL: Database connection failed at startup. Application might not work as expected.")
    else:
        if not settings.GOOGLE_AI_API_KEY:
            print("FATAL ERROR: GOOGLE_AI_API_KEY is not set. AI features will be disabled.")
            app_globals.gemini_model = None
        else:
            try:
                genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
                print("Successfully configured Google Generative AI API Key.")
                selected_model_name = 'gemini-1.5-flash-latest'
                app_globals.gemini_model = genai.GenerativeModel(model_name=selected_model_name)
                print(f"Using Google Gemini model: {app_globals.gemini_model.model_name}")
            except Exception as e:
                print(f"ERROR configuring Google Generative AI or initializing model: {str(e)}")
                app_globals.gemini_model = None

        await initial_data_setup(db_instance)
        await initialize_default_qset_config(db_instance)

    print("Application startup complete.")
    yield
    print("Application shutting down...")
    await close_mongo_connection()
    print("Application shutdown complete.")


app = FastAPI(
    title="AI Interview API - Refactored",
    description="API with DB integration, admin authentication, and refactored routers.",
    version="0.5.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-interview-silk-one.vercel.app/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def initial_data_setup(db_instance: AsyncIOMotorDatabase):
    if db_instance is None:
        print("Skipping initial question set data setup as DB connection is not available.")
        return

    question_set_collection = db_instance.get_collection("question_sets")

    async def create_set_if_not_exists(id_name, name, questions_list, field_type_val):
        existing_set = await question_set_collection.find_one({"id_name": id_name})
        if not existing_set:
            print(f"Initializing question set '{id_name}' ({field_type_val}) in DB.")
            questions_for_db = [q.model_dump() for q in questions_list]

            # Prepare data for QuestionSetInDB, ensuring is_default_general is not included
            new_set_data_dict = {
                "id_name": id_name,
                "name": name,
                "questions": questions_for_db,
                "field_type": field_type_val,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            # Ensure all required fields for QuestionSetInDB are present
            # (field_type is already included)
            new_set_data = QuestionSetInDB(**new_set_data_dict)

            await question_set_collection.insert_one(new_set_data.model_dump(by_alias=True))
            print(f"Question set '{id_name}' initialized.")
        else:
            print(f"Question set '{id_name}' already exists.")
            # If old data has is_default_general, remove it
            if 'is_default_general' in existing_set:
                await question_set_collection.update_one(
                    {"id_name": id_name},
                    {"$unset": {"is_default_general": ""}, "$set": {"updated_at": datetime.now(timezone.utc)}}
                )
                print(f"Removed 'is_default_general' field from existing set '{id_name}'.")

    await create_set_if_not_exists(
        INITIAL_DEFAULT_GENERAL_QSET_ID,
        "Bộ câu hỏi Chung và Kỹ năng mềm (Mặc định ban đầu)",
        SAMPLE_GENERAL_QUESTIONS,
        "none"
    )
    await create_set_if_not_exists(
        INITIAL_DEFAULT_DEVELOPER_QSET_ID,
        "Bộ câu hỏi chuyên môn Developer (Mẫu ban đầu)",
        SAMPLE_DEVELOPER_QUESTIONS,
        "developer"
    )
    await create_set_if_not_exists(
        INITIAL_DEFAULT_DESIGNER_QSET_ID,
        "Bộ câu hỏi chuyên môn Designer (Mẫu ban đầu)",
        SAMPLE_DESIGNER_QUESTIONS,
        "designer"
    )


async def initialize_default_qset_config(db_instance: AsyncIOMotorDatabase):
    if db_instance is None:
        print("Skipping default question set config initialization as DB connection is not available.")
        return

    settings_collection = db_instance.get_collection("settings")
    existing_config = await settings_collection.find_one({"_id": DEFAULT_SETTINGS_ID})

    if not existing_config:
        print(f"Initializing default question set configuration document with ID: {DEFAULT_SETTINGS_ID}")
        # Ensure the initial default qsets exist before setting them in config
        qset_collection = db_instance.get_collection("question_sets")

        general_exists = await qset_collection.find_one(
            {"id_name": INITIAL_DEFAULT_GENERAL_QSET_ID, "field_type": "none"})
        dev_exists = await qset_collection.find_one(
            {"id_name": INITIAL_DEFAULT_DEVELOPER_QSET_ID, "field_type": "developer"})
        design_exists = await qset_collection.find_one(
            {"id_name": INITIAL_DEFAULT_DESIGNER_QSET_ID, "field_type": "designer"})

        initial_config_data = {
            "_id": DEFAULT_SETTINGS_ID,  # Ensure _id is set correctly
            "default_general_qset_id_name": INITIAL_DEFAULT_GENERAL_QSET_ID if general_exists else None,
            "default_developer_qset_id_name": INITIAL_DEFAULT_DEVELOPER_QSET_ID if dev_exists else None,
            "default_designer_qset_id_name": INITIAL_DEFAULT_DESIGNER_QSET_ID if design_exists else None,
            "updated_at": datetime.now(timezone.utc)
        }
        initial_config = DefaultQuestionSetSettings(**initial_config_data)

        await settings_collection.insert_one(initial_config.model_dump(by_alias=True))  # by_alias=True to use '_id'
        print("Default question set configuration initialized.")
        if not general_exists:
            print(
                f"Warning: Initial default general question set '{INITIAL_DEFAULT_GENERAL_QSET_ID}' not found. Set to None in config.")
        if not dev_exists:
            print(
                f"Warning: Initial default developer question set '{INITIAL_DEFAULT_DEVELOPER_QSET_ID}' not found. Set to None in config.")
        if not design_exists:
            print(
                f"Warning: Initial default designer question set '{INITIAL_DEFAULT_DESIGNER_QSET_ID}' not found. Set to None in config.")

    else:
        print("Default question set configuration already exists.")


API_V1_PREFIX = "/api/v1"

app.include_router(admin_auth.router, prefix=f"{API_V1_PREFIX}/admin/auth", tags=["Admin Authentication"])
app.include_router(candidate_routes.router, prefix=API_V1_PREFIX,
                   tags=["Candidate Experience"])
app.include_router(admin_question_sets_routes.router,
                   prefix=API_V1_PREFIX)
app.include_router(admin_interviews_routes.router,
                   prefix=API_V1_PREFIX)


@app.get("/")
async def root():
    return {"message": "AI Interview API is running!"}