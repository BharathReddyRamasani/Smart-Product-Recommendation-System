"""
Popularity-based recommender.
Used as the cold-start baseline for users with no interaction history.
Ranks products by weighted interaction score across all users:
  view=1, add_to_cart=3, purchase=5
"""
from collections import defaultdict
from typing import List, Tuple
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PopularityRecommender:
    """Ranks products globally by weighted interaction count."""

    def __init__(self) -> None:
        self._scores: dict[int, float] = {}
        self._is_fitted: bool = False

    def fit(self, interactions: list[dict]) -> "PopularityRecommender":
        """
        Build popularity scores from interaction records.
        
        Args:
            interactions: List of dicts with keys: product_id, interaction_type, rating
        Returns:
            self
        """
        weights = {"view": 1, "add_to_cart": 3, "purchase": 5}
        scores: dict[int, float] = defaultdict(float)

        for record in interactions:
            pid = record["product_id"]
            itype = record["interaction_type"]
            w = weights.get(itype, 1)

            # Boost by rating if available (normalize rating 1-5 → multiplier 0.6-1.4)
            rating = record.get("rating")
            if rating:
                multiplier = 0.6 + (rating - 1) * (0.8 / 4)
            else:
                multiplier = 1.0

            scores[pid] += w * multiplier

        self._scores = dict(scores)
        self._is_fitted = True
        logger.info(f"PopularityRecommender fitted on {len(self._scores)} products")
        return self

    def add_interaction(self, record: dict) -> None:
        """Dynamically update scores for real-time continuous learning."""
        weights = {"view": 1, "click": 2, "add_to_cart": 3, "purchase": 5}
        pid = record["product_id"]
        itype = record.get("interaction_type", "view")
        w = weights.get(itype, 1)

        rating = record.get("rating")
        if rating:
            multiplier = 0.6 + (rating - 1) * (0.8 / 4)
        else:
            multiplier = 1.0

        if pid not in self._scores:
            self._scores[pid] = 0.0
        self._scores[pid] += w * multiplier

    def recommend(self, k: int = 10, exclude_product_ids: list[int] | None = None) -> List[Tuple[int, float]]:
        """
        Return top-K product IDs with normalized popularity scores.
        
        Args:
            k: Number of recommendations
            exclude_product_ids: Product IDs to exclude (already-seen products)
        Returns:
            List of (product_id, score) tuples, score in [0, 1]
        """
        if not self._is_fitted or not self._scores:
            return []

        exclude = set(exclude_product_ids or [])
        filtered = {pid: score for pid, score in self._scores.items() if pid not in exclude}

        if not filtered:
            return []

        max_score = max(filtered.values()) or 1.0
        ranked = sorted(filtered.items(), key=lambda x: x[1], reverse=True)

        return [(pid, round(score / max_score, 4)) for pid, score in ranked[:k]]
