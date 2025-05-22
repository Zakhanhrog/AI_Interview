from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from typing import Optional


class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = ""
    GOOGLE_AI_API_KEY: str
    MONGODB_URL: str
    DATABASE_NAME: str

    ADMIN_USERNAME: str
    ADMIN_PASSWORD_HASH: str

    ADMIN_EMAIL: Optional[str] = "18khanh.2003@gmail.com"
    ADMIN_FULL_NAME: Optional[str] = "Ngô Gia Khánh"
    ADMIN_NICKNAME: Optional[str] = "devfromzk"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = 'ignore'


@lru_cache()
def get_settings():
    print(f"Loading settings. Current working directory: {os.getcwd()}")
    return Settings()


settings = get_settings()