import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-olive/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-white rounded-3xl shadow-float animate-in flex flex-col max-h-[90vh]`}>
        {/* Header — fixed, tidak ikut scroll */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cream/60 flex-shrink-0">
          <h3 className="font-semibold text-olive text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-cream-lighter hover:bg-cream transition-colors">
            <X size={15} className="text-cocoa" />
          </button>
        </div>
        {/* Content — scrollable */}
        <div className="px-6 py-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}