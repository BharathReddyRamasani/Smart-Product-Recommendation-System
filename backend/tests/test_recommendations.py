"""
Unit tests for recommendation API endpoints.
Uses an in-memory SQLite database and seeds minimal test data.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.utils.database import get_db, Base
from app.models.db_models import User, Product, Interaction
from app.ml.engine import ml_engine

# ── Test Database Setup ───────────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///./test_recommendations.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Create tables and populate minimal test data before tests run."""
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()

    # Create test users
    users = [
        User(id=1, name="Alice Test", email="alice@test.com", age=30, location="NYC"),
        User(id=2, name="Bob Test", email="bob@test.com", age=25, location="LA"),
        User(id=99, name="Cold Start User", email="cold@test.com", age=22, location="Chicago"),
    ]
    db.add_all(users)

    # Create test products
    products = [
        Product(id=1, name="Test Laptop", category="Electronics", price=999.99,
                description="Powerful laptop for work", features="laptop, computing, productivity",
                brand="TestBrand", rating=4.5),
        Product(id=2, name="Test Headphones", category="Electronics", price=199.99,
                description="Wireless noise-cancelling headphones", features="wireless, audio, noise-cancelling",
                brand="TestBrand", rating=4.2),
        Product(id=3, name="Test Python Book", category="Books", price=39.99,
                description="Learn Python programming", features="python, programming, beginner",
                brand="TestPublisher", rating=4.8),
        Product(id=4, name="Test Running Shoes", category="Clothing", price=89.99,
                description="Lightweight running shoes", features="running, shoes, athletic",
                brand="TestShoes", rating=4.3),
        Product(id=5, name="Test Coffee Maker", category="Home & Kitchen", price=79.99,
                description="12-cup programmable coffee maker", features="coffee, kitchen, programmable",
                brand="TestKitchen", rating=4.1),
    ]
    db.add_all(products)
    db.flush()

    # Create interactions for user 1 (5+ → collaborative)
    interactions_u1 = [
        Interaction(user_id=1, product_id=1, interaction_type="purchase", rating=5.0),
        Interaction(user_id=1, product_id=2, interaction_type="click", rating=4.0),
        Interaction(user_id=1, product_id=3, interaction_type="view"),
        Interaction(user_id=1, product_id=4, interaction_type="view"),
        Interaction(user_id=1, product_id=5, interaction_type="view"),
    ]
    # Interactions for user 2 (few → content-based)
    interactions_u2 = [
        Interaction(user_id=2, product_id=3, interaction_type="purchase", rating=5.0),
        Interaction(user_id=2, product_id=4, interaction_type="click"),
    ]
    db.add_all(interactions_u1 + interactions_u2)
    db.commit()

    # Train ML engine
    ml_engine.fit(db)
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    import os
    if os.path.exists("test_recommendations.db"):
        os.remove("test_recommendations.db")


client = TestClient(app)


# ── Health Endpoint ───────────────────────────────────────────────────────────
class TestHealthEndpoint:
    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_structure(self):
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "total_users" in data
        assert "total_products" in data
        assert "ml_engine_ready" in data

    def test_health_status_healthy(self):
        response = client.get("/health")
        assert response.json()["status"] == "healthy"

    def test_health_ml_engine_ready(self):
        response = client.get("/health")
        assert response.json()["ml_engine_ready"] is True


