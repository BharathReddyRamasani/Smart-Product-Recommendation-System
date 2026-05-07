import { useState, useEffect } from 'react'
import { Users, Zap, ChevronDown, RefreshCw, Info } from 'lucide-react'
import { getUsers, getUserRecommendations } from '../services/api'
import RecommendationGrid from '../components/RecommendationGrid'

const STRATEGY_OPTIONS = [
  { value: 'auto', label: '🤖 Auto (Smart Select)' },
  { value: 'popularity', label: '🔥 Popularity (Cold Start)' },
  { value: 'content', label: '📝 Content-Based (TF-IDF)' },
  { value: 'collaborative', label: '👥 Collaborative Filtering' },
  { value: 'svd', label: '🧮 SVD Factorization' },
]

const STRATEGY_DESCRIPTIONS = {
  auto: 'Automatically selects the best strategy based on your interaction history.',
  popularity: 'Returns globally popular products — best for new users with no history.',
  content: "Recommends products with similar features to items you have interacted with.",
  collaborative: 'Finds users similar to you and recommends what they liked.',
  svd: 'Matrix factorization uncovers hidden preference patterns.',
}

const K_OPTIONS = [5, 10, 15, 20]

function UserCard({ user, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium ${
        isSelected
          ? 'bg-brand-600/30 border border-brand-500/40 text-brand-300'
          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          isSelected ? 'bg-brand-500 text-white' : 'bg-gray-700 text-gray-400'
        }`}>
          {user.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-inherit">{user.name}</p>
          <p className="text-xs text-gray-600 truncate">ID: {user.id} · {user.location}</p>
        </div>
      </div>
    </button>
  )
}

export default function UserRecommendations() {
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [strategy, setStrategy] = useState('auto')
  const [k, setK] = useState(10)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getUsers(0, 50)
      .then(setUsers)
      .catch((e) => console.error('Failed to load users:', e))
      .finally(() => setUsersLoading(false))
  }, [])

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(u.id).includes(searchQuery)
  )

  const fetchRecommendations = async () => {
    if (!selectedUser) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await getUserRecommendations(selectedUser.id, k, strategy)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUser) fetchRecommendations()
  }, [selectedUser, strategy, k])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <Users size={20} className="text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">User Recommendations</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Select a user to get personalized product recommendations. The system auto-selects
            the best strategy based on their interaction history.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left panel: user selector + controls */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* User search */}
            <div className="glass-card p-4 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Users size={14} className="text-brand-400" />
                Select User
              </h2>
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field text-sm"
              />
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {usersLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-12 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      isSelected={selectedUser?.id === user.id}
                      onClick={() => setSelectedUser(user)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Strategy picker */}
            <div className="glass-card p-4 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Zap size={14} className="text-brand-400" />
                Strategy
              </h2>
              <div className="relative">
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="select-field text-sm"
                >
                  {STRATEGY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
              <p className="text-xs text-gray-600 leading-relaxed flex items-start gap-1.5">
                <Info size={11} className="mt-0.5 shrink-0 text-gray-600" />
                {STRATEGY_DESCRIPTIONS[strategy]}
              </p>

              {/* Top-K selector */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Results (K)</span>
                <div className="flex gap-1">
                  {K_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setK(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        k === n
                          ? 'bg-brand-600 text-white'
                          : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Refresh button */}
            {selectedUser && (
              <button
                onClick={fetchRecommendations}
                disabled={loading}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            )}
          </div>

          {/* Right panel: results */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Result header */}
            {result && !loading && (
              <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {result.total} Recommendations for{' '}
                    <span className="text-gradient">{selectedUser?.name}</span>
                  </h2>
                  <p className="text-sm text-gray-500">User ID: {result.user_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Strategy used:</span>
                  <span
                    className={`strategy-pill ${
                      result.strategy === 'popularity'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : result.strategy === 'content'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : result.strategy === 'collaborative'
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {result.strategy === 'popularity' && '🔥'}
                    {result.strategy === 'content' && '📝'}
                    {result.strategy === 'collaborative' && '👥'}
                    {result.strategy === 'svd' && '🧮'}
                    {result.strategy}
                  </span>
                </div>
              </div>
            )}

            {!selectedUser && !loading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Users size={36} className="text-gray-700" />
                </div>
                <div className="text-center">
                  <p className="text-gray-400 font-medium">Select a user to get started</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose from the user list on the left
                  </p>
                </div>
              </div>
            ) : (
              <RecommendationGrid
                recommendations={result?.recommendations}
                loading={loading}
                error={error}
                userId={selectedUser?.id}
                emptyMessage="No recommendations found for this user."
                emptyHint="Try a different strategy or check that the ML engine is ready."
                onInteract={fetchRecommendations}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
