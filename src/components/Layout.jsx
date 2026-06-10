import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, Receipt, BarChart3, Package,
  Menu, X, ChefHat
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/orders', icon: ShoppingBag, label: 'Orders' },
  { path: '/expenses', icon: Receipt, label: 'Expenses' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/products', icon: Package, label: 'Products' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-cream-lighter">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-olive/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-olive flex flex-col z-40 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-9 h-9 bg-burgundy rounded-xl flex items-center justify-center">
            <ChefHat size={18} className="text-cream-lighter" />
          </div>
          <div>
            <p className="font-bold text-cream-lighter tracking-wide">Foodiary</p>
            <p className="text-xs text-cream/50">Takoyaki Business</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-burgundy text-cream-lighter'
                  : 'text-cream/60 hover:text-cream-lighter hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom branding */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-cream/30 text-center">© 2025 Foodiary</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-white/80 backdrop-blur border-b border-cream/60 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-burgundy rounded-lg flex items-center justify-center">
              <ChefHat size={14} className="text-cream-lighter" />
            </div>
            <span className="font-bold text-olive text-sm">Foodiary</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-cream-lighter"
          >
            <Menu size={18} className="text-olive" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
