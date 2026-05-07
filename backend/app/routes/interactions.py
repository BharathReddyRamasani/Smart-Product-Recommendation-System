"""
Interaction routes — PROTECTED (JWT required).

Rules enforced:
  - 'view'        : auto-triggered by frontend on product page load
  - 'add_to_cart' : triggered by "Add to Cart" button
  - 'purchase'    : triggered ONLY by checkout flow (called from orders service)

All interactions are persisted and drive the recommendation engine.
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pymongo.database import Database
from datetime import datetime
from app.utils.database import get_db, mongo_id
from app.utils.auth import get_current_user_id
from app.schemas.schemas import InteractionCreate, InteractionResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/interaction", tags=["Interactions"])


@router.post("", response_model=InteractionResponse, status_code=201)
def record_interaction(
    data: InteractionCreate,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """
    Record a user-product interaction event.

    Interaction types and when they fire:
    - 'view'        → auto on product page load
    - 'add_to_cart' → Add to Cart button
    - 'purchase'    → checkout completion (also called internally by orders route)
    """
    if not _is_valid_id(data.product_id):
        raise HTTPException(status_code=400, detail="Invalid product_id format")
    if not db.products.find_one({"_id": ObjectId(data.product_id)}):
        raise HTTPException(status_code=404, detail=f"Product {data.product_id} not found")

    doc = {
        "user_id": user_id,
        "product_id": data.product_id,
        "interaction_type": data.interaction_type,
        "rating": data.rating,
        "timestamp": datetime.utcnow(),
    }
    result = db.interactions.insert_one(doc)

    # Push to ML engine for real-time continuous learning updates
    from app.ml.engine import ml_engine
    ml_engine.add_interaction(
        user_id=user_id,
        product_id=data.product_id,
        interaction_type=data.interaction_type,
        rating=data.rating,
        timestamp=doc["timestamp"].isoformat(),
    )

    logger.info(f"Interaction: user={user_id} product={data.product_id} type={data.interaction_type}")
    return InteractionResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        product_id=data.product_id,
        interaction_type=data.interaction_type,
        rating=data.rating,
        timestamp=doc["timestamp"],
    )


@router.get("/user", response_model=list[InteractionResponse])
def get_my_interactions(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """Get recent interactions for the authenticated user."""
    docs = list(
        db.interactions.find({"user_id": user_id})
        .sort("timestamp", -1)
        .limit(limit)
    )
    return [
        InteractionResponse(
            id=str(d["_id"]),
            user_id=d["user_id"],
            product_id=d["product_id"],
            interaction_type=d["interaction_type"],
            rating=d.get("rating"),
            timestamp=d["timestamp"],
        )
        for d in docs
    ]


def _is_valid_id(oid: str) -> bool:
    try:
        ObjectId(oid)
        return True
    except Exception:
        return False
