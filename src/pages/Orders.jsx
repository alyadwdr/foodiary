import { useState, useEffect } from 'react'
import { Plus, Search, FileText, FileSpreadsheet, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, exportToPDF, exportToExcel } from '../lib/export'
import Modal from '../components/Modal'

const FILTERS = ['Today', 'This Week', 'This Month', 'All']
const STATUS_OPTIONS = [{ value: 'process', label: 'In Progress' }, { value: 'done', label: 'Done' }]
const PAYMENT_OPTIONS = [{ value: 'cash', label: 'Cash' }, { value: 'tf', label: 'Transfer' }]

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('Today')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'add' | {id, ...}
  const [form, setForm] = useState({ customer_name: '', product_id: '', quantity: 1, payment_method: 'cash', shipping_fee: 0, notes: '', status: 'process' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchOrders(); fetchProducts() }, [filter])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*')
    setProducts(data || [])
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
      const day = now.getDay()
      const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0)
      const end = new Date(now); end.setDate(now.getDate() + (6 - day)); end.setHours(23, 59, 59)
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
    } else if (filter === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
      query = query.gte('created_at', start).lte('created_at', end)
    }
    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }

  const filtered = orders.filter(o => o.customer_name?.toLowerCase().includes(search.toLowerCase()))
  const totalOrders = filtered.length
  const totalShipping = filtered.reduce((s, o) => s + (o.shipping_fee || 0), 0)
  const totalRevenue = filtered.reduce((s, o) => s + (o.total_price || 0), 0)

  const selectedProduct = products.find(p => p.id === Number(form.product_id))
  const computedTotal = selectedProduct ? selectedProduct.price * form.quantity : 0

  function openAdd() {
    const first = products[0]
    setForm({ customer_name: '', product_id: first?.id || '', quantity: 1, payment_method: 'cash', shipping_fee: 0, notes: '', status: 'process' })
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
    })
    setModal(order)
  }

  async function handleSave() {
    const payload = {
      customer_name: form.customer_name,
      product_id: form.product_id,
      quantity: Number(form.quantity),
      total_price: computedTotal + Number(form.shipping_fee),
      payment_method: form.payment_method,
      shipping_fee: Number(form.shipping_fee),
      notes: form.notes,
      status: form.status,
    }
    if (modal === 'add') await supabase.from('orders').insert(payload)
    else await supabase.from('orders').update(payload).eq('id', modal.id)
    setModal(null)
    fetchOrders()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this order?')) return
    await supabase.from('orders').delete().eq('id', id)
    fetchOrders()
  }

  function handleExportPDF() {
    exportToPDF(
      `Orders — ${filter}`,
      [
        { header: '#', key: 'no' },
        { header: 'Date', key: 'date' },
        { header: 'Customer', key: 'customer_name' },
        { header: 'Qty', key: 'quantity' },
        { header: 'Total', key: 'total' },
        { header: 'Payment', key: 'payment_method' },
        { header: 'Shipping', key: 'shipping' },
        { header: 'Status', key: 'status' },
      ],
      filtered.map((o, i) => ({
        no: i + 1,
        date: formatDate(o.created_at),
        customer_name: o.customer_name,
        quantity: o.quantity,
        total: formatCurrency(o.total_price),
        payment_method: o.payment_method?.toUpperCase(),
        shipping: formatCurrency(o.shipping_fee),
        status: o.status,
      })),
      `orders_${filter.toLowerCase().replace(/ /g, '_')}`
    )
  }

  function handleExportExcel() {
    exportToExcel(
      'Orders',
      [
        { header: '#', key: 'no' },
        { header: 'Date', key: 'date' },
        { header: 'Customer', key: 'customer_name' },
        { header: 'Qty', key: 'quantity' },
        { header: 'Total', key: 'total' },
        { header: 'Payment', key: 'payment_method' },
        { header: 'Shipping', key: 'shipping' },
        { header: 'Notes', key: 'notes' },
        { header: 'Status', key: 'status' },
      ],
      filtered.map((o, i) => ({
        no: i + 1,
        date: formatDate(o.created_at),
        customer_name: o.customer_name,
        quantity: o.quantity,
        total: o.total_price,
        payment_method: o.payment_method,
        shipping: o.shipping_fee,
        notes: o.notes,
        status: o.status,
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
        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-cream-lighter rounded-full p-0.5 self-start">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`pill-tab text-xs ${filter === f ? 'pill-tab-active' : 'pill-tab-inactive'}`}>{f}</button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cocoa/40" />
            <input className="input-field !pl-9" placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
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
                    <span className="px-2.5 py-1 bg-cream-lighter rounded-full text-xs font-medium text-cocoa capitalize">{order.payment_method}</span>
                  </td>
                  <td className="table-cell">{formatCurrency(order.shipping_fee)}</td>
                  <td className="table-cell text-cocoa/60 max-w-[120px] truncate">{order.notes || '-'}</td>
                  <td className="table-cell">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${order.status === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {order.status === 'done' ? 'Done' : 'In Progress'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(order)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-cream transition-colors">
                        <Pencil size={13} className="text-cocoa/60" />
                      </button>
                      <button onClick={() => handleDelete(order.id)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-4 pt-3 border-t border-cream/60">
          <div className="bg-cream-lighter rounded-2xl px-4 py-2.5">
            <p className="text-xs text-cocoa/60">Total Orders</p>
            <p className="font-bold text-olive">{totalOrders}</p>
          </div>
          <div className="bg-cream-lighter rounded-2xl px-4 py-2.5">
            <p className="text-xs text-cocoa/60">Total Shipping</p>
            <p className="font-bold text-olive">{formatCurrency(totalShipping)}</p>
          </div>
          <div className="bg-burgundy rounded-2xl px-4 py-2.5">
            <p className="text-xs text-cream/60">Total Revenue</p>
            <p className="font-bold text-cream-lighter">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'New Order' : 'Edit Order'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Customer Name</label>
            <input className="input-field" placeholder="Customer name" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Product</label>
            <select className="input-field" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — Rp {p.price?.toLocaleString('id-ID')}</option>)}
            </select>
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
              <select className="input-field" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Status</label>
              <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Notes</label>
            <input className="input-field" placeholder="Optional" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          {selectedProduct && (
            <div className="bg-cream-lighter rounded-2xl p-3">
              <p className="text-xs text-cocoa/60">Subtotal (excl. shipping)</p>
              <p className="font-bold text-burgundy">{formatCurrency(computedTotal)}</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1">Save</button>
        </div>
      </Modal>

      {/* FAB */}
      <button onClick={openAdd} className="fab">
        <Plus size={24} />
      </button>
    </div>
  )
}
