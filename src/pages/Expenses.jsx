import { useState, useEffect } from 'react'
import { Plus, Search, FileText, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, exportToPDF, exportToExcel } from '../lib/export'
import Modal from '../components/Modal'
import Select from '../components/Select'
import ConfirmDialog from '../components/ConfirmDialog'

const FILTERS = ['Today', 'This Month', 'This Year', 'All']

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [openPODates, setOpenPODates] = useState([])
  const [filter, setFilter] = useState('Today')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [form, setForm] = useState({ name: '', amount: 1, price: '', notes: '', expense_date: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchExpenses(); fetchOpenPO() }, [filter])

  async function fetchOpenPO() {
    const { data } = await supabase.from('open_po_dates').select('date').order('date', { ascending: true })
    setOpenPODates((data || []).map(d => d.date))
  }

  async function fetchExpenses() {
    setLoading(true)
    let query = supabase.from('expenses').select('*').order('created_at', { ascending: false })
    const now = new Date()
    if (filter === 'Today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
      query = query.gte('created_at', start).lte('created_at', end)
    } else if (filter === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
      query = query.gte('created_at', start).lte('created_at', end)
    } else if (filter === 'This Year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString()
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString()
      query = query.gte('created_at', start).lte('created_at', end)
    }
    const { data } = await query
    setExpenses(data || [])
    setLoading(false)
  }

  const filtered = expenses.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()))
  const totalExpenses = filtered.reduce((s, e) => s + (e.price || 0), 0)

  const dateOptions = openPODates.map(d => ({
    value: d,
    label: new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
  }))

  function openAdd() {
    setForm({ name: '', amount: 1, price: '', notes: '', expense_date: '' })
    setModal('add')
  }

  function openEdit(exp) {
    setForm({ name: exp.name, amount: exp.amount, price: exp.price, notes: exp.notes || '', expense_date: '' })
    setModal(exp)
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      amount: Number(form.amount),
      price: Number(form.price),
      notes: form.notes,
    }
    if (modal === 'add' && form.expense_date) {
      payload.created_at = new Date(form.expense_date).toISOString()
    }
    if (modal === 'add') await supabase.from('expenses').insert(payload)
    else await supabase.from('expenses').update(payload).eq('id', modal.id)
    setModal(null)
    fetchExpenses()
  }

  async function handleDelete() {
    await supabase.from('expenses').delete().eq('id', confirmId)
    setConfirmId(null)
    fetchExpenses()
  }

  function handleExportPDF() {
    exportToPDF(
      `Expenses — ${filter}`,
      [
        { header: '#', key: 'no' }, { header: 'Date', key: 'date' },
        { header: 'Item', key: 'name' }, { header: 'Qty', key: 'amount' },
        { header: 'Price', key: 'price' }, { header: 'Notes', key: 'notes' },
      ],
      filtered.map((e, i) => ({
        no: i + 1, date: formatDate(e.created_at), name: e.name,
        amount: e.amount, price: formatCurrency(e.price), notes: e.notes || '-',
      })),
      `expenses_${filter.toLowerCase().replace(/ /g, '_')}`
    )
  }

  function handleExportExcel() {
    exportToExcel(
      'Expenses',
      [
        { header: '#', key: 'no' }, { header: 'Date', key: 'date' },
        { header: 'Item', key: 'name' }, { header: 'Qty', key: 'amount' },
        { header: 'Price', key: 'price' }, { header: 'Notes', key: 'notes' },
      ],
      filtered.map((e, i) => ({
        no: i + 1, date: formatDate(e.created_at), name: e.name,
        amount: e.amount, price: e.price, notes: e.notes || '',
      })),
      `expenses_${filter.toLowerCase().replace(/ /g, '_')}`
    )
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-olive">Expenses</h1>
          <p className="text-sm text-cocoa/60 mt-0.5">Track your business spending</p>
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-cream-lighter rounded-full p-0.5 self-start">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`pill-tab text-xs ${filter === f ? 'pill-tab-active' : 'pill-tab-inactive'}`}>{f}</button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cocoa/40" />
            <input className="input-field !pl-9" placeholder="Search expense..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-cream/60">
                <th className="table-header">#</th>
                <th className="table-header">Date</th>
                <th className="table-header">Item</th>
                <th className="table-header">Qty</th>
                <th className="table-header">Price</th>
                <th className="table-header">Notes</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-cocoa/40 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-cocoa/40 text-sm">No expenses found</td></tr>
              ) : filtered.map((exp, i) => (
                <tr key={exp.id} className="table-row hover:bg-cream-lighter/50 transition-colors">
                  <td className="table-cell text-cocoa/40 font-medium">{i + 1}</td>
                  <td className="table-cell whitespace-nowrap">{formatDate(exp.created_at)}</td>
                  <td className="table-cell font-semibold text-olive">{exp.name}</td>
                  <td className="table-cell">{exp.amount}</td>
                  <td className="table-cell font-semibold text-burgundy">{formatCurrency(exp.price)}</td>
                  <td className="table-cell text-cocoa/60 max-w-[140px] truncate">{exp.notes || '-'}</td>
                  <td className="table-cell">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(exp)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-cream transition-colors">
                        <Pencil size={13} className="text-cocoa/60" />
                      </button>
                      <button onClick={() => setConfirmId(exp.id)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4 pt-3 border-t border-cream/60">
          <div className="bg-burgundy rounded-2xl px-4 py-2.5">
            <p className="text-xs text-cream/60">Total Expenses</p>
            <p className="font-bold text-cream-lighter">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'New Expense' : 'Edit Expense'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Nama Pengeluaran</label>
            <input className="input-field" placeholder="e.g. Tepung Takoyaki" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {modal === 'add' && (
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Tanggal Open PO</label>
              <Select
                value={form.expense_date}
                onChange={v => set('expense_date', v)}
                options={dateOptions}
                placeholder="Pilih tanggal (opsional)"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Quantity</label>
              <input className="input-field" type="number" min="1" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Total Harga (Rp)</label>
              <input className="input-field" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="50000" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cocoa/60 mb-1.5 block">Notes</label>
            <input className="input-field" placeholder="Opsional" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(null)} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} className="btn-primary flex-1">Simpan</button>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Hapus Pengeluaran?"
        message="Data pengeluaran ini akan dihapus permanen dan tidak bisa dikembalikan."
      />

      <button onClick={openAdd} className="fab">
        <Plus size={24} />
      </button>
    </div>
  )
}