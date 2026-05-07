export function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 animate-fade-in">
      <div
        className={`${sizeMap[size]} rounded-full border-brand-500/30 border-t-brand-400 animate-spin`}
      />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="skeleton h-3 w-16 rounded-full" />
      <div className="skeleton h-5 w-3/4 rounded-lg" />
      <div className="skeleton h-4 w-full rounded-lg" />
      <div className="skeleton h-4 w-5/6 rounded-lg" />
      <div className="flex justify-between mt-2">
        <div className="skeleton h-6 w-20 rounded-lg" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
