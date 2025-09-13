import { useEffect, useMemo, useState } from "react"

/** ---------- ENV ---------- */
const API_BASE = import.meta.env.VITE_API_BASE || ""

/** ---------- CONFIG (อิงจาก Setting.jsx ให้ key/label/unit ตรงกัน) ---------- */
const METRICS_CONFIG = [
  { key: "temp",      label: "อุณหภูมิ", unit: "°C" },
  { key: "turbidity", label: "ความขุ่น", unit: "NTU" },
  { key: "salinity",  label: "ความเค็ม", unit: "ppt" },
  { key: "level",     label: "ระดับน้ำ", unit: "cm" },
]

/** ---------- Utils ---------- */
const fmtDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : "")
const today = () => fmtDate(new Date())

function monthToRange(yyyyMm) {
  // รับรูปแบบ YYYY-MM -> คืนช่วงวันแรกถึงวันสุดท้าย (รวมวันสุดท้าย)
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return { from: "", to: "" }
  const [y, m] = yyyyMm.split("-").map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0) // day 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้
  return { from: fmtDate(start), to: fmtDate(end) }
}

function fileName({ mode, from, to }) {
  const stamp = new Date().toISOString().slice(0, 10)
  return `sensor-report_${mode === "month" ? "by-month_" : ""}${from}_${to}_${stamp}.xlsx`
}

function unique(arr) { return Array.from(new Set(arr)) }

