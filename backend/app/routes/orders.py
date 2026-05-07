"""
Orders routes — PROTECTED (JWT required).

Checkout flow (place order):
  1. Fetch user's cart — error if empty
  2. Create order document in 'orders' collection
  3. Log 'purchase' interaction for every cart item
  4. Clear the cart
  → Atomic behavior: all steps complete or none
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pymongo.database import Database
from datetime import datetime
from app.utils.database import get_db, mongo_id
from app.utils.auth import get_current_user_id
from app.schemas.schemas import OrderResponse, OrderItem
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])


def _order_from_doc(doc: dict) -> OrderResponse:
    d = mongo_id(dict(doc))
    d["items"] = [OrderItem(**i) for i in d.get("items", [])]
    return OrderResponse(**d)


@router.post("/place", response_model=OrderResponse, status_code=201)
def place_order(
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """
    Checkout: converts cart → order.

    Steps (all-or-nothing):
    1. Validate cart is not empty
    2. Snapshot product prices from DB (prevent stale cart prices)
    3. Create order in 'orders' collection
    4. Log 'purchase' interaction for each cart item
    5. Clear cart
    """
    cart = db.cart.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty — nothing to checkout")

    cart_items = cart["items"]
    order_items = []
    purchase_interactions = []

    for ci in cart_items:
        # Re-fetch current price from DB to prevent stale cart prices
        pid = ci["product_id"]
        try:
            product = db.products.find_one({"_id": ObjectId(pid)})
        except Exception:
            product = None

        current_price = product["price"] if product else ci["price"]
        order_items.append({
            "product_id": pid,
            "product_name": ci["product_name"],
            "category": ci.get("category", ""),
            "price": current_price,
            "quantity": ci["quantity"],
            "image_url": ci.get("image_url"),
        })
        # Build purchase interactions
        for _ in range(ci["quantity"]):
            purchase_interactions.append({
                "user_id": user_id,
                "product_id": pid,
                "interaction_type": "purchase",
                "rating": None,
                "timestamp": datetime.utcnow(),
            })

    total = round(sum(i["price"] * i["quantity"] for i in order_items), 2)

    # Create order
    order_doc = {
        "user_id": user_id,
        "items": order_items,
        "total": total,
        "status": "placed",
        "created_at": datetime.utcnow(),
    }

    # Attempt atomic transaction (requires MongoDB Replica Set)
    try:
        with db.client.start_session() as session:
            with session.start_transaction():
                order_result = db.orders.insert_one(order_doc, session=session)
                if purchase_interactions:
                    db.interactions.insert_many(purchase_interactions, session=session)
                db.cart.update_one({"user_id": user_id}, {"$set": {"items": [], "updated_at": datetime.utcnow()}}, session=session)
    except Exception as e:
        logger.warning(f"Transaction failed or not supported (e.g. standalone Mongo). Falling back to sequential ops: {e}")
        # Fallback for standalone MongoDB
        order_result = db.orders.insert_one(order_doc)
        if purchase_interactions:
            db.interactions.insert_many(purchase_interactions)
        db.cart.update_one({"user_id": user_id}, {"$set": {"items": [], "updated_at": datetime.utcnow()}})

    # Push to ML engine for real-time updates (outside of DB transaction to avoid blocking)
    if purchase_interactions:
        from app.ml.engine import ml_engine
        for pi in purchase_interactions:
            ml_engine.add_interaction(
                user_id=pi["user_id"],
                product_id=pi["product_id"],
                interaction_type=pi["interaction_type"],
                rating=pi["rating"],
                timestamp=pi["timestamp"].isoformat(),
            )

    logger.info(
        f"Order placed: user={user_id} order={order_result.inserted_id} "
        f"items={len(order_items)} total=${total}"
    )
    order_doc["_id"] = order_result.inserted_id
    return _order_from_doc(order_doc)


@router.get("", response_model=list[OrderResponse])
def get_orders(
    skip: int = 0,
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """Return order history for the authenticated user, newest first."""
    docs = list(
        db.orders.find({"user_id": user_id})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    return [_order_from_doc(d) for d in docs]
