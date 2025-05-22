from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Optional

from ..security import create_access_token, verify_password, get_current_admin_user
from ..config import settings
from ..models import Token, AdminUser, AdminUserInDB

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username != settings.ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username, "scopes": ["admin"]},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=AdminUser)
async def read_users_me(current_admin_username: str = Depends(get_current_admin_user)):
    if current_admin_username == settings.ADMIN_USERNAME:
        admin_data = {
            "username": settings.ADMIN_USERNAME,
            "email": settings.ADMIN_EMAIL,
            "full_name": settings.ADMIN_FULL_NAME,
            "nickname": settings.ADMIN_NICKNAME,
        }
        return AdminUser(**admin_data)

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Could not validate credentials for current user")
