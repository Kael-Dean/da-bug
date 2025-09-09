// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom"

const Sidebar = ({ isOpen, setIsOpen }) => {
  const base =
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
  const inactive =
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
  const active =
    "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"

  return (
    <>
      {/* Desktop rail */}
      <aside className="relative z-40 hidden w-60 shrink-0 border-r border-gray-200 bg-white p-3 md:flex md:flex-col dark:border-gray-800 dark:bg-gray-900">
        <BrandSmall />
        <NavSection base={base} active={active} inactive={inactive} />
        <Footer />
      </aside>

      {/* Mobile drawer (เริ่มใต้ topbar h-20) */}
      <aside
        className={`fixed left-0 top-20 bottom-0 z-40 w-72 transform border-r border-gray-200 bg-white p-3 transition-transform duration-300 md:hidden dark:border-gray-800 dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="mb-2 flex items-center justify-between">
          <BrandSmall />
          <button
            onClick={() => setIsOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <NavSection base={base} active={active} inactive={inactive} onNavigate={() => setIsOpen(false)} />
        <Footer />
      </aside>
    </>
  )
}

const BrandSmall = () => (
  <div className="flex items-center gap-2 px-1 py-1">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
      <span className="text-emerald-600 dark:text-emerald-400">🌾</span>
    </div>
    <div className="text-sm font-semibold">เมนู</div>
  </div>
)

/** เพิ่มลิงก์ /settings ตรงนี้ */
const NavSection = ({ base, active, inactive, onNavigate = () => {} }) => {
  return (
    <nav className="mt-2 space-y-1">
      {/* Home */}
      <NavLink
        to="/home"
        onClick={onNavigate}
        className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs dark:bg-gray-800">
          🏠
        </span>
        <span>หน้าหลัก</span>
      </NavLink>

      {/* Settings */}
      <NavLink
        to="/settings"
        onClick={onNavigate}
        className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs dark:bg-gray-800">
          ⚙️
        </span>
        <span>ตั้งค่า</span>
      </NavLink>

      {/* (ยังไม่เปิดใช้) Report */}
      <button
        className={`${base} ${inactive} w-full text-left`}
        type="button"
        onClick={() => alert("เมนูนี้ยังไม่เปิดใช้งาน")}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs dark:bg-gray-800">
          📦
        </span>
        <span>Report</span>
      </button>
    </nav>
  )
}

const Footer = () => (
  <div className="mt-auto rounded-xl border border-dashed border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
    <div className="font-medium text-gray-700 dark:text-gray-300">เวอร์ชัน</div>
    <div>v0.1.0 • mobile-first</div>
  </div>
)

export default Sidebar
