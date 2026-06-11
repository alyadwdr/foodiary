import { useState, useEffect } from 'react'
import Modal from './Modal'
import Select from './Select'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/export'
import { Calendar } from 'lucide-react'

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'tf', label: 'Transfer' },
]
const STATUS_OPTIONS = [
  { value: 'process', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function DatePickerCalendar({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const displayValue = value
    ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }
  function selectDay(day) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-cream-lighter border border-cream rounded-2xl px-4 py-2.5 text-sm text-olive outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy/40 transition-all duration-200 flex items-center justify-between gap-2 text-left"
      >
        <span className={value ? 'text-olive' : 'text-cream-dark'}>
          {displayValue || 'Pilih tanggal (opsional)'}
        </span>
        <Calendar size={14} className="text-cocoa/50 flex-shrink-0" />
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-10 top-1/2 -translate-y-1/2 text-cocoa/40 hover:text-cocoa text-xs px-1"
        >✕</button>
      )}

      {open && (
        <div className="absolute z-50 mt-1.5 bg-white rounded-2xl shadow-float border border-cream/60 p-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cream-lighter text-cocoa/60">‹</button>
            <span className="text-xs font-semibold text-olive">{MONTHS_SHORT[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cream-lighter text-cocoa/60">›</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => <div key={d} className="text-center text-[10px] text-cocoa/40 font-medium py-0.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = value === dateStr
              const isToday = dateStr === todayStr
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  className={`aspect-square flex items-center justify-center text-[11px] rounded-lg font-medium transition-all
                    ${isSelected ? 'bg-burgundy text-cream-lighter' : isToday ? 'bg-cream text-olive ring-1 ring-burgundy/30' : 'hover:bg-cream-lighter text-olive/70'}`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AddTransactionModal({ type, onClose }) {
  const [products, setProducts] = useState([])
  const [openPODates, setOpenPODates] = useState([])
  const [form, setForm] = useState({
    customer_name: '',
    product_id: '',
    quantity: 1,
    shipping_fee: 0,
    payment_method: 'cash',
    status: 'process',
    notes: '',
    order_date: '',
    // expense fields
    name: '',
    amount: 1,
    price: '',
    expense_date: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (type === 'order') {
      supabase.from('products').select('*').then(({ data }) => {
        setProducts(data || [])
        if (data?.length) setForm(f => ({ ...f, product_id: data[0].id }))
      })
      // Fetch open PO dates for orders
      supabase.from('open_po_dates').select('date').order('date', { ascending: true }).then(({ data }) => {
        setOpenPODates((data || []).map(d => d.date))
      })
    }
  }, [type])

  const selectedProduct = products.find(p => p.id === Number(form.product_id))
  const subtotal = selectedProduct ? selectedProduct.price * form.quantity : 0
  const total = subtotal + Number(form.shipping_fee || 0)

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name} — Rp ${p.price.toLocaleString('id-ID')}`,
  }))

  const dateOptions = openPODates.map(d => ({
    value: d,
    label: new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
  }))

  async function handleSubmit() {
    setLoading(true)
    if (type === 'order') {
      const payload = {
        customer_name: form.customer_name,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        total_price: total,
        payment_method: form.payment_method,
        shipping_fee: Number(form.shipping_fee || 0),
        notes: form.notes,
        status: form.status,
      }
      if (form.order_date) {
        payload.created_at = new Date(form.order_date).toISOString()
      }
      await supabase.from('orders').insert(payload)
    } else {
      const payload = {
        name: form.name,
        amount: Number(form.amount),
        price: Number(form.price),
        notes: form.notes,
      }
      if (form.expense_date) {
        payload.created_at = new Date(form.expense_date + 'T12:00:00').toISOString()
      }
      await supabase.from('expenses').insert(payload)
    }
    setLoading(false)
    onClose()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open title={type === 'order' ? 'New Order' : 'New Expense'} onClose={onClose}>
      {type === 'order' ? (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Customer Name</label>
            <input
              className="input-field"
              placeholder="Nama customer"
              value={form.customer_name}
              onChange={e => set('customer_name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Tanggal Open PO</label>
            <Select
              value={form.order_date}
              onChange={v => set('order_date', v)}
              options={dateOptions}
              placeholder="Pilih tanggal open PO (opsional)"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Product</label>
            <Select
              value={form.product_id}
              onChange={v => set('product_id', v)}
              options={productOptions}
              placeholder="Pilih produk"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Quantity</label>
              <input
                className="input-field"
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Shipping Fee</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.shipping_fee}
                onChange={e => set('shipping_fee', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Payment</label>
              <Select
                value={form.payment_method}
                onChange={v => set('payment_method', v)}
                options={PAYMENT_OPTIONS}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Status</label>
              <Select
                value={form.status}
                onChange={v => set('status', v)}
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Notes</label>
            <input
              className="input-field"
              placeholder="Opsional"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {selectedProduct && (
            <div className="bg-cream-lighter rounded-2xl p-4 space-y-1.5">
              <div className="flex justify-between text-xs text-cocoa/60">
                <span>Subtotal (excl. shipping)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {Number(form.shipping_fee) > 0 && (
                <div className="flex justify-between text-xs text-cocoa/60">
                  <span>Shipping</span>
                  <span>{formatCurrency(Number(form.shipping_fee))}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-cream">
                <span className="text-xs font-semibold text-cocoa">Total</span>
                <span className="text-base font-bold text-burgundy">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Nama Pengeluaran</label>
            <input
              className="input-field"
              placeholder="e.g. Tepung Takoyaki"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Tanggal Pengeluaran</label>
            <DatePickerCalendar
              value={form.expense_date}
              onChange={v => set('expense_date', v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Qty</label>
              <input
                className="input-field"
                type="number"
                min="1"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Total Harga (Rp)</label>
              <input
                className="input-field"
                type="number"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="50000"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Notes</label>
            <input
              className="input-field"
              placeholder="Opsional"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </Modal>
  )
}