from fastapi import APIRouter, HTTPException, status
from models import UserCreate, UserLogin, Token, User
from database import get_database
from auth_utils import verify_password, get_password_hash, create_access_token
from datetime import timedelta

router = APIRouter()

@router.post("/signup", response_model=Token)
async def signup(user: UserCreate):
    db = get_database()
    
    # Validate input
    if len(user.username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters"
        )
    
    if len(user.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    # Check if user already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"username": user.username},
            {"email": user.email}
        ]
    })
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_dict = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "created_at": user_dict.get("created_at") if "created_at" in locals() else None
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user_id, "username": user.username}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/signin", response_model=Token)
async def signin(user: UserLogin):
    db = get_database()
    
    # Find user
    db_user = await db.users.find_one({"username": user.username})
    
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Create access token
    user_id = str(db_user["_id"])
    access_token = create_access_token(
        data={"sub": user_id, "username": db_user["username"]}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
