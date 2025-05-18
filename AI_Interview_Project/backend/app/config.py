# backend/app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    GOOGLE_AI_API_KEY: str
    MONGODB_URL: str
    DATABASE_NAME: str

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = 'ignore'


@lru_cache()
def get_settings():
    print(f"Loading settings. Current working directory: {os.getcwd()}")
    return Settings()

settings = get_settings()