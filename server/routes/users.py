from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from database import get_database
from auth_utils import decode_token
from models import User
from pydantic import BaseModel
from bson import ObjectId


class UserUpdate(BaseModel):
    username: str | None = None
    avatar: str | None = None

router = APIRouter()
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        return user_id
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

@router.get("/search")
async def search_users(q: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    # Search by username or email
    try:
        exclude_id = ObjectId(current_user)
    except:
        exclude_id = current_user

    users = await db.users.find({
        "$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}}
        ],
        "_id": {"$ne": exclude_id}
    }).limit(20).to_list(20)
    
    # Format response
    result = []
    for user in users:
        result.append({
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "avatar": user.get("avatar")
        })
    
    return result

@router.get("/me")
async def get_current_user_info(current_user: str = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user)})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "avatar": user.get("avatar")
    }

@router.get("/{user_id}")
async def get_user(user_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "avatar": user.get("avatar")
    }


@router.patch('/me')
async def update_current_user(info: UserUpdate, current_user: str = Depends(get_current_user)):
    db = get_database()

    update_fields = {}
    if info.username:
        if len(info.username.strip()) < 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Username too short')
        update_fields['username'] = info.username.strip()
    if info.avatar is not None:
        update_fields['avatar'] = info.avatar

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No fields to update')

    result = await db.users.update_one({"_id": ObjectId(current_user)}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    user = await db.users.find_one({"_id": ObjectId(current_user)})
    return {"id": str(user["_id"]), "username": user["username"], "email": user["email"], "avatar": user.get('avatar')}
