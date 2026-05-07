import { useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  loading = false,
  selectOptions = null,    // Array of { value, label } for dropdown
  selectValue = null,
  onSelectChange = null,
  selectLabel = 'Filter',
  buttonLabel = 'Search',
}) {
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!loading) onSubmit?.()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex gap-3 p-4 rounded-2xl border transition-all duration-300 ${
        focused
          ? 'border-brand-500/50 bg-white/10 shadow-lg shadow-brand-500/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      {/* Search Input */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <Search
          size={18}
          className={`shrink-0 transition-colors ${focused ? 'text-brand-400' : 'text-gray-600'}`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none min-w-0"
        />
      </div>

      {/* Optional select */}
      {selectOptions && (
        <div className="relative shrink-0">
          <select
            value={selectValue}
            onChange={(e) => onSelectChange?.(e.target.value)}
            className="appearance-none h-full pl-3 pr-8 bg-white/10 border border-white/10 rounded-xl text-gray-300 text-sm focus:outline-none focus:border-brand-500/50 cursor-pointer"
          >
            {selectOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-900">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading || !value}
        className="btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
            Loading
          </span>
        ) : (
          buttonLabel
        )}
      </button>
    </form>
  )
}
