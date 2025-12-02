from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from database import get_database
from auth_utils import decode_token
from models import User

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
    users = await db.users.find({
        "$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}}
        ],
        "_id": {"$ne": current_user}
    }).limit(20).to_list(20)
    
    # Format response
    result = []
    for user in users:
        result.append({
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"]
        })
    
    return result

@router.get("/me")
async def get_current_user_info(current_user: str = Depends(get_current_user)):
    db = get_database()
    from bson import ObjectId
    
    user = await db.users.find_one({"_id": ObjectId(current_user)})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"]
    }

@router.get("/{user_id}")
async def get_user(user_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    from bson import ObjectId
    
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
        "email": user["email"]
    }
