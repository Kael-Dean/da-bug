const Topbar = ({ onToggleSidebar, darkMode, setDarkMode }) => {
  return (
    <header className="sticky top-0 z-40 h-20 border-b border-gray-200/70 bg-white/80 backdrop-blur-md dark:border-gray-800/80 dark:bg-gray-900/70">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3 md:px-6">
        {/* ปุ่ม Hamburger (มือถือ) */}
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

        {/* ปุ่มสลับโหมด: สวิตช์พร้อมไอคอน */}
        <button
          type="button"
          role="switch"
          aria-checked={darkMode}
          onClick={() => setDarkMode((v) => !v)}
          title={darkMode ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
          className="group relative inline-flex h-10 w-[84px] items-center justify-between overflow-hidden rounded-xl border border-gray-200 bg-white px-2 text-xs font-medium shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          {/* ไอคอน Sun / Moon */}
          <span className="pointer-events-none inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364 6.364-1.414-1.414M8.05 8.05 6.636 6.636m10.728 0-1.414 1.414M8.05 15.95l-1.414 1.414" />
            </svg>
            <span className="hidden sm:inline">Light</span>
          </span>

          <span className="pointer-events-none inline-flex items-center gap-1 text-gray-500 dark:text-gray-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span className="hidden sm:inline">Dark</span>
          </span>

          {/* ปุ่มเลื่อน (thumb) */}
          <span
            className={`absolute left-1 top-1 h-8 w-8 rounded-lg bg-gray-900 text-white shadow-sm ring-1 ring-black/10 transition-transform duration-300 ease-out dark:bg-white dark:text-gray-900 dark:ring-white/20 ${
              darkMode ? "translate-x-[44px]" : "translate-x-0"
            }`}
          >
            {/* แอฟเฟ็กต์ไอคอนบน thumb */}
            <span className="absolute inset-0 grid place-items-center">
              {darkMode ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364 6.364-1.414-1.414M8.05 8.05 6.636 6.636m10.728 0-1.414 1.414M8.05 15.95l-1.414 1.414" />
                </svg>
              )}
            </span>
          </span>
        </button>
      </div>
    </header>
  )
}

export default Topbar
