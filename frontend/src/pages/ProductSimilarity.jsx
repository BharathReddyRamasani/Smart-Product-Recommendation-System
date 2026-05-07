import { useState, useEffect } from 'react'
import { Package, Search, Star, DollarSign, Tag, ArrowRight } from 'lucide-react'
import { getProducts, getSimilarProducts } from '../services/api'
import RecommendationGrid from '../components/RecommendationGrid'

function SourceProductPanel({ product }) {
  if (!product) return null
  return (
    <div className="glass-card p-6 border border-brand-500/20 bg-gradient-to-br from-brand-500/10 to-purple-500/10 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-brand-400" />
        <span className="text-xs text-brand-400 uppercase tracking-wider font-semibold">
          Source Product
        </span>
      </div>
      <h2 className="text-xl font-bold text-white mb-1">{product.name}</h2>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="flex items-center gap-1 text-sm text-gray-400">
          <Tag size={13} />
          {product.category}
        </span>
        <span className="flex items-center gap-1 text-sm text-gray-400">
          <DollarSign size={13} />
          {product.price?.toFixed(2)}
        </span>
        <span className="flex items-center gap-1 text-sm text-gray-400">
          <Star size={13} className="text-yellow-400" />
          {product.rating?.toFixed(1)}
        </span>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">{product.description}</p>
      {product.features && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {product.features.split(',').map((f) => (
            <span
              key={f.trim()}
              className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-500"
            >
              {f.trim()}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductSimilarity() {
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [k, setK] = useState(9)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    getProducts(0, 200)
      .then(setProducts)
      .catch((e) => console.error('Failed to load products:', e))
      .finally(() => setProductsLoading(false))
  }, [])

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.id).includes(searchQuery)
  )

  const fetchSimilar = async (product) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setShowDropdown(false)
    try {
      const data = await getSimilarProducts(product.id, k)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setSearchQuery(product.name)
    fetchSimilar(product)
  }

  // Normalize product from catalog (different schema) to RecommendedProduct schema
  const normalizeProduct = (p) => ({
    product_id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    features: p.features,
    image_url: p.image_url,
    brand: p.brand,
    rating: p.rating,
    score: p.score,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Package size={20} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Product Similarity</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Find products similar to any item using TF-IDF content-based filtering.
            Similarity is computed from category, description, and feature text.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative animate-slide-up">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-600" />
              </div>
              <input
                type="text"
                placeholder="Search product by name, category, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                className="input-field pl-11"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500">K=</span>
              {[6, 9, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setK(n)
                    if (selectedProduct) fetchSimilar(selectedProduct)
                  }}
                  className={`w-9 h-10 rounded-xl text-sm font-bold transition-all ${
                    k === n
                      ? 'bg-brand-600 text-white'
                      : 'bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown */}
          {showDropdown && filteredProducts.length > 0 && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-card border border-white/10 overflow-hidden max-h-72 overflow-y-auto shadow-2xl">
              {filteredProducts.slice(0, 15).map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left group border-b border-white/5 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                    <Package size={14} className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-300 group-hover:text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {product.category} · ${product.price?.toFixed(2)} · ID: {product.id}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-gray-700 group-hover:text-brand-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Source product */}
        {selectedProduct && !loading && (
          <SourceProductPanel product={selectedProduct} />
        )}

        {/* Results */}
        {(selectedProduct || loading) && (
          <div>
            {result && !loading && (
              <div className="flex items-center justify-between mb-4 animate-fade-in">
                <h2 className="text-lg font-bold text-white">
                  {result.total} Similar Products
                </h2>
                <span className="strategy-pill bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  📝 TF-IDF Content Similarity
                </span>
              </div>
            )}
            <RecommendationGrid
              recommendations={result?.recommendations}
              loading={loading}
              error={error}
              userId={null}
              emptyMessage="No similar products found."
              emptyHint="Try a different product or check the ML engine status."
            />
          </div>
        )}

        {!selectedProduct && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Package size={36} className="text-gray-700" />
            </div>
            <div className="text-center">
              <p className="text-gray-400 font-medium">Search for a product above</p>
              <p className="text-sm text-gray-600 mt-1">
                Type a product name to find similar items
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
