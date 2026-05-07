"""
Profile routes — protected, requires JWT.
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pymongo.database import Database
from app.utils.database import get_db, mongo_id
from app.utils.auth import get_current_user_id
from app.schemas.schemas import ProfileResponse, ProfileUpdateRequest
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=ProfileResponse)
def get_profile(
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ProfileResponse(**mongo_id(user))


@router.put("", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return ProfileResponse(**mongo_id(user))
