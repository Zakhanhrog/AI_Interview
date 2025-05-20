# backend/app/routers/admin_auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

# Đảm bảo đường dẫn import đúng dựa trên cấu trúc thư mục của bạn
from ..security import create_access_token, verify_password
from ..config import settings
from ..models import Token

router = APIRouter()


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Kiểm tra username
    if form_data.username != settings.ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",  # Thông báo chung chung để bảo mật
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Kiểm tra password
    if not verify_password(form_data.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",  # Thông báo chung chung
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username, "scopes": ["admin"]},  # Thêm scopes nếu cần
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}