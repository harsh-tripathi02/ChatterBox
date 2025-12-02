from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database import get_database
from routes.users import get_current_user
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("/request/{user_id}")
async def send_friend_request(user_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    if user_id == current_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request to yourself"
        )
    
    # Check if user exists
    try:
        target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if request already exists
    existing_request = await db.friend_requests.find_one({
        "$or": [
            {"from_user_id": current_user, "to_user_id": user_id},
            {"from_user_id": user_id, "to_user_id": current_user}
        ]
    })
    
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friend request already exists"
        )
    
    # Check if already friends
    existing_friendship = await db.friendships.find_one({
        "$or": [
            {"user1_id": current_user, "user2_id": user_id},
            {"user1_id": user_id, "user2_id": current_user}
        ]
    })
    
    if existing_friendship:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already friends"
        )
    
    # Create friend request
    request_data = {
        "from_user_id": current_user,
        "to_user_id": user_id,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.friend_requests.insert_one(request_data)
    
    return {
        "id": str(result.inserted_id),
        "message": "Friend request sent"
    }

@router.get("/requests")
async def get_friend_requests(current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Get pending requests sent to current user
    requests = await db.friend_requests.find({
        "to_user_id": current_user,
        "status": "pending"
    }).to_list(100)
    
    result = []
    for req in requests:
        # Get sender info
        sender = await db.users.find_one({"_id": ObjectId(req["from_user_id"])})
        if sender:
            result.append({
                "id": str(req["_id"]),
                "from_user": {
                    "id": str(sender["_id"]),
                    "username": sender["username"],
                    "email": sender["email"]
                },
                "created_at": req["created_at"].isoformat()
            })
    
    return result

@router.post("/requests/{request_id}/accept")
async def accept_friend_request(request_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Find request
    try:
        request = await db.friend_requests.find_one({
            "_id": ObjectId(request_id),
            "to_user_id": current_user,
            "status": "pending"
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    # Update request status
    await db.friend_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "accepted"}}
    )
    
    # Create friendship
    friendship_data = {
        "user1_id": request["from_user_id"],
        "user2_id": current_user,
        "created_at": datetime.utcnow()
    }
    
    await db.friendships.insert_one(friendship_data)
    
    return {"message": "Friend request accepted"}

@router.post("/requests/{request_id}/reject")
async def reject_friend_request(request_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Find request
    try:
        request = await db.friend_requests.find_one({
            "_id": ObjectId(request_id),
            "to_user_id": current_user,
            "status": "pending"
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    # Update request status
    await db.friend_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "rejected"}}
    )
    
    return {"message": "Friend request rejected"}

@router.get("/")
async def get_friends(current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Get all friendships
    friendships = await db.friendships.find({
        "$or": [
            {"user1_id": current_user},
            {"user2_id": current_user}
        ]
    }).to_list(1000)
    
    result = []
    for friendship in friendships:
        # Get the other user's ID
        friend_id = friendship["user2_id"] if friendship["user1_id"] == current_user else friendship["user1_id"]
        
        # Get friend info
        friend = await db.users.find_one({"_id": ObjectId(friend_id)})
        if friend:
            result.append({
                "id": str(friend["_id"]),
                "username": friend["username"],
                "email": friend["email"]
            })
    
    return result

@router.delete("/{friend_id}")
async def remove_friend(friend_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Delete friendship
    result = await db.friendships.delete_one({
        "$or": [
            {"user1_id": current_user, "user2_id": friend_id},
            {"user1_id": friend_id, "user2_id": current_user}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friendship not found"
        )
    
    return {"message": "Friend removed"}
