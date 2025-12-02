from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: Optional[str] = Field(alias="_id")
    username: str
    email: EmailStr
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class Token(BaseModel):
    access_token: str
    token_type: str

class FriendRequest(BaseModel):
    from_user_id: str
    to_user_id: str
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: Optional[str] = Field(alias="_id")
    sender_id: str
    recipient_id: Optional[str] = None
    group_id: Optional[str] = None
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "sent"  # sent, delivered, read
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class MessageCreate(BaseModel):
    recipient_id: Optional[str] = None
    group_id: Optional[str] = None
    content: str

class Group(BaseModel):
    id: Optional[str] = Field(alias="_id")
    name: str
    created_by: str
    members: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    members: List[str] = []
