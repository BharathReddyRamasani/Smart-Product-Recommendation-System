import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Plus, Minus, Package, ArrowRight, AlertCircle } from 'lucide-react'
import { getCart, updateCartItem, removeFromCart, placeOrder } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'

const CATEGORY_EMOJI = {
  'Electronics': '⚡', 'Books': '📚', 'Clothing': '👕',
  'Home & Kitchen': '🏠', 'Sports & Outdoors': '⛺', 'Beauty & Personal Care': '✨',
}

export default function Cart() {
  const { updateCartCount } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const fetchCart = () => {
    setLoading(true)
    getCart()
      .then((c) => { setCart(c); updateCartCount(c.item_count) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCart() }, [])

  const handleQty = async (productId, newQty) => {
    try {
      const c = await updateCartItem(productId, newQty)
      setCart(c)
      updateCartCount(c.item_count)
    } catch (e) { setError(e.message) }
  }

  const handleRemove = async (productId) => {
    try {
      const c = await removeFromCart(productId)
      setCart(c)
      updateCartCount(c.item_count)
    } catch (e) { setError(e.message) }
  }

  const handleCheckout = async () => {
    if (!cart?.items?.length) return
    setCheckingOut(true)
    setError(null)
    try {
      const order = await placeOrder()
      updateCartCount(0)
      setCart({ ...cart, items: [], total: 0, item_count: 0 })
      setSuccessMsg(`Order #${order.id.slice(-6).toUpperCase()} placed! Total: $${order.total.toFixed(2)}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-96">
      <LoadingSpinner text="Loading cart..." />
    </div>
  )

  const items = cart?.items || []
  const isEmpty = items.length === 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <ShoppingCart size={22} className="text-brand-400" /> Your Cart
      </h1>

      {successMsg && (
        <div className="flex flex-col items-center gap-4 py-12 animate-fade-in glass-card border border-emerald-500/30 bg-emerald-500/10 mb-6">
          <div className="text-5xl">🎉</div>
          <p className="text-emerald-300 font-semibold text-lg">{successMsg}</p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/orders')} className="btn-primary flex items-center gap-2">
              View Orders <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/explore')} className="btn-secondary">Continue Shopping</button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {isEmpty && !successMsg ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center glass-card">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <ShoppingCart size={36} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium text-lg">Your cart is empty</p>
          <p className="text-sm text-gray-600">Add some products to get started</p>
          <button onClick={() => navigate('/explore')} className="btn-primary flex items-center gap-2">
            Browse Products <ArrowRight size={16} />
          </button>
        </div>
      ) : !isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.product_id} className="glass-card p-5 flex items-center gap-4 animate-slide-up">
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shrink-0">
                  {CATEGORY_EMOJI[item.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{item.category}</p>
                  <p className="text-brand-300 font-bold mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                  <button onClick={() => item.quantity > 1 ? handleQty(item.product_id, item.quantity - 1) : handleRemove(item.product_id)}
                    className="text-gray-400 hover:text-white transition-colors">
                    <Minus size={13} />
                  </button>
                  <span className="text-white text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => handleQty(item.product_id, item.quantity + 1)}
                    className="text-gray-400 hover:text-white transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                <button onClick={() => handleRemove(item.product_id)}
                  className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="glass-card p-6 flex flex-col gap-4 h-fit sticky top-20">
            <h2 className="font-bold text-white text-lg">Order Summary</h2>
            <div className="flex flex-col gap-2 text-sm">
              {items.map((i) => (
                <div key={i.product_id} className="flex justify-between text-gray-400">
                  <span className="truncate flex-1 pr-2">{i.product_name.split(' ').slice(0, 3).join(' ')}... ×{i.quantity}</span>
                  <span className="text-white font-medium">${(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between font-bold text-white">
              <span>Total</span>
              <span className="text-emerald-400 text-lg">${cart.total.toFixed(2)}</span>
            </div>
            <button onClick={handleCheckout} disabled={checkingOut || isEmpty}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
              {checkingOut
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing Order...</>
                : <><Package size={16} /> Place Order</>
              }
            </button>
            <p className="text-xs text-gray-600 text-center">Simulated purchase — no payment required</p>
          </div>
        </div>
      )}
    </div>
  )
}
