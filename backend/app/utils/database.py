"""
MongoDB connection management.
Provides a module-level database handle and dependency injector for FastAPI routes.
"""
import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from dotenv import load_dotenv
from app.utils.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "recommendation_db")

_client: MongoClient | None = None
_db: Database | None = None


def connect_to_mongo() -> Database:
    global _client, _db
    _client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    _db = _client[DB_NAME]

    # Create indexes for performance
    _db.users.create_index("email", unique=True)
    _db.interactions.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
    _db.interactions.create_index("product_id")
    _db.products.create_index("category")
    _db.products.create_index([("name", ASCENDING)])
    _db.cart.create_index("user_id", unique=True)
    _db.orders.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

    logger.info(f"Connected to MongoDB: {MONGODB_URL} / {DB_NAME}")
    return _db


def close_mongo():
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_db() -> Database:
    """FastAPI dependency: returns the active MongoDB database handle."""
    return _db


def mongo_id(doc: dict) -> dict:
    """Convert MongoDB _id (ObjectId) → 'id' string in a document dict copy."""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def mongo_ids(docs: list[dict]) -> list[dict]:
    """Apply mongo_id() to a list of documents."""
    return [mongo_id(d) for d in docs]
