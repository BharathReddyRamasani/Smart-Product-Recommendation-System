"""
Pydantic v2 schemas for all request/response types.
"""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, EmailStr, field_validator


# ─── Auth ─────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    age: Optional[int] = Field(None, ge=13, le=120)
    location: Optional[str] = Field(None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str
    email: str


# ─── User / Profile ────────────────────────────────────────────────────────────

class ProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    age: Optional[int] = None
    location: Optional[str] = None
    created_at: datetime


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    age: Optional[int] = Field(None, ge=13, le=120)
    location: Optional[str] = Field(None, max_length=100)


# ─── Product ───────────────────────────────────────────────────────────────────

class ProductResponse(BaseModel):
    id: str
    name: str
    category: str
    price: float
    description: str
    features: List[str]
    brand: Optional[str] = None
    rating: float
    num_reviews: int = 0
    image_url: Optional[str] = None


class RecommendedProduct(BaseModel):
    id: str
    name: str
    category: str
    price: float
    description: str
    features: List[str]
    brand: Optional[str] = None
    rating: float
    num_reviews: int = 0
    image_url: Optional[str] = None
    score: float = Field(0.0, description="Recommendation score [0-1]")
    reason: str = Field("", description="Human-readable reason for recommendation")


# ─── Interaction ──────────────────────────────────────────────────────────────

InteractionType = Literal["view", "add_to_cart", "purchase"]


class InteractionCreate(BaseModel):
    product_id: str = Field(..., min_length=1)
    interaction_type: InteractionType
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)

    @field_validator("interaction_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ("view", "add_to_cart", "purchase"):
            raise ValueError("interaction_type must be view, add_to_cart, or purchase")
        return v


class InteractionResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    interaction_type: str
    rating: Optional[float] = None
    timestamp: datetime


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    price: float
    quantity: int
    image_url: Optional[str] = None


class CartResponse(BaseModel):
    user_id: str
    items: List[CartItem]
    total: float
    item_count: int


class AddToCartRequest(BaseModel):
    product_id: str
    quantity: int = Field(1, ge=1, le=50)


class UpdateCartRequest(BaseModel):
    quantity: int = Field(..., ge=1, le=50)


# ─── Order ────────────────────────────────────────────────────────────────────

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    price: float
    quantity: int
    image_url: Optional[str] = None


class OrderResponse(BaseModel):
    id: str
    user_id: str
    items: List[OrderItem]
    total: float
    status: str
    created_at: datetime


# ─── Recommendation Response ──────────────────────────────────────────────────

class RecommendationResponse(BaseModel):
    user_id: Optional[str] = None
    strategy: str
    is_personalized: bool
    recommendations: List[RecommendedProduct]
    total: int


class SimilarProductResponse(BaseModel):
    source_product_id: str
    source_product_name: str
    strategy: str
    recommendations: List[RecommendedProduct]
    total: int


# ─── Home Feed ────────────────────────────────────────────────────────────────

class HomeFeedResponse(BaseModel):
    is_personalized: bool
    user_name: str
    interaction_count: int
    main_section_title: str
    main_products: List[RecommendedProduct]
    recently_viewed: List[ProductResponse]
    secondary_section_title: str
    secondary_products: List[RecommendedProduct]


# ─── Metrics ─────────────────────────────────────────────────────────────────

class MetricsResponse(BaseModel):
    precision_at_k: float
    recall_at_k: float
    hit_rate: float
    k: int
    evaluated_users: int


# ─── Health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    total_users: int
    total_products: int
    total_interactions: int
    ml_engine_ready: bool
