import { useState, useEffect, useRef } from 'react'
import { Plus, Search, FileText, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, exportToPDF, exportToExcel } from '../lib/export'
import Modal from '../components/Modal'
import Select from '../components/Select'
import ConfirmDialog from '../components/ConfirmDialog'

const FILTERS = ['All', 'Today', 'This Week', 'This Month']
const STATUS_OPTIONS = [{ value: 'process', label: 'In Progress' }, { value: 'done', label: 'Done' }]
const PAYMENT_OPTIONS = [{ value: 'cash', label: 'Cash' }, { value: 'tf', label: 'Transfer' }]

// Themed inline pill select — opens a small themed dropdown
function InlinePillSelect({ value, options, onChange, colorMap }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find(o => o.value === value)
  const colorClass = colorMap[value] || 'bg-cream-lighter text-cocoa'

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${colorClass} hover:opacity-80`}
      >
        {selected?.label}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white rounded-2xl shadow-float border border-cream/60 overflow-hidden min-w-[120px]">
          <div className="py-1.5">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors
                  ${opt.value === value ? 'bg-burgundy/5 text-burgundy' : 'text-olive hover:bg-cream-lighter'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [openPODates, setOpenPODates] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [form, setForm] = useState({
    customer_name: '', product_id: '', quantity: 1,
    payment_method: 'cash', shipping_fee: 0,
    notes: '', status: 'process', order_date: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchOrders(); fetchProducts(); fetchOpenPO() }, [filter])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*')
    setProducts(data || [])
  }

  async function fetchOpenPO() {
    const { data } = await supabase.from('open_po_dates').select('date').order('date', { ascending: true })
    setOpenPODates((data || []).map(d => d.date))
  }

  async function fetchOrders() {
    setLoading(true)
    let query = supabase.from('orders').select('*, products(name, price)').order('created_at', { ascending: false })
    const now = new Date()
    if (filter === 'Today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
      query = query.gte('created_at', start).lte('created_at', end)
    } else if (filter === 'This Week') {
      // Mon–Sun week
      const day = now.getDay() // 0=Sun
      const diffToMon = (day === 0) ? -6 : 1 - day
      const monday = new Date(now)
      monday.setDate(now.getDate() + diffToMon)
      monday.setHours(0, 0, 0, 0)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      query = query.gte('created_at', monday.toISOString()).lte('created_at', sunday.toISOString())
    } else if (filter === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
      query = query.gte('created_at', start).lte('created_at', end)
    }
    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }

  async function handleInlineUpdate(orderId, field, value) {
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [field]: value } : o))
  }

  const filtered = orders.filter(o => o.customer_name?.toLowerCase().includes(search.toLowerCase()))
  const totalQty = filtered.reduce((s, o) => s + (o.quantity || 0), 0)
  const totalShipping = filtered.reduce((s, o) => s + (o.shipping_fee || 0), 0)
  const totalRevenue = filtered.reduce((s, o) => s + (o.total_price || 0), 0)

  const selectedProduct = products.find(p => p.id === Number(form.product_id))
  const subtotal = selectedProduct ? selectedProduct.price * form.quantity : 0
  const computedTotal = subtotal + Number(form.shipping_fee || 0)

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name} — Rp ${p.price?.toLocaleString('id-ID')}`,
  }))

  const addDateOptions = openPODates.map(d => ({
    value: d,
    label: new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
  }))

  const editDateOptions = [
    { value: '', label: 'Tidak diubah' },
    ...openPODates.map(d => ({
      value: d,
      label: new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
    }))
  ]

  function openAdd() {
    const first = products[0]
    setForm({ customer_name: '', product_id: first?.id || '', quantity: 1, payment_method: 'cash', shipping_fee: 0, notes: '', status: 'process', order_date: '' })
    setModal('add')
  }

  function openEdit(order) {
    setForm({
      customer_name: order.customer_name,
      product_id: order.product_id,
      quantity: order.quantity,
      payment_method: order.payment_method,
      shipping_fee: order.shipping_fee || 0,
      notes: order.notes || '',
      status: order.status,
      order_date: '',
    })
    setModal(order)
  }

  async function handleSave() {
    const payload = {
      customer_name: form.customer_name,
      product_id: form.product_id,
      quantity: Number(form.quantity),
      total_price: computedTotal,
      payment_method: form.payment_method,
      shipping_fee: Number(form.shipping_fee || 0),
      notes: form.notes,
      status: form.status,
    }
    if (form.order_date) {
      payload.created_at = new Date(form.order_date).toISOString()
    }
    if (modal === 'add') await supabase.from('orders').insert(payload)
    else await supabase.from('orders').update(payload).eq('id', modal.id)
    setModal(null)
    fetchOrders()
  }

  async function handleDelete() {
    await supabase.from('orders').delete().eq('id', confirmId)
    setConfirmId(null)
    fetchOrders()
  }

  function handleExportPDF() {
    exportToPDF(
      `Orders — ${filter}`,
      [
        { header: '#', key: 'no' }, { header: 'Date', key: 'date' },
        { header: 'Customer', key: 'customer_name' }, { header: 'Qty', key: 'quantity' },
        { header: 'Total', key: 'total' }, { header: 'Payment', key: 'payment_method' },
        { header: 'Shipping', key: 'shipping' }, { header: 'Status', key: 'status' },
      ],
      filtered.map((o, i) => ({
        no: i + 1, date: formatDate(o.created_at), customer_name: o.customer_name,
        quantity: o.quantity, total: formatCurrency(o.total_price),
        payment_method: o.payment_method?.toUpperCase(),
        shipping: formatCurrency(o.shipping_fee), status: o.status,
      })),
      `orders_${filter.toLowerCase().replace(/ /g, '_')}`
    )
  }

  function handleExportExcel() {
    exportToExcel(
      'Orders',
      [
        { header: '#', key: 'no' }, { header: 'Date', key: 'date' },
        { header: 'Customer', key: 'customer_name' }, { header: 'Qty', key: 'quantity' },
        { header: 'Total', key: 'total' }, { header: 'Payment', key: 'payment_method' },
        { header: 'Shipping', key: 'shipping' }, { header: 'Notes', key: 'notes' },
        { header: 'Status', key: 'status' },
      ],
      filtered.map((o, i) => ({
        no: i + 1, date: formatDate(o.created_at), customer_name: o.customer_name,
        quantity: o.quantity, total: o.total_price, payment_method: o.payment_method,
        shipping: o.shipping_fee, notes: o.notes, status: o.status,
      })),
      `orders_${filter.toLowerCase().replace(/ /g, '_')}`
    )
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-olive">Orders</h1>
          <p className="text-sm text-cocoa/60 mt-0.5">Track customer orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-1.5 !px-3 !py-2">
            <FileText size={14} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-1.5 !px-3 !py-2">
            <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex bg-cream-lighter rounded-full p-0.5 self-start flex-shrink-0">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`pill-tab text-xs ${filter === f ? 'pill-tab-active' : 'pill-tab-inactive'}`}>{f}</button>
              ))}
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cocoa/40" />
              <input className="input-field !pl-9" placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <div className="bg-cream-lighter rounded-xl px-3 py-1.5">
                <p className="text-xs text-cocoa/60">Qty Sold</p>
                <p className="font-bold text-olive text-sm">{totalQty} pcs</p>
              </div>
              <div className="bg-cream-lighter rounded-xl px-3 py-1.5">
                <p className="text-xs text-cocoa/60">Shipping</p>
                <p className="font-bold text-olive text-sm">{formatCurrency(totalShipping)}</p>
              </div>
              <div className="bg-burgundy rounded-xl px-3 py-1.5">
                <p className="text-xs text-cream/60">Revenue</p>
                <p className="font-bold text-cream-lighter text-sm">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-cream/60">
                <th className="table-header">#</th>
                <th className="table-header">Date</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Qty</th>
                <th className="table-header">Total</th>
                <th className="table-header">Payment</th>
                <th className="table-header">Shipping</th>
                <th className="table-header">Notes</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-cocoa/40 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-cocoa/40 text-sm">No orders found</td></tr>
              ) : filtered.map((order, i) => (
                <tr key={order.id} className="table-row hover:bg-cream-lighter/50 transition-colors">
                  <td className="table-cell text-cocoa/40 font-medium">{i + 1}</td>
                  <td className="table-cell whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="table-cell font-semibold text-olive">{order.customer_name}</td>
                  <td className="table-cell">{order.quantity}</td>
                  <td className="table-cell font-semibold text-burgundy whitespace-nowrap">{formatCurrency(order.total_price)}</td>
                  <td className="table-cell">
                    <InlinePillSelect
                      value={order.payment_method}
                      options={PAYMENT_OPTIONS}
                      onChange={v => handleInlineUpdate(order.id, 'payment_method', v)}
                      colorMap={{ cash: 'bg-blue-50 text-blue-700', tf: 'bg-purple-50 text-purple-700' }}
                    />
                  </td>
                  <td className="table-cell">{formatCurrency(order.shipping_fee)}</td>
                  <td className="table-cell text-cocoa/60 max-w-[120px] truncate">{order.notes || '-'}</td>
                  <td className="table-cell">
                    <InlinePillSelect
                      value={order.status}
                      options={STATUS_OPTIONS}
                      onChange={v => handleInlineUpdate(order.id, 'status', v)}
                      colorMap={{ done: 'bg-emerald-50 text-emerald-700', process: 'bg-amber-50 text-amber-700' }}
                    />
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(order)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-cream transition-colors">
                        <Pencil size={13} className="text-cocoa/60" />
                      </button>
                      <button onClick={() => setConfirmId(order.id)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'New Order' : 'Edit Order'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Customer Name</label>
            <input className="input-field" placeholder="Nama customer" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">
              {modal === 'add' ? 'Tanggal Open PO' : 'Ubah Tanggal Open PO'}
            </label>
            <Select
              value={form.order_date}
              onChange={v => set('order_date', v)}
              options={modal === 'add' ? addDateOptions : editDateOptions}
              placeholder={modal === 'add' ? 'Pilih tanggal open PO (opsional)' : 'Pilih tanggal baru (opsional)'}
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
              <input className="input-field" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Shipping Fee</label>
              <input className="input-field" type="number" min="0" value={form.shipping_fee} onChange={e => set('shipping_fee', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Payment</label>
              <Select value={form.payment_method} onChange={v => set('payment_method', v)} options={PAYMENT_OPTIONS} />
            </div>
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Status</label>
              <Select value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Notes</label>
            <input className="input-field" placeholder="Opsional" value={form.notes} onChange={e => set('notes', e.target.value)} />
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
                <span className="text-base font-bold text-burgundy">{formatCurrency(computedTotal)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} className="btn-primary flex-1">Simpan</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Hapus Order?"
        message="Data order ini akan dihapus permanen dan tidak bisa dikembalikan."
      />

      <button onClick={openAdd} className="fab">
        <Plus size={24} />
      </button>
    </div>
  )
}