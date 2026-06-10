import { useState, useEffect } from 'react'
import { FileText, FileSpreadsheet, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../lib/supabase'
import { formatCurrency, exportToPDF, exportToExcel } from '../lib/export'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const now = new Date()

export default function Reports() {
  const [viewMode, setViewMode] = useState('monthly') // 'monthly' | 'yearly'
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [data, setData] = useState({ revenue: 0, expenses: 0, profit: 0 })
  const [chartData, setChartData] = useState([])
  const [orderRows, setOrderRows] = useState([])
  const [expenseRows, setExpenseRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchReport() }, [viewMode, selectedMonth, selectedYear])

  async function fetchReport() {
    setLoading(true)
    let start, end
    if (viewMode === 'monthly') {
      start = new Date(selectedYear, selectedMonth, 1).toISOString()
      end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString()
    } else {
      start = new Date(selectedYear, 0, 1).toISOString()
      end = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString()
    }

    const [ordersRes, expensesRes] = await Promise.all([
      supabase.from('orders').select('*').gte('created_at', start).lte('created_at', end),
      supabase.from('expenses').select('*').gte('created_at', start).lte('created_at', end),
    ])

    const orders = ordersRes.data || []
    const expenses = expensesRes.data || []

    const revenue = orders.reduce((s, o) => s + (o.total_price - (o.shipping_fee || 0)), 0)
    const totalExpenses = expenses.reduce((s, e) => s + (e.price || 0), 0)
    setData({ revenue, expenses: totalExpenses, profit: revenue - totalExpenses })
    setOrderRows(orders)
    setExpenseRows(expenses)

    // Build monthly breakdown for yearly view
    if (viewMode === 'yearly') {
      const monthMap = {}
      MONTHS.forEach((m, i) => { monthMap[i] = { name: m, revenue: 0, expenses: 0 } })
      orders.forEach(o => {
        const m = new Date(o.created_at).getMonth()
        monthMap[m].revenue += o.total_price - (o.shipping_fee || 0)
      })
      expenses.forEach(e => {
        const m = new Date(e.created_at).getMonth()
        monthMap[m].expenses += e.price || 0
      })
      setChartData(Object.values(monthMap))
    } else {
      // Weekly breakdown for monthly view
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
      const weeks = Math.ceil(daysInMonth / 7)
      const weekMap = Array.from({ length: weeks }, (_, i) => ({ name: `W${i + 1}`, revenue: 0, expenses: 0 }))
      orders.forEach(o => {
        const day = new Date(o.created_at).getDate()
        const wk = Math.min(Math.floor((day - 1) / 7), weeks - 1)
        weekMap[wk].revenue += o.total_price - (o.shipping_fee || 0)
      })
      expenses.forEach(e => {
        const day = new Date(e.created_at).getDate()
        const wk = Math.min(Math.floor((day - 1) / 7), weeks - 1)
        weekMap[wk].expenses += e.price || 0
      })
      setChartData(weekMap)
    }
    setLoading(false)
  }

  const periodLabel = viewMode === 'monthly' ? `${MONTHS[selectedMonth]} ${selectedYear}` : `Year ${selectedYear}`

  function handleExportPDF() {
    const cols = [
      { header: 'Metric', key: 'metric' },
      { header: 'Value', key: 'value' },
    ]
    const rows = [
      { metric: 'Period', value: periodLabel },
      { metric: 'Total Revenue', value: formatCurrency(data.revenue) },
      { metric: 'Total Expenses', value: formatCurrency(data.expenses) },
      { metric: 'Net Profit', value: formatCurrency(data.profit) },
    ]
    exportToPDF(`Financial Report — ${periodLabel}`, cols, rows, `report_${periodLabel.replace(/ /g, '_')}`)
  }

  function handleExportExcel() {
    const orderCols = [
      { header: 'Date', key: 'date' }, { header: 'Customer', key: 'c' },
      { header: 'Qty', key: 'q' }, { header: 'Revenue', key: 'r' }, { header: 'Shipping', key: 's' }
    ]
    const expCols = [
      { header: 'Date', key: 'date' }, { header: 'Item', key: 'n' },
      { header: 'Qty', key: 'a' }, { header: 'Price', key: 'p' }
    ]
    // Export summary sheet
    exportToExcel(
      'Summary',
      [{ header: 'Metric', key: 'm' }, { header: 'Value', key: 'v' }],
      [
        { m: 'Period', v: periodLabel },
        { m: 'Total Revenue', v: data.revenue },
        { m: 'Total Expenses', v: data.expenses },
        { m: 'Net Profit', v: data.profit },
      ],
      `report_${periodLabel.replace(/ /g, '_')}`
    )
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-olive">Reports</h1>
          <p className="text-sm text-cocoa/60 mt-0.5">Financial summary & analytics</p>
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

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-cream-lighter rounded-full p-0.5">
            <button onClick={() => setViewMode('monthly')} className={`pill-tab text-xs ${viewMode === 'monthly' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Monthly</button>
            <button onClick={() => setViewMode('yearly')} className={`pill-tab text-xs ${viewMode === 'yearly' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Yearly</button>
          </div>
          {viewMode === 'monthly' && (
            <select className="input-field !w-auto" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          )}
          <select className="input-field !w-auto" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-burgundy">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-cream/60 font-medium uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-cream-lighter mt-2">{formatCurrency(data.revenue)}</p>
              <p className="text-xs text-cream/50 mt-1">{periodLabel}</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <TrendingUp size={18} className="text-cream-lighter" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-cocoa/60 font-medium uppercase tracking-wider">Total Expenses</p>
              <p className="text-2xl font-bold text-olive mt-2">{formatCurrency(data.expenses)}</p>
              <p className="text-xs text-cocoa/50 mt-1">{periodLabel}</p>
            </div>
            <div className="w-10 h-10 bg-cream-lighter rounded-2xl flex items-center justify-center">
              <TrendingDown size={18} className="text-cocoa" />
            </div>
          </div>
        </div>
        <div className={`card ${data.profit >= 0 ? 'bg-olive' : 'border-2 border-red-200'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${data.profit >= 0 ? 'text-cream/60' : 'text-red-500/70'}`}>Net Profit</p>
              <p className={`text-2xl font-bold mt-2 ${data.profit >= 0 ? 'text-cream-lighter' : 'text-red-600'}`}>{formatCurrency(data.profit)}</p>
              <p className={`text-xs mt-1 ${data.profit >= 0 ? 'text-cream/50' : 'text-red-400/70'}`}>{periodLabel}</p>
            </div>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${data.profit >= 0 ? 'bg-white/10' : 'bg-red-50'}`}>
              <Wallet size={18} className={data.profit >= 0 ? 'text-cream-lighter' : 'text-red-500'} />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h2 className="font-semibold text-olive mb-5">Revenue vs Expenses — {periodLabel}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDD9BE" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#402814', opacity: 0.6 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#402814', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name === 'revenue' ? 'Revenue' : 'Expenses']}
              contentStyle={{ background: '#fff', border: 'none', borderRadius: 16, boxShadow: '0 4px 32px rgba(13,12,0,0.1)', fontSize: 12 }}
            />
            <Legend formatter={v => v === 'revenue' ? 'Revenue' : 'Expenses'} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="revenue" fill="#400106" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" fill="#D9B991" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-olive mb-4">Orders Detail</h3>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-cream/60">
                  <th className="table-header">Customer</th>
                  <th className="table-header">Qty</th>
                  <th className="table-header">Revenue</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {orderRows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-cocoa/40 text-sm">No orders</td></tr>
                ) : orderRows.slice(0, 10).map(o => (
                  <tr key={o.id} className="table-row">
                    <td className="table-cell font-medium text-olive">{o.customer_name}</td>
                    <td className="table-cell">{o.quantity}</td>
                    <td className="table-cell text-burgundy font-semibold">{formatCurrency(o.total_price - (o.shipping_fee || 0))}</td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.status === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {o.status === 'done' ? 'Done' : 'In Progress'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orderRows.length > 10 && <p className="text-xs text-cocoa/40 text-center mt-2">+{orderRows.length - 10} more orders</p>}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-olive mb-4">Expenses Detail</h3>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[300px]">
              <thead>
                <tr className="border-b border-cream/60">
                  <th className="table-header">Item</th>
                  <th className="table-header">Qty</th>
                  <th className="table-header">Price</th>
                </tr>
              </thead>
              <tbody>
                {expenseRows.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-6 text-cocoa/40 text-sm">No expenses</td></tr>
                ) : expenseRows.slice(0, 10).map(e => (
                  <tr key={e.id} className="table-row">
                    <td className="table-cell font-medium text-olive">{e.name}</td>
                    <td className="table-cell">{e.amount}</td>
                    <td className="table-cell text-burgundy font-semibold">{formatCurrency(e.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenseRows.length > 10 && <p className="text-xs text-cocoa/40 text-center mt-2">+{expenseRows.length - 10} more expenses</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
