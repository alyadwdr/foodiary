import { useState, useEffect } from 'react'
import { Plus, TrendingUp, ShoppingBag, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/export'
import Modal from '../components/Modal'
import AddTransactionModal from '../components/AddTransactionModal'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Dashboard() {
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [openPODates, setOpenPODates] = useState([])
  const [chartView, setChartView] = useState('month') // 'month' | 'year'
  const [chartData, setChartData] = useState([])
  const [stats, setStats] = useState({ orders: 0, revenue: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [fabOpen, setFabOpen] = useState(false)
  const [addModal, setAddModal] = useState(null) // 'order' | 'expense'
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const [ordersRes, recentRes, poRes] = await Promise.all([
      supabase.from('orders').select('total_price, shipping_fee, created_at').gte('created_at', monthStart).lte('created_at', monthEnd),
      supabase.from('orders').select('id, customer_name, quantity, total_price, created_at, status').order('created_at', { ascending: false }).limit(3),
      supabase.from('open_po_dates').select('date'),
    ])

    const orders = ordersRes.data || []
    const revenue = orders.reduce((s, o) => s + (o.total_price - (o.shipping_fee || 0)), 0)
    setStats({ orders: orders.length, revenue })
    setRecentOrders(recentRes.data || [])

    const poDates = (poRes.data || []).map(d => d.date)
    setOpenPODates(poDates)

    buildChartData(orders, 'month', now)
    setLoading(false)
  }

  async function fetchChartData(view) {
    const now = new Date()
    let start, end
    if (view === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    } else {
      start = new Date(now.getFullYear(), 0, 1).toISOString()
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString()
    }
    const { data } = await supabase.from('orders').select('total_price, shipping_fee, created_at').gte('created_at', start).lte('created_at', end)
    buildChartData(data || [], view, now)
  }

  function buildChartData(orders, view, now) {
    if (view === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const map = {}
      for (let d = 1; d <= daysInMonth; d++) map[d] = 0
      orders.forEach(o => {
        const day = new Date(o.created_at).getDate()
        map[day] = (map[day] || 0) + (o.total_price - (o.shipping_fee || 0))
      })
      setChartData(Object.entries(map).map(([d, v]) => ({ name: d, revenue: v })))
    } else {
      const map = {}
      MONTHS.forEach((m, i) => { map[i] = 0 })
      orders.forEach(o => {
        const month = new Date(o.created_at).getMonth()
        map[month] = (map[month] || 0) + (o.total_price - (o.shipping_fee || 0))
      })
      setChartData(MONTHS.map((m, i) => ({ name: m, revenue: map[i] })))
    }
  }

  function handleChartView(v) {
    setChartView(v)
    fetchChartData(v)
  }

  // Calendar helpers
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInCal = new Date(calYear, calMonth + 1, 0).getDate()

  async function togglePO(dateStr) {
    if (openPODates.includes(dateStr)) {
      await supabase.from('open_po_dates').delete().eq('date', dateStr)
      setOpenPODates(prev => prev.filter(d => d !== dateStr))
    } else {
      await supabase.from('open_po_dates').insert({ date: dateStr })
      setOpenPODates(prev => [...prev, dateStr])
    }
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-olive">Dashboard</h1>
        <p className="text-sm text-cocoa/60 mt-0.5">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-cocoa/60 font-medium uppercase tracking-wider">Orders This Month</p>
              <p className="text-3xl font-bold text-olive mt-2">{stats.orders}</p>
              <p className="text-xs text-cocoa/50 mt-1">orders</p>
            </div>
            <div className="w-10 h-10 bg-cream-lighter rounded-2xl flex items-center justify-center">
              <ShoppingBag size={18} className="text-burgundy" />
            </div>
          </div>
        </div>
        <div className="card bg-burgundy">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-cream/60 font-medium uppercase tracking-wider">Revenue This Month</p>
              <p className="text-xl lg:text-2xl font-bold text-cream-lighter mt-2">{formatCurrency(stats.revenue)}</p>
              <p className="text-xs text-cream/50 mt-1">excl. shipping</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <TrendingUp size={18} className="text-cream-lighter" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-olive">Revenue Overview</h2>
          <div className="flex bg-cream-lighter rounded-full p-0.5">
            <button onClick={() => handleChartView('month')} className={`pill-tab text-xs ${chartView === 'month' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>This Month</button>
            <button onClick={() => handleChartView('year')} className={`pill-tab text-xs ${chartView === 'year' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>This Year</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDD9BE" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#402814', opacity: 0.6 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#402814', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
            <Tooltip
              formatter={(value) => [formatCurrency(value), 'Revenue']}
              contentStyle={{ background: '#fff', border: 'none', borderRadius: 16, boxShadow: '0 4px 32px rgba(13,12,0,0.1)', fontSize: 12 }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#400106" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#400106' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calendar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-olive">Open PO Schedule</h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-cream-lighter transition-colors">
                <ChevronLeft size={14} className="text-cocoa" />
              </button>
              <span className="text-sm font-medium text-olive min-w-[100px] text-center">{MONTHS[calMonth]} {calYear}</span>
              <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-cream-lighter transition-colors">
                <ChevronRight size={14} className="text-cocoa" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-xs text-cocoa/50 font-medium py-1">{d}</div>)}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInCal }).map((_, i) => {
              const day = i + 1
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = dateStr === todayStr
              const isOpenPO = openPODates.includes(dateStr)
              return (
                <button
                  key={day}
                  onClick={() => togglePO(dateStr)}
                  className={`
                    aspect-square flex items-center justify-center text-xs rounded-xl font-medium transition-all duration-150
                    ${isOpenPO ? 'bg-burgundy text-cream-lighter' : isToday ? 'bg-cream text-olive ring-2 ring-burgundy/30' : 'hover:bg-cream-lighter text-olive/70'}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-cocoa/50 mt-3 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-burgundy inline-block" /> Tap date to toggle Open PO
          </p>
        </div>

        {/* Recent orders */}
        <div className="card">
          <h2 className="font-semibold text-olive mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-cocoa/40">
              <ShoppingBag size={32} strokeWidth={1.5} />
              <p className="text-sm mt-2">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-cream/40 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-olive">{order.customer_name}</p>
                    <p className="text-xs text-cocoa/50 mt-0.5">{formatDate(order.created_at)} · {order.quantity} pcs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-burgundy">{formatCurrency(order.total_price)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.status === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {order.status === 'done' ? 'Done' : 'In Progress'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40">
        {fabOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2 items-end">
            <button onClick={() => { setAddModal('order'); setFabOpen(false) }} className="flex items-center gap-2 bg-white shadow-float rounded-full px-4 py-2.5 text-sm font-medium text-olive hover:bg-cream-lighter transition-colors">
              <ShoppingBag size={15} className="text-burgundy" /> New Order
            </button>
            <button onClick={() => { setAddModal('expense'); setFabOpen(false) }} className="flex items-center gap-2 bg-white shadow-float rounded-full px-4 py-2.5 text-sm font-medium text-olive hover:bg-cream-lighter transition-colors">
              <Receipt size={15} className="text-burgundy" /> New Expense
            </button>
          </div>
        )}
        <button onClick={() => setFabOpen(o => !o)} className="fab">
          <Plus size={24} className={`transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {addModal && (
        <AddTransactionModal
          type={addModal}
          onClose={() => { setAddModal(null); fetchData() }}
        />
      )}
    </div>
  )
}
