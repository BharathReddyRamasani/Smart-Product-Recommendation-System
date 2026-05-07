import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, DollarSign, Tag, ShoppingCart, Zap, ArrowLeft, Package, AlertCircle } from 'lucide-react'
import { getProduct, getSimilarProducts, addToCart, recordInteraction } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ProductCard from '../components/ProductCard'
import { LoadingSpinner, GridSkeleton } from '../components/LoadingSpinner'

const CATEGORY_EMOJI = {
  'Electronics': '⚡', 'Books': '📚', 'Clothing': '👕',
  'Home & Kitchen': '🏠', 'Sports & Outdoors': '⛺', 'Beauty & Personal Care': '✨',
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, updateCartCount } = useAuth()

  const [product, setProduct] = useState(null)
  const [similar, setSimilar] = useState([])
  const [prodLoading, setProdLoading] = useState(true)
  const [simLoading, setSimLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartMsg, setCartMsg] = useState(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setProdLoading(true)
    setSimLoading(true)
    setSimilar([])
    setError(null)

    // Fetch product
    getProduct(id)
      .then((p) => {
        setProduct(p)
        // Auto-log view interaction
        if (user) recordInteraction(p.id, 'view').catch(() => {})
      })
      .catch((e) => setError(e.message))
      .finally(() => setProdLoading(false))

    // Fetch similar products (requires auth but product page works either way)
    if (user) {
      getSimilarProducts(id, 6)
        .then((r) => setSimilar(r.recommendations || []))
        .catch(() => {})
        .finally(() => setSimLoading(false))
    } else {
      setSimLoading(false)
    }
  }, [id, user])

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return }
    setAddingToCart(true)
    setCartMsg(null)
    try {
      const cart = await addToCart(id, qty)
      await recordInteraction(id, 'add_to_cart').catch(() => {})
      updateCartCount(cart.item_count)
      setCartMsg({ type: 'success', text: `Added ${qty} item(s) to cart!` })
    } catch (e) {
      setCartMsg({ type: 'error', text: e.message })
    } finally {
      setAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    if (!user) { navigate('/login'); return }
    await handleAddToCart()
    navigate('/cart')
  }

  if (prodLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
      <LoadingSpinner text="Loading product..." />
    </div>
  )

  if (error) return (
    <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center gap-4">
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-red-400">{error}</p>
      <button onClick={() => navigate(-1)} className="btn-secondary">Go back</button>
    </div>
  )

  if (!product) return null

  const emoji = CATEGORY_EMOJI[product.category] || '📦'
  const features = Array.isArray(product.features) ? product.features : []

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors w-fit">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Product card */}
      <div className="glass-card p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
        {/* Left: visual */}
        <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-8xl">{emoji}</div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-white">{product.rating?.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({product.num_reviews?.toLocaleString()} reviews)</span>
          </div>
        </div>

        {/* Right: details */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">{product.category}</span>
            {product.brand && <span className="text-xs text-gray-600">· {product.brand}</span>}
          </div>

          <h1 className="text-2xl font-bold text-white leading-snug">{product.name}</h1>
          <p className="text-gray-400 leading-relaxed text-sm">{product.description}</p>

          {/* Features */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {features.map((f) => (
                <span key={f} className="px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">{f}</span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-400" />
            <span className="text-3xl font-bold text-white">{product.price?.toFixed(2)}</span>
          </div>

          {/* Qty + actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center">−</button>
              <span className="text-white font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(50, q + 1))} className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center">+</button>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleAddToCart} disabled={addingToCart}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all disabled:opacity-60">
              <ShoppingCart size={18} />
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </button>
            <button onClick={handleBuyNow} disabled={addingToCart}
              className="flex-1 btn-primary py-3 disabled:opacity-60">
              Buy Now
            </button>
          </div>

          {cartMsg && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${
              cartMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {cartMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Similar Products */}
      <section>
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
          <Zap size={18} className="text-brand-400" /> Similar Products
          <span className="text-sm font-normal text-gray-500 ml-1">(content-based)</span>
        </h2>
        {simLoading ? <GridSkeleton count={3} /> : similar.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Package size={32} className="text-gray-700" />
            <p className="text-gray-500 text-sm">No similar products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} showScore={true} onCartUpdate={(c) => updateCartCount(c.item_count)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
