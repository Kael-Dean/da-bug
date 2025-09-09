const Topbar = ({ onToggleSidebar, darkMode, setDarkMode }) => {
  return (
    <header className="sticky top-0 z-40 h-20 border-b border-gray-200/70 bg-white/80 backdrop-blur-md dark:border-gray-800/80 dark:bg-gray-900/70">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3 md:px-6">
        {/* Hamburger (มือถือ) */}
        <button
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-[0.98] md:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* โลโก้ + ชื่อ */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <span className="text-xl leading-none text-emerald-600 dark:text-emerald-400">🪲</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Gian Water Bug</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">DR.duang</div>
          </div>
        </div>

        <div className="ml-auto" />

        {/* ปุ่มธีมใหม่ */}
        <ThemeToggleGlow darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>
    </header>
  )
}

/** ---------- NEW: Icon-only glowing toggle ---------- */
function ThemeToggleGlow({ darkMode, setDarkMode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={darkMode}
      onClick={() => setDarkMode(v => !v)}
      title={darkMode ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      className={[
        // track
        "relative inline-flex h-10 w-20 items-center rounded-full px-1",
        "border shadow-sm transition-colors",
        darkMode
          ? "border-gray-800 bg-[#0f172a]" // slate-900-ish
          : "border-gray-200 bg-white",
        // ตรงนี้ลบ focus:ring-* ออก
        "focus:outline-none",
      ].join(" ")}
    >
      {/* แสงเรืองเล็ก ๆ ของ track */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0 rounded-full",
          darkMode
            ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_8px_20px_rgba(0,0,0,0.35)]"
            : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.06)]",
        ].join(" ")}
      />

      {/* Sun / Moon icons */}
      <span className="pointer-events-none absolute left-2 grid h-6 w-6 place-items-center text-gray-400">
        <SunIcon className="h-4 w-4" />
      </span>
      <span className="pointer-events-none absolute right-2 grid h-6 w-6 place-items-center text-gray-400">
        <MoonIcon className="h-4 w-4" />
      </span>

      {/* thumb */}
      <span
        aria-hidden
        className={[
          "relative z-10 grid h-8 w-8 place-items-center rounded-full ring-1 transition-all duration-200 ease-out",
          darkMode
            ? "translate-x-[40px] bg-white text-gray-900 ring-black/10 shadow"
            : "translate-x-0 bg-gray-900 text-white ring-black/10 shadow",
        ].join(" ")}
      >
        {darkMode ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
      </span>
    </button>
  )
}


/** ---------- Icons ---------- */
function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <path strokeWidth="2" d="M12 2v2m0 16v2M4 12H2m20 0h-2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M17.66 6.34l1.41-1.41M4.93 19.07l1.41-1.41" />
    </svg>
  )
}
function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="2" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default Topbar
