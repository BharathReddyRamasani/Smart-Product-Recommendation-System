import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ArrowRight, Clock } from 'lucide-react'
import { getOrders } from '../services/api'
import { LoadingSpinner } from '../components/LoadingSpinner'

const CATEGORY_EMOJI = {
  'Electronics': '⚡', 'Books': '📚', 'Clothing': '👕',
  'Home & Kitchen': '🏠', 'Sports & Outdoors': '⛺', 'Beauty & Personal Care': '✨',
}

const STATUS_CONFIG = {
  placed: { label: 'Order Placed', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  confirmed: { label: 'Confirmed', color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
  delivered: { label: 'Delivered', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
}

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center min-h-96">
      <LoadingSpinner text="Loading orders..." />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <Package size={22} className="text-brand-400" /> My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center glass-card">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Package size={36} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium text-lg">No orders yet</p>
          <p className="text-sm text-gray-600">Start shopping to see your orders here</p>
          <button onClick={() => navigate('/explore')} className="btn-primary flex items-center gap-2">
            Browse Products <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
            return (
              <div key={order.id} className="glass-card p-6 flex flex-col gap-4 animate-slide-up">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Order ID</p>
                    <p className="font-mono text-sm text-white">#{order.id.slice(-10).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-2">
                  {order.items.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className="text-xl">{CATEGORY_EMOJI[item.category] || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-500">{item.category} · Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-white">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={12} /> {dateStr}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{order.items.length} item(s)</span>
                    <span className="text-base font-bold text-emerald-400">${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
