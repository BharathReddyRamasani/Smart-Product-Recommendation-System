"""
Unit tests for interaction API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestInteractionEndpoint:
    """Tests for POST /api/v1/interaction"""

    def test_record_view_interaction(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 1,
            "product_id": 2,
            "interaction_type": "view",
        })
        assert response.status_code == 201

    def test_record_click_with_rating(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 1,
            "product_id": 3,
            "interaction_type": "click",
            "rating": 4.5,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["interaction_type"] == "click"
        assert data["rating"] == 4.5

    def test_record_purchase_interaction(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 2,
            "product_id": 1,
            "interaction_type": "purchase",
            "rating": 5.0,
        })
        assert response.status_code == 201

    def test_interaction_response_structure(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 1,
            "product_id": 4,
            "interaction_type": "view",
        })
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert "user_id" in data
        assert "product_id" in data
        assert "interaction_type" in data
        assert "timestamp" in data

    def test_invalid_interaction_type(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 1,
            "product_id": 1,
            "interaction_type": "wishlist",  # Invalid type
        })
        assert response.status_code == 422

    def test_nonexistent_user_returns_404(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 99999,
            "product_id": 1,
            "interaction_type": "view",
        })
        assert response.status_code == 404

    def test_nonexistent_product_returns_404(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 1,
            "product_id": 99999,
            "interaction_type": "view",
        })
        assert response.status_code == 404

    def test_missing_required_fields_returns_422(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 1,
            # Missing product_id and interaction_type
        })
        assert response.status_code == 422

    def test_rating_out_of_range_returns_422(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 1,
            "product_id": 1,
            "interaction_type": "click",
            "rating": 6.0,  # Max is 5.0
        })
        assert response.status_code == 422

    def test_rating_below_min_returns_422(self):
        response = client.post("/api/v1/interaction", json={
            "user_id": 1,
            "product_id": 1,
            "interaction_type": "click",
            "rating": 0.5,  # Min is 1.0
        })
        assert response.status_code == 422


class TestInteractionHistory:
    """Tests for GET /api/v1/interaction/user/{user_id}"""

    def test_get_history_returns_200(self):
        response = client.get("/api/v1/interaction/user/1")
        assert response.status_code == 200

    def test_history_returns_list(self):
        response = client.get("/api/v1/interaction/user/1")
        assert isinstance(response.json(), list)

    def test_history_items_structure(self):
        response = client.get("/api/v1/interaction/user/1")
        history = response.json()
        if history:
            item = history[0]
            assert "id" in item
            assert "user_id" in item
            assert "product_id" in item
            assert "interaction_type" in item
            assert "timestamp" in item

    def test_history_respects_limit(self):
        response = client.get("/api/v1/interaction/user/1?limit=2")
        history = response.json()
        assert len(history) <= 2

    def test_new_user_has_empty_history(self):
        response = client.get("/api/v1/interaction/user/99")
        assert response.status_code == 200
        assert response.json() == []
