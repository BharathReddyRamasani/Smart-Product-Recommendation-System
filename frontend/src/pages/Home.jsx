import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Zap, Clock, ChevronRight, AlertCircle } from 'lucide-react'
import { getHomeFeed } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ProductCard from '../components/ProductCard'
import { GridSkeleton } from '../components/LoadingSpinner'

const CATEGORIES = [
  { name: 'Electronics', emoji: '⚡', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/20' },
  { name: 'Books', emoji: '📚', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/20' },
  { name: 'Clothing', emoji: '👕', color: 'from-pink-500/20 to-rose-500/20 border-pink-500/20' },
  { name: 'Home & Kitchen', emoji: '🏠', color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/20' },
  { name: 'Sports & Outdoors', emoji: '⛺', color: 'from-lime-500/20 to-green-500/20 border-lime-500/20' },
  { name: 'Beauty & Personal Care', emoji: '✨', color: 'from-purple-500/20 to-fuchsia-500/20 border-purple-500/20' },
]

function SectionHeader({ title, icon: Icon, linkTo, linkLabel = 'See all', color = 'text-brand-400' }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Icon size={20} className={color} />
        {title}
      </h2>
      {linkTo && (
        <Link to={linkTo} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-400 transition-colors">
          {linkLabel} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  )
}

export default function Home() {
  const { user, updateCartCount } = useAuth()
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadFeed = () => {
    setLoading(true)
    getHomeFeed()
      .then((data) => { setFeed(data); setError(null) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadFeed() }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">
      {/* Welcome */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          {feed?.is_personalized
            ? <span className="strategy-pill bg-brand-500/20 text-brand-300 border border-brand-500/30">
                <Zap size={11} /> Personalized
              </span>
            : <span className="strategy-pill bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                <TrendingUp size={11} /> Trending
              </span>
          }
        </div>
        <h1 className="text-3xl font-bold text-white">
          {loading ? 'Welcome back!' : `Welcome back, ${feed?.user_name?.split(' ')[0] || 'there'}!`}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {feed?.is_personalized
            ? `Based on your ${feed.interaction_count} interactions — hybrid recommendations just for you`
            : 'Explore trending products — make a few interactions to unlock personalized picks!'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Category browse */}
      <section>
        <SectionHeader title="Browse Categories" icon={ChevronRight} linkTo="/explore" linkLabel="All products" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              to={`/explore?category=${encodeURIComponent(cat.name)}`}
              className={`glass-card p-4 text-center border bg-gradient-to-br ${cat.color} hover:scale-105 transition-transform`}
            >
              <div className="text-2xl mb-2">{cat.emoji}</div>
              <p className="text-xs font-semibold text-gray-300 leading-tight">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Main recommendations */}
      <section>
        <SectionHeader
          title={loading ? 'Loading...' : feed?.main_section_title || 'Trending Products'}
          icon={feed?.is_personalized ? Zap : TrendingUp}
          linkTo="/recommendations"
          linkLabel="Full list"
          color={feed?.is_personalized ? 'text-brand-400' : 'text-yellow-400'}
        />
        {loading ? <GridSkeleton count={6} /> : (
          feed?.main_products?.length > 0
            ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {feed.main_products.slice(0, 6).map((p) => (
                  <ProductCard key={p.id} product={p} showScore={feed.is_personalized} onCartUpdate={(c) => updateCartCount(c.item_count)} />
                ))}
              </div>
            : <EmptyState message="No products found" hint="Try refreshing or check your connection" />
        )}
      </section>

      {/* Recently Viewed */}
      {feed?.recently_viewed?.length > 0 && (
        <section>
          <SectionHeader title="Recently Viewed" icon={Clock} color="text-gray-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {feed.recently_viewed.map((p) => (
              <ProductCard key={p.id} product={p} showScore={false} onCartUpdate={(c) => updateCartCount(c.item_count)} />
            ))}
          </div>
        </section>
      )}

      {/* Secondary products */}
      {!loading && feed?.secondary_products?.length > 0 && (
        <section>
          <SectionHeader title={feed.secondary_section_title} icon={TrendingUp} color="text-emerald-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {feed.secondary_products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} showScore={false} onCartUpdate={(c) => updateCartCount(c.item_count)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EmptyState({ message, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <TrendingUp size={24} className="text-gray-600" />
      </div>
      <p className="text-gray-400 font-medium">{message}</p>
      {hint && <p className="text-sm text-gray-600">{hint}</p>}
    </div>
  )
}