export default function Report() {
  /** ---------- Local state ---------- */
  const [mode, setMode] = useState("date") // "date" | "month"

  // date-mode
  const [fromDate, setFromDate] = useState(today())
  const [toDate, setToDate] = useState(today())

  // month-mode
  const [fromMonth, setFromMonth] = useState("") // YYYY-MM
  const [toMonth, setToMonth] = useState("") // YYYY-MM

  // metrics
  const [selected, setSelected] = useState(["temp", "turbidity", "salinity", "level"]) // default เลือกทั้งหมด

  // settings จาก backend (ใช้ preset auto เลือก metric ที่เปิดใช้อยู่)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [backendEnabledMetrics, setBackendEnabledMetrics] = useState([])

  // ui feedback
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState("")
  const [ok, setOk] = useState("")

  const useMock = !API_BASE

  /** ---------- Load current settings เพื่อรู้ว่า metric ไหนถูกเปิดอยู่ ---------- */
  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoadingSettings(true)
      setError("")
      try {
        if (!useMock) {
          const res = await fetch(`${API_BASE}/sensor/settings`)
          if (!res.ok) throw new Error(`Bad status ${res.status}`)
          const json = await res.json()
          const enabled = Object.entries(json?.metrics || {})
            .filter(([, v]) => !!v?.enabled)
            .map(([k]) => k)
          if (!ignore) setBackendEnabledMetrics(enabled)
        } else {
          // mock: ลองโหลดจาก localStorage ของหน้า Setting ถ้ามี
          const raw = localStorage.getItem("water_alert_settings")
          if (raw) {
            const obj = JSON.parse(raw)
            const enabled = Object.entries(obj?.metrics || {})
              .filter(([, v]) => !!v?.enabled)
              .map(([k]) => k)
            if (!ignore) setBackendEnabledMetrics(enabled)
          }
        }
      } catch (e) {
        console.warn(e)
      } finally {
        setLoadingSettings(false)
      }
    })()
    return () => { ignore = true }
  }, [API_BASE, useMock])

  /** ---------- Derived ---------- */
  const metricsList = METRICS_CONFIG
  const allKeys = useMemo(() => metricsList.map(m => m.key), [metricsList])
  const anyChecked = selected.length > 0

  /** ---------- Handlers ---------- */
  function toggleMetric(k) {
    setSelected(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])
  }
  function selectAll() { setSelected(allKeys) }
  function selectNone() { setSelected([]) }
  function selectEnabled() {
    setSelected(prev => {
      // ถ้า backend ยังไม่รู้ ให้คงของเดิม
      if (!backendEnabledMetrics?.length) return prev
      return unique(backendEnabledMetrics.filter(k => allKeys.includes(k)))
    })
  }

  function validateRanges() {
    if (!anyChecked) return "กรุณาเลือกค่าเซ็นเซอร์อย่างน้อย 1 รายการ"

    if (mode === "date") {
      if (!fromDate || !toDate) return "กรุณาเลือกช่วงวันที่ให้ครบ"
      if (fromDate > toDate) return "วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด"
      return ""
    }
    if (mode === "month") {
      if (!fromMonth || !toMonth) return "กรุณาเลือกช่วงเดือนให้ครบ"
      if (fromMonth > toMonth) return "เดือนเริ่มต้องไม่เกินเดือนสิ้นสุด"
      return ""
    }
    return ""
  }

  async function downloadExcel() {
    setError("")
    setOk("")
    const err = validateRanges()
    if (err) { setError(err); return }

    // แปลงช่วงอิง mode เป็น from/to (YYYY-MM-DD)
    let from = "", to = ""
    if (mode === "date") {
      from = fromDate
      to = toDate
    } else {
      const r1 = monthToRange(fromMonth)
      const r2 = monthToRange(toMonth)
      from = r1.from
      to = r2.to
    }

    const metricParam = selected.join(",")
    const filename = fileName({ mode, from, to })

    try {
      setDownloading(true)
      if (!useMock) {
        // แนะนำให้ backend รองรับ GET /sensor/report/excel?from=YYYY-MM-DD&to=YYYY-MM-DD&metrics=a,b,c
        const url = new URL(`${API_BASE}/sensor/report/excel`)
        url.searchParams.set("from", from)
        url.searchParams.set("to", to)
        url.searchParams.set("metrics", metricParam)
        // แนบ timezone (เผื่อ backend ใช้) – optional
        url.searchParams.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok")

        const res = await fetch(url, { method: "GET" })
        if (!res.ok) throw new Error(`Bad status ${res.status}`)
        const blob = await res.blob()
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(a.href)
      } else {
        // MOCK: สร้างไฟล์ CSV แล้วตั้งนามสกุล .xlsx เพื่อเทสการดาวน์โหลด
        const header = ["timestamp", ...selected].join(",")
        const sampleRow = [today(), ...selected.map(() => (Math.random()*10).toFixed(2))].join(",")
        const csv = [header, sampleRow].join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(a.href)
      }
      setOk("กำลังดาวน์โหลดไฟล์รายงาน… ถ้าไม่เห็นไฟล์ ให้ตรวจสอบ popup/download blocker ของเบราว์เซอร์")
    } catch (e) {
      console.error(e)
      setError("ดาวน์โหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่หรือแจ้งผู้ดูแลระบบ")
    } finally {
      setDownloading(false)
    }
  }

  /** ---------- UI ---------- */
  const card = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
  const inputBase = "w-full rounded-lg border border-gray-300 bg-white p-3 text-base outline-none ring-emerald-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-950"
  const btnBase = "h-11 min-w-[160px] rounded-xl px-5 py-2 text-base inline-flex items-center justify-center active:scale-[0.99] disabled:opacity-60"

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">รายงานเซ็นเซอร์ (ดาวน์โหลด Excel)</h1>
          <p className="mt-1 text-base text-gray-700 dark:text-gray-300">
            เลือกช่วงเวลา (ตามวัน หรือ ตามเดือน) และเลือกเฉพาะค่าเซ็นเซอร์ที่ต้องการ จากนั้นกด “ดาวน์โหลด Excel”
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {loadingSettings ? "กำลังโหลด preset จากการตั้งค่า…" : ""}
        </div>
      </div>

      {/* Filters */}
      <div className={`${card} p-5 mb-6`}>
        {/* Mode switch */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">โหมดช่วงเวลา:</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setMode("date")}
              className={`px-4 py-2 text-sm ${mode === "date" ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-900"}`}
            >ตามวัน</button>
            <button
              type="button"
              onClick={() => setMode("month")}
              className={`px-4 py-2 text-sm ${mode === "month" ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-900"}`}
            >ตามเดือน</button>
          </div>
        </div>

        {/* Range inputs */}
        {mode === "date" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">ตั้งแต่วันที่</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputBase} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">ถึงวันที่</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputBase} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">ตั้งแต่เดือน</label>
              <input type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className={inputBase} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">ถึงเดือน</label>
              <input type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} className={inputBase} />
            </div>
          </div>
        )}
      </div>

      {/* Metric picker */}
      <div className={`${card} p-5`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="text-base font-semibold">เลือกค่าเซ็นเซอร์</div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" onClick={selectAll} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">เลือกทั้งหมด</button>
            <button type="button" onClick={selectNone} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">ไม่เลือกเลย</button>
            <button type="button" onClick={selectEnabled} disabled={!backendEnabledMetrics.length} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800">
              ใช้ตามค่าที่เปิดในตั้งค่า{backendEnabledMetrics.length ? ` (${backendEnabledMetrics.length})` : ""}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-2">
          {metricsList.map((m) => (
            <label key={m.key} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                checked={selected.includes(m.key)}
                onChange={() => toggleMetric(m.key)}
              />
              <span className="text-gray-800 dark:text-gray-200">
                {m.label} <span className="text-xs text-gray-500">({m.unit})</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className={`${card} p-4 mt-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="text-sm text-gray-600 dark:text-gray-400 sm:mr-auto">
            ไฟล์จะถูกกรองตามช่วงเวลาและค่าเซ็นเซอร์ที่เลือกเป็นคอลัมน์ใน Excel
          </div>

          <button
            type="button"
            onClick={downloadExcel}
            disabled={downloading}
            className={`${btnBase} bg-emerald-600 font-medium text-white shadow-sm ring-emerald-400 hover:bg-emerald-700 focus:outline-none focus:ring-2`}
          >
            {downloading ? "กำลังเตรียมไฟล์…" : "ดาวน์โหลด Excel"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
            {error}
          </div>
        )}
        {ok && (
          <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200">
            {ok}
          </div>
        )}
      </div>
    </div>
  )
}
