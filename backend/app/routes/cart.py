"""
Cart routes — PROTECTED (JWT required).

Cart is stored as one document per user in the 'cart' collection:
  { user_id, items: [{product_id, product_name, category, price, quantity}], updated_at }
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pymongo.database import Database
from datetime import datetime
from app.utils.database import get_db
from app.utils.auth import get_current_user_id
from app.schemas.schemas import CartResponse, CartItem, AddToCartRequest, UpdateCartRequest
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/cart", tags=["Cart"])


def _build_cart_response(cart_doc: dict | None, user_id: str) -> CartResponse:
    if not cart_doc:
        return CartResponse(user_id=user_id, items=[], total=0.0, item_count=0)
    items = [CartItem(**item) for item in cart_doc.get("items", [])]
    total = round(sum(i.price * i.quantity for i in items), 2)
    return CartResponse(user_id=user_id, items=items, total=total, item_count=len(items))


@router.get("", response_model=CartResponse)
def get_cart(
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """Return current cart contents for the authenticated user."""
    cart = db.cart.find_one({"user_id": user_id})
    return _build_cart_response(cart, user_id)


@router.post("/add", response_model=CartResponse, status_code=201)
def add_to_cart(
    data: AddToCartRequest,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """
    Add a product to the cart (or increase quantity if already there).
    Validates that product exists. Quantity is capped per-item at 50.
    """
    if not _valid_id(data.product_id):
        raise HTTPException(status_code=400, detail="Invalid product_id")
    product = db.products.find_one({"_id": ObjectId(data.product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    features = product.get("features", [])
    new_item = {
        "product_id": data.product_id,
        "product_name": product["name"],
        "category": product["category"],
        "price": product["price"],
        "quantity": data.quantity,
        "image_url": product.get("image_url"),
    }

    cart = db.cart.find_one({"user_id": user_id})
    if not cart:
        db.cart.insert_one({
            "user_id": user_id,
            "items": [new_item],
            "updated_at": datetime.utcnow(),
        })
    else:
        items = cart.get("items", [])
        for item in items:
            if item["product_id"] == data.product_id:
                item["quantity"] = min(item["quantity"] + data.quantity, 50)
                break
        else:
            items.append(new_item)
        db.cart.update_one(
            {"user_id": user_id},
            {"$set": {"items": items, "updated_at": datetime.utcnow()}},
        )

    logger.info(f"Cart add: user={user_id} product={data.product_id} qty={data.quantity}")
    
    # Log interaction
    timestamp = datetime.utcnow()
    db.interactions.insert_one({
        "user_id": user_id,
        "product_id": data.product_id,
        "interaction_type": "add_to_cart",
        "rating": None,
        "timestamp": timestamp,
    })
    
    from app.ml.engine import ml_engine
    ml_engine.add_interaction(
        user_id=user_id,
        product_id=data.product_id,
        interaction_type="add_to_cart",
        rating=None,
        timestamp=timestamp.isoformat()
    )

    cart = db.cart.find_one({"user_id": user_id})
    return _build_cart_response(cart, user_id)


@router.put("/{product_id}", response_model=CartResponse)
def update_cart_item(
    product_id: str,
    data: UpdateCartRequest,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """Update quantity of a specific item in the cart."""
    cart = db.cart.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart is empty")

    items = cart.get("items", [])
    found = False
    for item in items:
        if item["product_id"] == product_id:
            item["quantity"] = data.quantity
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Product not in cart")

    db.cart.update_one(
        {"user_id": user_id},
        {"$set": {"items": items, "updated_at": datetime.utcnow()}},
    )
    cart = db.cart.find_one({"user_id": user_id})
    return _build_cart_response(cart, user_id)


@router.delete("/{product_id}", response_model=CartResponse)
def remove_from_cart(
    product_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    """Remove a specific product from the cart."""
    cart = db.cart.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart is empty")

    items = [i for i in cart.get("items", []) if i["product_id"] != product_id]
    db.cart.update_one(
        {"user_id": user_id},
        {"$set": {"items": items, "updated_at": datetime.utcnow()}},
    )
    cart = db.cart.find_one({"user_id": user_id})
    return _build_cart_response(cart, user_id)


def _valid_id(oid: str) -> bool:
    try:
        ObjectId(oid)
        return True
    except Exception:
        return False
