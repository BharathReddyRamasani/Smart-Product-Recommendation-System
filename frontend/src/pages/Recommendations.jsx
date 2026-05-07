import { useEffect, useState } from 'react'
import { Star, Zap, RefreshCw, ChevronDown, Info } from 'lucide-react'
import { getUserRecommendations } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ProductCard from '../components/ProductCard'
import { GridSkeleton } from '../components/LoadingSpinner'

const STRATEGIES = [
  { value: 'auto', label: 'Auto (Smart Select)', desc: '< 5 interactions → popular; 5-19 → content; ≥ 20 → hybrid (60% CF + 30% content + 10% trending)' },
  { value: 'popularity', label: 'Popularity (Cold Start)', desc: 'Globally trending products, sorted by interaction weight (views×1, cart×3, purchases×5)' },
  { value: 'content', label: 'Content-Based', desc: 'TF-IDF similarity on product features to items you have viewed' },
  { value: 'collaborative', label: 'Collaborative Filtering', desc: 'User-user cosine similarity — what similar users liked' },
  { value: 'hybrid', label: 'Hybrid', desc: '60% collaborative + 30% content-based + 10% trending — explicit weighted blend' },
  { value: 'svd', label: 'SVD Factorization', desc: 'Matrix factorization discovering latent preference patterns' },
]

const STRATEGY_COLORS = {
  popularity: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  content: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  collaborative: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
  hybrid: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  svd: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

export default function Recommendations() {
  const { user, updateCartCount } = useAuth()
  const [result, setResult] = useState(null)
  const [strategy, setStrategy] = useState('auto')
  const [k, setK] = useState(12)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentStrategy = STRATEGIES.find((s) => s.value === strategy)

  const fetch = () => {
    setLoading(true)
    setError(null)
    getUserRecommendations(k, strategy)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [strategy, k])

  const strategyUsed = result?.strategy
  const strategyColor = STRATEGY_COLORS[strategyUsed] || STRATEGY_COLORS.popularity

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star size={22} className="text-brand-400" /> Your Recommendations
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Personalized picks based on your interaction history
        </p>
      </div>

      {/* Controls */}
      <div className="glass-card p-5 flex flex-wrap items-start gap-5">
        {/* Strategy selector */}
        <div className="flex flex-col gap-2 flex-1 min-w-52">
          <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <Zap size={12} className="text-brand-400" /> Strategy
          </label>
          <div className="relative">
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="select-field text-sm appearance-none pr-8">
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value} className="bg-gray-900">{s.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <p className="text-xs text-gray-600 flex items-start gap-1.5 leading-relaxed">
            <Info size={10} className="mt-0.5 shrink-0" />
            {currentStrategy?.desc}
          </p>
        </div>

        {/* K selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-400">Top-K Results</label>
          <div className="flex gap-2">
            {[6, 12, 18, 24].map((n) => (
              <button key={n} onClick={() => setK(n)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${k === n ? 'bg-brand-600 text-white' : 'bg-white/5 border border-white/10 text-gray-500 hover:text-gray-300'}`}
              >{n}</button>
            ))}
          </div>
        </div>

        {/* Refresh */}
        <button onClick={fetch} disabled={loading}
          className="self-end btn-secondary flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Results header */}
      {result && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <p className="text-lg font-bold text-white">
            {result.total} <span className="text-gradient">personalized</span> picks
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Strategy used:</span>
            <span className={`strategy-pill border ${strategyColor}`}>{strategyUsed}</span>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? <GridSkeleton count={6} /> : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-red-400">{error}</p>
          <button onClick={fetch} className="btn-secondary">Retry</button>
        </div>
      ) : result?.recommendations?.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center glass-card">
          <div className="text-5xl">🤔</div>
          <p className="text-gray-400 font-medium">No recommendations yet</p>
          <p className="text-sm text-gray-600">Browse and interact with products to unlock personalized picks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
          {result.recommendations.map((p) => (
            <ProductCard key={p.id} product={p} showScore={true} onCartUpdate={(c) => updateCartCount(c.item_count)} />
          ))}
        </div>
      )}
    </div>
  )
}
