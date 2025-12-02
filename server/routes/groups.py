from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database import get_database
from routes.users import get_current_user
from models import GroupCreate
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("/")
async def create_group(group: GroupCreate, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Validate group name
    if not group.name or len(group.name.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group name is required"
        )
    
    # Add creator to members if not already included
    members = list(set([current_user] + group.members))
    
    # Create group
    group_data = {
        "name": group.name.strip(),
        "created_by": current_user,
        "members": members,
        "created_at": datetime.utcnow()
    }
    
    result = await db.groups.insert_one(group_data)
    
    return {
        "id": str(result.inserted_id),
        "name": group_data["name"],
        "created_by": current_user,
        "members": members,
        "created_at": group_data["created_at"].isoformat()
    }

@router.get("/")
async def get_user_groups(current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Get all groups where user is a member
    groups = await db.groups.find({
        "members": current_user
    }).to_list(1000)
    
    result = []
    for group in groups:
        # Get member details
        members = []
        for member_id in group.get("members", []):
            member = await db.users.find_one({"_id": ObjectId(member_id)})
            if member:
                members.append({
                    "id": str(member["_id"]),
                    "username": member["username"]
                })
        
        result.append({
            "id": str(group["_id"]),
            "name": group["name"],
            "created_by": group["created_by"],
            "members": members,
            "created_at": group["created_at"].isoformat()
        })
    
    return result

@router.get("/{group_id}")
async def get_group(group_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    try:
        group = await db.groups.find_one({"_id": ObjectId(group_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Verify user is a member
    if current_user not in group.get("members", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )
    
    # Get member details
    members = []
    for member_id in group.get("members", []):
        member = await db.users.find_one({"_id": ObjectId(member_id)})
        if member:
            members.append({
                "id": str(member["_id"]),
                "username": member["username"],
                "email": member["email"]
            })
    
    return {
        "id": str(group["_id"]),
        "name": group["name"],
        "created_by": group["created_by"],
        "members": members,
        "created_at": group["created_at"].isoformat()
    }

@router.put("/{group_id}/name")
async def rename_group(
    group_id: str,
    new_name: str,
    current_user: str = Depends(get_current_user)
):
    db = get_database()
    
    if not new_name or len(new_name.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group name is required"
        )
    
    # Find group and verify user is member
    try:
        group = await db.groups.find_one({
            "_id": ObjectId(group_id),
            "members": current_user
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or you're not a member"
        )
    
    # Update group name
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": {"name": new_name.strip()}}
    )
    
    return {"message": "Group renamed successfully"}

@router.post("/{group_id}/members/{user_id}")
async def add_member(
    group_id: str,
    user_id: str,
    current_user: str = Depends(get_current_user)
):
    db = get_database()
    
    # Verify group exists and user is a member
    try:
        group = await db.groups.find_one({
            "_id": ObjectId(group_id),
            "members": current_user
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or you're not a member"
        )
    
    # Verify user to add exists
    try:
        user_to_add = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is already a member
    if user_id in group.get("members", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member"
        )
    
    # Add member
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$push": {"members": user_id}}
    )
    
    return {"message": "Member added successfully"}

@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    group_id: str,
    user_id: str,
    current_user: str = Depends(get_current_user)
):
    db = get_database()
    
    # Verify group exists and user is a member
    try:
        group = await db.groups.find_one({
            "_id": ObjectId(group_id),
            "members": current_user
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or you're not a member"
        )
    
    # Check if trying to remove self
    if user_id == current_user:
        # Allow leaving group
        await db.groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$pull": {"members": user_id}}
        )
        return {"message": "Left group successfully"}
    
    # Only group creator can remove others
    if group["created_by"] != current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can remove members"
        )
    
    # Remove member
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$pull": {"members": user_id}}
    )
    
    return {"message": "Member removed successfully"}
