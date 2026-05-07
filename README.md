# 🛒 Smart Product Recommendation System

A production-ready, end-to-end recommendation engine with a FastAPI backend, multi-strategy ML pipeline, and a React + Tailwind CSS frontend.

---

## 🏗️ Architecture

```
User → React UI → FastAPI → ML Engine → SQLite DB → Response → UI
```

### Backend (FastAPI)
```
backend/app/
├── routes/           # API endpoint handlers
├── services/         # Business logic layer
├── models/           # SQLAlchemy ORM models
├── schemas/          # Pydantic v2 validation schemas
├── ml/               # ML engine modules
│   ├── engine.py         → Orchestrator (auto-strategy selection)
│   ├── popularity.py     → Cold-start baseline
│   ├── content_based.py  → TF-IDF + Cosine Similarity
│   ├── collaborative.py  → User-User Collaborative Filtering
│   ├── matrix_factorization.py → SVD factorization
│   └── metrics.py        → Precision@K, Recall@K, Hit Rate
└── utils/            # DB, logger, seed data
```

### ML Strategy Auto-Selection
| User Interactions | Strategy Used |
|---|---|
| 0 | 🔥 Popularity (cold start) |
| 1–4 | 📝 Content-Based (TF-IDF) |
| 5+ | 👥 Collaborative Filtering → SVD fallback |

---

## 🚀 Quick Start

### Option 1: Local Development (Recommended)

**Backend:**
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy environment config
copy .env.example .env         # Windows
# cp .env.example .env         # Linux/Mac

# Run the server
uvicorn app.main:app --reload --port 8000
```

The backend will:
1. Create the SQLite database
2. Seed 50 users, 90 products, and 2000 interactions automatically
3. Train all ML models (takes ~5-10 seconds)

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit: http://localhost:3000

### Option 2: Docker Compose

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health + ML engine status |
| GET | `/api/v1/recommend/user/{id}?k=10&strategy=auto` | Personalized user recommendations |
| GET | `/api/v1/recommend/product/{id}?k=10` | Similar product recommendations |
| POST | `/api/v1/interaction` | Record user interaction event |
| GET | `/api/v1/interaction/user/{id}` | User interaction history |
| GET | `/api/v1/products` | All products (paginated) |
| GET | `/api/v1/users` | All users (paginated) |
| GET | `/api/v1/metrics?k=10` | Precision@K, Recall@K, Hit Rate |

**API Documentation:** http://localhost:8000/docs

### Example Requests

```bash
# Get recommendations for user 1 (auto strategy)
curl http://localhost:8000/api/v1/recommend/user/1

# Get similar products for product 5
curl http://localhost:8000/api/v1/recommend/product/5?k=6

# Record an interaction
curl -X POST http://localhost:8000/api/v1/interaction \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "product_id": 3, "interaction_type": "purchase", "rating": 4.5}'

# Health check
curl http://localhost:8000/health
```

---

## 🧪 Running Tests

```bash
cd backend
pip install -r requirements.txt

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --tb=short
```

Tests cover:
- ✅ Health endpoint
- ✅ User recommendations (existing, cold-start, invalid)
- ✅ Product similarity (valid, self-exclusion, invalid)
- ✅ Interaction recording (all types, validation errors)
- ✅ Interaction history
- ✅ Metrics computation
- ✅ Edge cases (missing users, invalid types, out-of-range ratings)

---

## 🎨 Frontend Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | System stats, ML model metrics (radial gauges), strategy cards |
| User Recommendations | `/recommendations` | Select user → get personalized recs with strategy control |
| Product Similarity | `/similarity` | Search product → find similar items via TF-IDF |

---

## 🗄️ Database Schema

```sql
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(200) UNIQUE,
  age INTEGER,
  location VARCHAR(100),
  created_at DATETIME
);

-- Products
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name VARCHAR(200),
  category VARCHAR(100),
  price FLOAT,
  description TEXT,
  features TEXT,         -- comma-separated tags
  brand VARCHAR(100),
  rating FLOAT,
  image_url VARCHAR(500),
  created_at DATETIME
);

-- Interactions
CREATE TABLE interactions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  interaction_type VARCHAR(20),  -- view | click | purchase
  rating FLOAT,                   -- optional 1-5
  timestamp DATETIME
);
```

---

## 🚀 Deployment

### Backend → Render

1. Push the `backend/` folder to GitHub
2. Create a new **Web Service** on Render
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable: `SEED_ON_STARTUP=true`

### Frontend → Vercel

1. Push the `frontend/` folder to GitHub
2. Import to Vercel — framework preset: **Vite**
3. Add environment variable: `VITE_API_URL=https://your-render-backend-url.com`

---

## 📊 Evaluation Metrics

The system evaluates collaborative filtering using leave-last-out:

- **Precision@K**: What fraction of top-K recommendations are relevant?
- **Recall@K**: What fraction of relevant items appear in top-K?
- **Hit Rate@K**: Did at least 1 recommendation match user interest?

Access via: `GET /api/v1/metrics`

---

## ⚠️ Known Limitations

- SQLite is not suitable for high-concurrency production workloads (swap for PostgreSQL)
- No real-time model updates — models retrain at startup
- Cold-start products (new products) rely on content features only
- Dataset is synthetic (realistic but not real-world e-commerce data)

---

## 🔮 Future Improvements

- [ ] Redis caching for recommendation results
- [ ] Real-time model update via Celery workers
- [ ] Deep learning: Neural Collaborative Filtering (NCF)
- [ ] A/B testing framework for strategy comparison
- [ ] User authentication and session management
- [ ] PostgreSQL + connection pooling for production