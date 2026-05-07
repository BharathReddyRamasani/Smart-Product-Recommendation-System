"""Auth routes: signup, login, token validation."""
from fastapi import APIRouter, HTTPException, Depends
from pymongo.database import Database
from app.utils.database import get_db, mongo_id
from app.utils.auth import hash_password, verify_password, create_access_token
from app.schemas.schemas import SignupRequest, LoginRequest, AuthResponse
from app.utils.logger import get_logger
from datetime import datetime

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(data: SignupRequest, db: Database = Depends(get_db)):
    """Create a new account. Returns JWT token immediately."""
    if db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "age": data.age,
        "location": data.location,
        "created_at": datetime.utcnow(),
    }
    result = db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_access_token(user_id)
    logger.info(f"New user registered: {data.email} (id={user_id})")
    return AuthResponse(token=token, user_id=user_id, name=data.name, email=data.email)


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Database = Depends(get_db)):
    """Authenticate with email/password. Returns JWT token."""
    user = db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token(user_id)
    logger.info(f"User logged in: {data.email}")
    return AuthResponse(token=token, user_id=user_id, name=user["name"], email=user["email"])
