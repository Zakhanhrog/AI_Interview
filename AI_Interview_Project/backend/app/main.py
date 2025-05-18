# backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import google.generativeai as genai  # Vẫn cần genai ở đây để configure

from .config import settings
from .db import connect_to_mongo, close_mongo_connection, get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from .models import QuestionSetInDB, Question  # Cần Question cho initial_data_setup
from .sample_data import (
    DEFAULT_GENERAL_QSET_ID, SAMPLE_GENERAL_QUESTIONS,
    DEFAULT_DEVELOPER_QSET_ID, SAMPLE_DEVELOPER_QUESTIONS,
    DEFAULT_DESIGNER_QSET_ID, SAMPLE_DESIGNER_QUESTIONS
)


# Import các router
from .routers import admin_auth, candidate_routes, admin_question_sets_routes, admin_interviews_routes
from . import globals as app_globals  # Để set gemini_model


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
                # Gán model vào biến toàn cục đã tạo
                app_globals.gemini_model = genai.GenerativeModel(model_name=selected_model_name)
                print(f"Using Google Gemini model: {app_globals.gemini_model.model_name}")
            except Exception as e:
                print(f"ERROR configuring Google Generative AI or initializing model: {str(e)}")
                app_globals.gemini_model = None

        # Khởi tạo dữ liệu mẫu chỉ khi DB và model (hoặc ít nhất là DB) đã sẵn sàng
        await initial_data_setup(db_instance)

    print("Application startup complete.")
    yield
    print("Application shutting down...")
    await close_mongo_connection()
    print("Application shutdown complete.")


app = FastAPI(
    title="AI Interview API - Refactored",
    description="API with DB integration, admin authentication, and refactored routers.",
    version="0.4.0",  # Tăng version
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def initial_data_setup(db_instance: AsyncIOMotorDatabase):
    if db_instance is None:
        print("Skipping initial data setup as DB connection is not available.")
        return

    question_set_collection = db_instance.get_collection("question_sets")

    async def create_set_if_not_exists(id_name, name, questions_list, field_type_val, is_default=False):
        existing_set = await question_set_collection.find_one({"id_name": id_name})
        if not existing_set:
            print(f"Initializing question set '{id_name}' ({field_type_val}) in DB.")
            # Chuyển đổi Pydantic Question models thành dicts trước khi lưu
            questions_for_db = [q.model_dump() for q in questions_list]
            new_set_data = QuestionSetInDB(
                id_name=id_name,
                name=name,
                questions=questions_for_db, # Đảm bảo questions_for_db là list của dicts
                field_type=field_type_val,
                is_default_general=is_default,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            await question_set_collection.insert_one(new_set_data.model_dump(by_alias=True))
            print(f"Question set '{id_name}' initialized.")
        else:
            print(f"Question set '{id_name}' already exists.")
            # Optionally, update existing default set if needed
            if is_default and not existing_set.get('is_default_general'):
                 await question_set_collection.update_one(
                     {"id_name": id_name},
                     {"$set": {"is_default_general": True, "updated_at": datetime.now(timezone.utc)}}
                 )
                 print(f"Marked '{id_name}' as default general set.")


    await create_set_if_not_exists(
        DEFAULT_GENERAL_QSET_ID,
        "Bộ câu hỏi Chung và Kỹ năng mềm (Mặc định)",
        SAMPLE_GENERAL_QUESTIONS,
        "none", # field_type cho bộ chung
        is_default=True
    )
    await create_set_if_not_exists(
        DEFAULT_DEVELOPER_QSET_ID,
        "Bộ câu hỏi chuyên môn Developer (Mẫu)",
        SAMPLE_DEVELOPER_QUESTIONS,
        "developer" # field_type
    )
    await create_set_if_not_exists(
        DEFAULT_DESIGNER_QSET_ID,
        "Bộ câu hỏi chuyên môn Designer (Mẫu)",
        SAMPLE_DESIGNER_QUESTIONS,
        "designer" # field_type
    )


# --- Include Routers ---
# Prefix /api/v1 sẽ áp dụng cho tất cả các router được include dưới đây
API_V1_PREFIX = "/api/v1"

app.include_router(admin_auth.router, prefix=f"{API_V1_PREFIX}/admin/auth", tags=["Admin Authentication"])
app.include_router(candidate_routes.router, prefix=API_V1_PREFIX,
                   tags=["Candidate Experience"])  # ví dụ: /api/v1/start-interview
app.include_router(admin_question_sets_routes.router,
                   prefix=API_V1_PREFIX)  # prefix="/admin/question-sets" đã có trong router
app.include_router(admin_interviews_routes.router,
                   prefix=API_V1_PREFIX)  # prefix="/admin/interviews" đã có trong router


# Endpoint gốc để kiểm tra server chạy
@app.get("/")
async def root():
    return {"message": "AI Interview API is running!"}