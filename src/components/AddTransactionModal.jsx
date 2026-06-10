import { useState, useEffect } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabase'

export default function AddTransactionModal({ type, onClose }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({
    customer_name: '', product_id: '', quantity: 1,
    name: '', amount: '', price: '', category: '', notes: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (type === 'order') {
      supabase.from('products').select('*').then(({ data }) => {
        setProducts(data || [])
        if (data?.length) setForm(f => ({ ...f, product_id: data[0].id }))
      })
    }
  }, [type])

  const selectedProduct = products.find(p => p.id === Number(form.product_id))
  const total = selectedProduct ? selectedProduct.price * form.quantity : 0

  async function handleSubmit() {
    setLoading(true)
    if (type === 'order') {
      await supabase.from('orders').insert({
        customer_name: form.customer_name,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        total_price: total,
        payment_method: 'cash',
        shipping_fee: 0,
        status: 'process',
      })
    } else {
      await supabase.from('expenses').insert({
        name: form.name,
        amount: Number(form.amount),
        price: Number(form.price),
        category: form.category,
        notes: form.notes,
      })
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
            <input className="input-field" placeholder="e.g. Budi" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Product</label>
            <select className="input-field" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — Rp {p.price.toLocaleString('id-ID')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Quantity (portions)</label>
            <input className="input-field" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </div>
          {selectedProduct && (
            <div className="bg-cream-lighter rounded-2xl p-4">
              <p className="text-xs text-cocoa/60">Total Price</p>
              <p className="text-lg font-bold text-burgundy mt-0.5">Rp {total.toLocaleString('id-ID')}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Expense Name</label>
            <input className="input-field" placeholder="e.g. Takoyaki flour" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Qty</label>
              <input className="input-field" type="number" min="1" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Total Price (Rp)</label>
              <input className="input-field" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="50000" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Notes</label>
            <input className="input-field" placeholder="Optional" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
      )}
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
