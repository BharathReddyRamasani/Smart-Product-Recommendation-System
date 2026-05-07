import { AlertCircle, PackageSearch } from 'lucide-react'
import ProductCard from './ProductCard'
import { GridSkeleton } from './LoadingSpinner'

export default function RecommendationGrid({
  recommendations = [],
  loading = false,
  error = null,
  userId = null,
  emptyMessage = 'No recommendations found.',
  emptyHint = '',
  onInteract,
}) {
  if (loading) return <GridSkeleton count={6} />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <p className="text-red-400 font-medium">{error}</p>
      </div>
    )
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <PackageSearch size={30} className="text-gray-600" />
        </div>
        <div className="text-center">
          <p className="text-gray-400 font-medium">{emptyMessage}</p>
          {emptyHint && <p className="text-sm text-gray-600 mt-1">{emptyHint}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
      {recommendations.map((product) => (
        <ProductCard
          key={product.product_id}
          product={product}
          userId={userId}
          showScore={true}
          onInteract={onInteract}
        />
      ))}
    </div>
  )
}