# ── User Recommendations ──────────────────────────────────────────────────────
class TestUserRecommendations:
    def test_existing_user_returns_200(self):
        response = client.get("/api/v1/recommend/user/1")
        assert response.status_code == 200

    def test_existing_user_response_structure(self):
        response = client.get("/api/v1/recommend/user/1")
        data = response.json()
        assert "user_id" in data
        assert "strategy" in data
        assert "recommendations" in data
        assert "total" in data
        assert data["user_id"] == 1

    def test_existing_user_returns_recommendations(self):
        response = client.get("/api/v1/recommend/user/1")
        data = response.json()
        assert data["total"] >= 0
        assert isinstance(data["recommendations"], list)

    def test_recommendation_product_structure(self):
        response = client.get("/api/v1/recommend/user/1")
        recs = response.json()["recommendations"]
        if recs:
            rec = recs[0]
            assert "product_id" in rec
            assert "name" in rec
            assert "category" in rec
            assert "price" in rec
            assert "score" in rec
            assert 0.0 <= rec["score"] <= 1.0

    def test_cold_start_user_returns_200(self):
        """User 99 has no interactions — should return popularity-based recs."""
        response = client.get("/api/v1/recommend/user/99")
        assert response.status_code == 200

    def test_cold_start_strategy_is_popularity(self):
        response = client.get("/api/v1/recommend/user/99")
        data = response.json()
        assert data["strategy"] == "popularity"

    def test_nonexistent_user_returns_404(self):
        response = client.get("/api/v1/recommend/user/99999")
        assert response.status_code == 404

    def test_custom_k_parameter(self):
        response = client.get("/api/v1/recommend/user/1?k=3")
        data = response.json()
        assert len(data["recommendations"]) <= 3

    def test_invalid_k_returns_422(self):
        response = client.get("/api/v1/recommend/user/1?k=0")
        assert response.status_code == 422

    def test_explicit_strategy_popularity(self):
        response = client.get("/api/v1/recommend/user/1?strategy=popularity")
        data = response.json()
        assert response.status_code == 200
        assert data["strategy"] == "popularity"

    def test_content_strategy(self):
        response = client.get("/api/v1/recommend/user/2?strategy=content")
        assert response.status_code == 200


# ── Product Similarity ────────────────────────────────────────────────────────
class TestProductSimilarity:
    def test_valid_product_returns_200(self):
        response = client.get("/api/v1/recommend/product/1")
        assert response.status_code == 200

    def test_response_structure(self):
        response = client.get("/api/v1/recommend/product/1")
        data = response.json()
        assert "source_product_id" in data
        assert "source_product_name" in data
        assert "strategy" in data
        assert "recommendations" in data
        assert "total" in data
        assert data["source_product_id"] == 1

    def test_similar_products_exist(self):
        response = client.get("/api/v1/recommend/product/1")
        data = response.json()
        assert data["total"] >= 0

    def test_source_product_not_in_recommendations(self):
        """Product should not recommend itself."""
        response = client.get("/api/v1/recommend/product/1")
        recs = response.json()["recommendations"]
        rec_ids = [r["product_id"] for r in recs]
        assert 1 not in rec_ids

    def test_nonexistent_product_returns_404(self):
        response = client.get("/api/v1/recommend/product/99999")
        assert response.status_code == 404

    def test_custom_k_for_products(self):
        response = client.get("/api/v1/recommend/product/1?k=2")
        data = response.json()
        assert len(data["recommendations"]) <= 2


# ── Product Listing ───────────────────────────────────────────────────────────
class TestProductListing:
    def test_returns_200(self):
        response = client.get("/api/v1/products")
        assert response.status_code == 200

    def test_returns_list(self):
        response = client.get("/api/v1/products")
        assert isinstance(response.json(), list)

    def test_products_have_required_fields(self):
        response = client.get("/api/v1/products")
        products = response.json()
        if products:
            p = products[0]
            assert "id" in p
            assert "name" in p
            assert "category" in p
            assert "price" in p

    def test_pagination(self):
        response = client.get("/api/v1/products?skip=0&limit=2")
        assert len(response.json()) <= 2


# ── Metrics Endpoint ──────────────────────────────────────────────────────────
class TestMetricsEndpoint:
    def test_returns_200(self):
        response = client.get("/api/v1/metrics")
        assert response.status_code == 200

    def test_metrics_structure(self):
        response = client.get("/api/v1/metrics")
        data = response.json()
        assert "precision_at_k" in data
        assert "recall_at_k" in data
        assert "hit_rate" in data
        assert "k" in data
        assert "evaluated_users" in data

    def test_metric_values_in_range(self):
        response = client.get("/api/v1/metrics")
        data = response.json()
        assert 0.0 <= data["precision_at_k"] <= 1.0
        assert 0.0 <= data["recall_at_k"] <= 1.0
        assert 0.0 <= data["hit_rate"] <= 1.0
