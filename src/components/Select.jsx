import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function Select({ value, onChange, options, placeholder = 'Pilih...' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = options.find(o => String(o.value) === String(value))

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-cream-lighter border border-cream rounded-2xl px-4 py-2.5 text-sm text-olive outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy/40 transition-all duration-200 flex items-center justify-between gap-2 text-left"
      >
        <span className={selected ? 'text-olive' : 'text-cream-dark'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`text-cocoa/50 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-white rounded-2xl shadow-float border border-cream/60 overflow-hidden">
          <div className="py-1.5 max-h-52 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150
                  ${String(opt.value) === String(value)
                    ? 'bg-burgundy/5 text-burgundy font-semibold'
                    : 'text-olive hover:bg-cream-lighter'
                  }`}
              >
                <span>{opt.label}</span>
                {String(opt.value) === String(value) && (
                  <Check size={14} className="text-burgundy flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}