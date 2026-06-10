import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/export'
import Modal from '../components/Modal'

export default function Products() {
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', description: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: true })
    setProducts(data || [])
  }

  function openAdd() {
    setForm({ name: '', price: '', description: '' })
    setModal('add')
  }
  function openEdit(p) {
    setForm({ name: p.name, price: p.price, description: p.description || '' })
    setModal(p)
  }

  async function handleSave() {
    setLoading(true)
    const payload = { name: form.name, price: Number(form.price), description: form.description }
    if (modal === 'add') await supabase.from('products').insert(payload)
    else await supabase.from('products').update(payload).eq('id', modal.id)
    setLoading(false)
    setModal(null)
    fetchProducts()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product? This may affect existing orders.')) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-olive">Products</h1>
        <p className="text-sm text-cocoa/60 mt-0.5">Manage your menu & prices</p>
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-cocoa/40">
          <Package size={40} strokeWidth={1.5} />
          <p className="mt-3 font-medium">No products yet</p>
          <p className="text-sm mt-1">Add your first product to get started</p>
          <button onClick={openAdd} className="btn-primary mt-4">Add Product</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="card group relative overflow-hidden">
              {/* Product icon area */}
              <div className="w-full h-24 bg-gradient-to-br from-cream to-cream-lighter rounded-2xl flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-burgundy/10 rounded-2xl flex items-center justify-center">
                  <Package size={22} className="text-burgundy" />
                </div>
              </div>
              <h3 className="font-bold text-olive text-base">{p.name}</h3>
              {p.description && <p className="text-xs text-cocoa/50 mt-1 line-clamp-2">{p.description}</p>}
              <p className="text-lg font-bold text-burgundy mt-3">{formatCurrency(p.price)}</p>
              <p className="text-xs text-cocoa/40 mt-0.5">per portion</p>
              <div className="flex gap-2 mt-4 pt-4 border-t border-cream/50">
                <button onClick={() => openEdit(p)} className="flex-1 btn-secondary !py-2 flex items-center justify-center gap-1.5 text-xs">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => handleDelete(p.id)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <button onClick={openAdd} className="card border-2 border-dashed border-cream flex flex-col items-center justify-center py-10 text-cocoa/40 hover:border-burgundy/30 hover:text-burgundy/60 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-full bg-cream-lighter flex items-center justify-center group-hover:bg-burgundy/10 transition-colors">
              <Plus size={18} />
            </div>
            <p className="text-sm font-medium mt-2">Add Product</p>
          </button>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'New Product' : 'Edit Product'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Product Name</label>
            <input className="input-field" placeholder="e.g. Takoyaki 8 Ball" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Price per Portion (Rp)</label>
            <input className="input-field" type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="15000" />
          </div>
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Description (optional)</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Short description..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={loading || !form.name || !form.price} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      <button onClick={openAdd} className="fab">
        <Plus size={24} />
      </button>
    </div>
  )
}
