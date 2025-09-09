// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react"

/** ---------- ENV ---------- */
const API_BASE = import.meta.env.VITE_API_BASE || ""

/** ---------- CONFIG: 4 ค่าน้ำ (ปรับช่วงได้ตามหน้างาน) ---------- */
const METRICS_CONFIG = [
  { key: "temp",      label: "อุณหภูมิ", unit: "°C",  goodMin: 24,  goodMax: 30 },
  { key: "turbidity", label: "ความขุ่น", unit: "NTU", goodMin: 0,   goodMax: 50 },
  { key: "salinity",  label: "ความเค็ม", unit: "ppt", goodMin: 0,   goodMax: 1 },    // ฟาร์มน้ำจืดควรต่ำมาก
  { key: "level",     label: "ระดับน้ำ", unit: "cm",  goodMin: 10,  goodMax: 25 },   // ปรับตามบ่อ/กล่องเลี้ยงจริง
]

/** ตัวอย่างโครงสร้าง response ที่ API ควรส่ง
[
  { ts: "2025-09-06T00:05:00+07:00", temp: 27.4, turbidity: 18, salinity: 0.3, level: 20.1 },
  { ts: "2025-09-06T00:10:00+07:00", temp: 27.6, turbidity: 22, salinity: 0.3, level: 20.0 },
  ...
]
*/

function startOfTodayLocalISO() {
  const now = new Date()
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  return localMidnight.toISOString()
}

function statusFrom(value, min, max) {
  if (value == null || Number.isNaN(value)) return { text: "ไม่มีข้อมูล", tone: "muted" }
  if (value < min) return { text: "ต่ำ", tone: "low" }
  if (value > max) return { text: "สูง", tone: "high" }
  return { text: "ปกติ", tone: "ok" }
}

function summarizeToday(rows, key) {
  if (!rows || rows.length === 0) return { current: null, min: null, max: null, avg: null, series: [] }
  const series = rows.map((r) => Number(r[key])).filter((n) => Number.isFinite(n))
  if (series.length === 0) return { current: null, min: null, max: null, avg: null, series: [] }
  const current = series[series.length - 1]
  const min = Math.min(...series)
  const max = Math.max(...series)
  const avg = series.reduce((a, b) => a + b, 0) / series.length
  return { current, min, max, avg, series }
}

// สร้าง mock-data ให้เล่นได้ทันทีถ้าไม่มี API
function generateMockData() {
  const baseTs = new Date(startOfTodayLocalISO()).getTime()
  const points = 60 // 60 จุดตลอดวัน (ตัวอย่าง)
  const rows = []
  for (let i = 0; i < points; i++) {
    const ts = new Date(baseTs + i * 20 * 60 * 1000) // ทุกๆ 20 นาที
    rows.push({
      ts: ts.toISOString(),
      // อุณหภูมิ: กลาง ~26-28°C
      temp: 26 + Math.sin(i / 5) * 1.2 + (Math.random() - 0.5) * 0.4,
      // ความขุ่น: 10–40 NTU แกว่งเล็กน้อย
      turbidity: 25 + Math.sin(i / 7) * 10 + (Math.random() - 0.5) * 4,
      // ความเค็ม: น้ำจืด ~0.2–0.5 ppt
      salinity: 0.35 + Math.sin(i / 11) * 0.1 + (Math.random() - 0.5) * 0.03,
      // ระดับน้ำ: ~18–22 cm
      level: 20 + Math.sin(i / 9) * 1.2 + (Math.random() - 0.5) * 0.6,
    })
  }
  return rows
}

function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "—"
  const isIntish = Math.abs(n) >= 10 && Math.abs(n) % 1 === 0
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: isIntish ? 0 : 2 }).format(n)
}

function formatTime(dt) {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(dt)
  } catch {
    return ""
  }
}

/** ---------- Presentational ---------- */
function Sparkline({ series = [] }) {
  const w = 280
  const h = 54
  if (!series || series.length < 2) {
    return <div className="h-[54px] rounded-lg bg-gray-50 dark:bg-gray-800/60" />
  }
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  const stepX = w / (series.length - 1)
  const pts = series.map((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / span) * h
    return `${x},${y}`
  })
  const d = `M ${pts[0]} L ${pts.slice(1).join(" ")}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[54px] w-full rounded-lg bg-gray-50 dark:bg-gray-800/60">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
    </svg>
  )
}

function MetricCard({ metric }) {
  const { label, unit, current, min, max, avg, status, series, goodMin, goodMax } = metric

  const toneClass =
    status.tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"
      : status.tone === "low"
      ? "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300"
      : status.tone === "high"
      ? "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/30 dark:text-rose-300"
      : "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">{label}</div>
        <div className={`rounded-md px-2 py-0.5 text-xs ${toneClass}`}>{status.text}</div>
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <div className="text-3xl font-semibold tabular-nums">
          {formatNumber(current)}
          {unit && <span className="ml-1 text-base text-gray-500 dark:text-gray-400">{unit}</span>}
        </div>
      </div>

      <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        ช่วงแนะนำ: {formatNumber(goodMin)} – {formatNumber(goodMax)} {unit}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <div className="mb-1 text-[10px] text-gray-500 dark:text-gray-400">ต่ำสุด</div>
          <div className="font-semibold tabular-nums">
            {formatNumber(min)} {unit}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <div className="mb-1 text-[10px] text-gray-500 dark:text-gray-400">เฉลี่ย</div>
          <div className="font-semibold tabular-nums">
            {formatNumber(avg)} {unit}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <div className="mb-1 text-[10px] text-gray-500 dark:text-gray-400">สูงสุด</div>
          <div className="font-semibold tabular-nums">
            {formatNumber(max)} {unit}
          </div>
        </div>
      </div>

      <Sparkline series={series} />

      <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
        * ค่าปัจจุบัน = รายการล่าสุดที่ได้รับภายในวันนี้
      </div>
    </div>
  )
}

function Home() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)

  async function fetchToday() {
    setLoading(true)
    setError("")
    const from = startOfTodayLocalISO()
    const to = new Date().toISOString()

    let useMock = false
    let data = []
    if (API_BASE) {
      try {
        const res = await fetch(
          `${API_BASE}/sensor/water?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        )
        if (!res.ok) throw new Error(`Bad status ${res.status}`)
        data = await res.json()
        if (!Array.isArray(data)) throw new Error("Unexpected shape")
      } catch (e) {
        console.warn("Fetch failed, fallback to mock:", e)
        useMock = true
      }
    } else {
      useMock = true
    }
    if (useMock) data = generateMockData()

    setRows(data)
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchToday()
    const id = setInterval(fetchToday, 30_000) // รีเฟรชทุก 30 วิ
    return () => clearInterval(id)
  }, [])

  const cards = useMemo(() => {
    const byKey = Object.fromEntries(METRICS_CONFIG.map((m) => [m.key, summarizeToday(rows, m.key)]))
    return METRICS_CONFIG.map((m) => {
      const s = byKey[m.key]
      const st = statusFrom(s.current, m.goodMin, m.goodMax)
      return { ...m, ...s, status: st }
    })
  }, [rows])

  return (
    <div className="mx-auto max-w-7xl p-3 md:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">สถานะค่าน้ำ (วันนี้)</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">ช่วงเวลา: ตั้งแต่เที่ยงคืนล่าสุดจนถึง 23:59 ของวันนี้</p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {loading ? "กำลังอัปเดต..." : lastUpdated ? `อัปเดตล่าสุด: ${formatTime(lastUpdated)}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <MetricCard key={c.key} metric={c} />
        ))}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}

export default Home
