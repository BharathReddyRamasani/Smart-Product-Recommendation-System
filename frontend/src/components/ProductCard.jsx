import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, ShoppingCart, Eye, DollarSign, Tag, Zap } from 'lucide-react'
import { addToCart, recordInteraction } from '../services/api'
import { useAuth } from '../context/AuthContext'

const CATEGORY_CONFIG = {
  'Electronics':           { emoji: '⚡', gradient: 'from-blue-500/15 to-cyan-500/15 border-blue-500/20' },
  'Books':                 { emoji: '📚', gradient: 'from-amber-500/15 to-orange-500/15 border-amber-500/20' },
  'Clothing':              { emoji: '👕', gradient: 'from-pink-500/15 to-rose-500/15 border-pink-500/20' },
  'Home & Kitchen':        { emoji: '🏠', gradient: 'from-emerald-500/15 to-green-500/15 border-emerald-500/20' },
  'Sports & Outdoors':     { emoji: '⛺', gradient: 'from-lime-500/15 to-green-500/15 border-lime-500/20' },
  'Beauty & Personal Care':{ emoji: '✨', gradient: 'from-purple-500/15 to-fuchsia-500/15 border-purple-500/20' },
}

function ScoreBar({ score, reason }) {
  if (!score) return null
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-brand-400' : 'bg-yellow-400'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Zap size={10} className="text-brand-400" />
          {reason || 'Match'}
        </span>
        <span className="text-xs font-bold text-gray-400">{pct}%</span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ProductCard({ product, showScore = false, compact = false, onCartUpdate }) {
  const { user, updateCartCount } = useAuth()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const cfg = CATEGORY_CONFIG[product.category] || { emoji: '📦', gradient: 'from-gray-500/15 to-gray-600/15 border-gray-500/20' }
  const features = Array.isArray(product.features)
    ? product.features.slice(0, 3)
    : (product.features || '').split(',').slice(0, 3).map((f) => f.trim())

  const handleView = () => {
    if (user) {
      recordInteraction(product.id, 'view').catch(() => {})
    }
    navigate(`/products/${product.id}`)
  }

  const handleAddToCart = async (e) => {
    e.stopPropagation()
    if (!user || adding) return
    setAdding(true)
    try {
      const cart = await addToCart(product.id, 1)
      await recordInteraction(product.id, 'add_to_cart').catch(() => {})
      updateCartCount(cart.item_count)
      onCartUpdate?.(cart)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      console.error('Add to cart failed:', err.message)
    } finally {
      setAdding(false)
    }
  }

  if (compact) {
    return (
      <div
        onClick={handleView}
        className={`glass-card p-4 cursor-pointer bg-gradient-to-br ${cfg.gradient} border flex gap-3 items-center`}
      >
        <span className="text-2xl shrink-0">{cfg.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{product.name}</p>
          <p className="text-xs text-gray-500">{product.category}</p>
          <p className="text-sm font-bold text-white mt-0.5">${product.price?.toFixed(2)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`glass-card p-5 flex flex-col gap-3 bg-gradient-to-br ${cfg.gradient} border cursor-pointer animate-slide-up`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl">{cfg.emoji}</span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          <Star size={11} className="text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-semibold text-gray-300">{product.rating?.toFixed(1)}</span>
          <span className="text-xs text-gray-600">({product.num_reviews?.toLocaleString()})</span>
        </div>
      </div>

      {/* Category */}
      <div className="flex items-center gap-1.5">
        <Tag size={10} className="text-gray-500" />
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{product.category}</span>
      </div>

      {/* Name */}
      <h3 onClick={handleView} className="font-bold text-white text-sm leading-snug line-clamp-2 hover:text-brand-300 transition-colors">
        {product.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{product.description}</p>

      {/* Feature tags */}
      {features.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {features.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-500">{f}</span>
          ))}
        </div>
      )}

      {/* Score */}
      {showScore && product.score > 0 && (
        <ScoreBar score={product.score} reason={product.reason} />
      )}

      {/* Price + Actions */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
        <div className="flex items-center gap-1">
          <DollarSign size={13} className="text-emerald-400" />
          <span className="text-lg font-bold text-white">{product.price?.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleView}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <Eye size={12} /> View
          </button>
          <button
            onClick={handleAddToCart}
            disabled={adding}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              added
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                : 'btn-primary py-1.5 px-3 text-xs'
            }`}
          >
            <ShoppingCart size={12} />
            {added ? 'Added!' : adding ? '...' : 'Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
