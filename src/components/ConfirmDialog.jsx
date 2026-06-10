import { Trash2, AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onConfirm, onCancel, title = 'Hapus Data', message = 'Yakin mau hapus data ini? Aksi ini tidak bisa dibatalkan.' }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-olive/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-float animate-in">
        <div className="px-6 pt-6 pb-5">
          {/* Icon */}
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h3 className="font-bold text-olive text-base">{title}</h3>
          <p className="text-sm text-cocoa/60 mt-1.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Trash2 size={14} />
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}