from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from database import get_database
from routes.users import get_current_user
from models import MessageCreate
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("/")
async def send_message(message: MessageCreate, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Validate that either recipient_id or group_id is provided
    if not message.recipient_id and not message.group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either recipient_id or group_id must be provided"
        )
    
    # Create message
    message_data = {
        "sender_id": current_user,
        "recipient_id": message.recipient_id,
        "group_id": message.group_id,
        "content": message.content,
        "timestamp": datetime.utcnow(),
        "status": "sent"
    }
    
    result = await db.messages.insert_one(message_data)
    
    return {
        "id": str(result.inserted_id),
        "sender_id": current_user,
        "recipient_id": message.recipient_id,
        "group_id": message.group_id,
        "content": message.content,
        "timestamp": message_data["timestamp"].isoformat(),
        "status": "sent"
    }

@router.get("/conversation/{other_user_id}")
async def get_conversation(
    other_user_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    db = get_database()
    
    # Build query
    query = {
        "$or": [
            {"sender_id": current_user, "recipient_id": other_user_id},
            {"sender_id": other_user_id, "recipient_id": current_user}
        ]
    }
    
    if before:
        try:
            query["_id"] = {"$lt": ObjectId(before)}
        except:
            pass
    
    # Get messages
    messages = await db.messages.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Format response
    result = []
    for msg in reversed(messages):
        result.append({
            "id": str(msg["_id"]),
            "sender_id": msg["sender_id"],
            "recipient_id": msg.get("recipient_id"),
            "content": msg["content"],
            "timestamp": msg["timestamp"].isoformat(),
            "status": msg.get("status", "sent")
        })
    
    return result

@router.get("/group/{group_id}")
async def get_group_messages(
    group_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    db = get_database()
    
    # Verify user is member of group
    try:
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if not group or current_user not in group.get("members", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )
    
    # Build query
    query = {"group_id": group_id}
    
    if before:
        try:
            query["_id"] = {"$lt": ObjectId(before)}
        except:
            pass
    
    # Get messages
    messages = await db.messages.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Format response
    result = []
    for msg in reversed(messages):
        # Get sender info
        sender = await db.users.find_one({"_id": ObjectId(msg["sender_id"])})
        result.append({
            "id": str(msg["_id"]),
            "sender_id": msg["sender_id"],
            "sender_username": sender["username"] if sender else "Unknown",
            "group_id": msg.get("group_id"),
            "content": msg["content"],
            "timestamp": msg["timestamp"].isoformat(),
            "status": msg.get("status", "sent")
        })
    
    return result

@router.put("/{message_id}/status")
async def update_message_status(
    message_id: str,
    status_value: str,
    current_user: str = Depends(get_current_user)
):
    db = get_database()
    
    if status_value not in ["sent", "delivered", "read"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status value"
        )
    
    # Update message status
    try:
        result = await db.messages.update_one(
            {"_id": ObjectId(message_id), "recipient_id": current_user},
            {"$set": {"status": status_value}}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return {"message": "Status updated"}
