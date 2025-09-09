// src/pages/setting.jsx
import { useEffect, useMemo, useState } from "react"

/** ---------- ENV ---------- */
const API_BASE = import.meta.env.VITE_API_BASE || ""

/** ---------- CONFIG: 4 ค่าน้ำ + เกณฑ์แนะนำ (ปรับได้) ---------- */
const METRICS_CONFIG = [
  { key: "ph",   label: "pH",                   unit: "",     goodMin: 6.5, goodMax: 8.0,  hint: "ช่วงเหมาะสมสำหรับเลี้ยงแมลงดาโดยทั่วไป 6.5–8.0" },
  { key: "temp", label: "อุณหภูมิ",              unit: "°C",   goodMin: 24,  goodMax: 30,   hint: "ควรอุ่นพอเหมาะ 24–30°C" },
  { key: "tds",  label: "TDS (สารละลายรวม)",     unit: "ppm",  goodMin: 150, goodMax: 500, hint: "ค่าประมาณสภาพแร่ธาตุรวม 150–500 ppm" },
  { key: "do",   label: "ออกซิเจนละลายน้ำ (DO)", unit: "mg/L", goodMin: 4,   goodMax: 10,  hint: "ควรมากกว่า 4 mg/L" },
]

/**
 * ✅ ฝั่ง Backend (ตัวอย่างสเปก)
 * GET  ${API_BASE}/sensor/settings
 *    -> { recipients: string[], metrics: { [key]: { min:number, max:number, enabled:boolean } } }
 * PUT  ${API_BASE}/sensor/settings
 *    <- same payload as GET
 * POST ${API_BASE}/sensor/settings/test-email
 *    -> body: { recipients: string[], sample: { [key]: number } }  // ส่งอีเมลทดสอบ
 *
 * ถ้ายังไม่มี API: หน้าเพจนี้จะใช้ localStorage คีย์ "water_alert_settings" แทนโดยอัตโนมัติ
 */

const LS_KEY = "water_alert_settings"

function defaultSettings() {
  const metrics = {}
  METRICS_CONFIG.forEach((m) => {
    metrics[m.key] = { min: m.goodMin, max: m.goodMax, enabled: true }
  })
  return { recipients: [], metrics }
}

function parseRecipients(input) {
  return (input || "")
    .split(/[, \n;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isEmailish(s) {
  // ไม่ต้องเคร่งมาก แค่กันพิมพ์ผิดชัดๆ
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function toDisplayRecipients(arr) {
  return (arr || []).join(", ")
}

function Setting() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState("")
  const [ok, setOk] = useState("")

  // ฟอร์ม
  const [recipientsInput, setRecipientsInput] = useState("")
  const [metrics, setMetrics] = useState(defaultSettings().metrics)

  const useMock = !API_BASE // ถ้าไม่มี API_BASE ให้ใช้ localStorage

  /** ---------- โหลดค่า ---------- */
  async function loadSettings() {
    setLoading(true)
    setError("")
    setOk("")
    try {
      if (!useMock) {
        const res = await fetch(`${API_BASE}/sensor/settings`)
        if (!res.ok) throw new Error(`Bad status ${res.status}`)
        const json = await res.json()
        // รูปแบบ safety merge
        const base = defaultSettings()
        const loaded = {
          recipients: Array.isArray(json?.recipients) ? json.recipients : base.recipients,
          metrics: { ...base.metrics, ...(json?.metrics || {}) },
        }
        setRecipientsInput(toDisplayRecipients(loaded.recipients))
        setMetrics(loaded.metrics)
      } else {
        // localStorage
        const raw = localStorage.getItem(LS_KEY)
        const obj = raw ? JSON.parse(raw) : defaultSettings()
        setRecipientsInput(toDisplayRecipients(obj.recipients))
        setMetrics(obj.metrics || defaultSettings().metrics)
      }
    } catch (e) {
      console.error(e)
      setError("โหลดการตั้งค่าไม่สำเร็จ ใช้ค่าแนะนำไว้ชั่วคราว")
      const base = defaultSettings()
      setRecipientsInput(toDisplayRecipients(base.recipients))
      setMetrics(base.metrics)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** ---------- บันทึก ---------- */
  async function saveSettings() {
    setSaving(true)
    setError("")
    setOk("")

    // validate
    const recipients = parseRecipients(recipientsInput)
    for (const r of recipients) {
      if (!isEmailish(r)) {
        setSaving(false)
        setError(`อีเมลไม่ถูกต้อง: ${r}`)
        return
      }
    }

    // เช็คช่วง min<max
    for (const m of METRICS_CONFIG) {
      const { min, max } = metrics[m.key] || {}
      if (!(Number.isFinite(min) && Number.isFinite(max))) {
        setSaving(false)
        setError(`กรุณากรอกตัวเลขขั้นต่ำ/ขั้นสูงของ ${m.label}`)
        return
      }
      if (min >= max) {
        setSaving(false)
        setError(`ค่า "ต่ำสุด" ต้องน้อยกว่า "สูงสุด" (${m.label})`)
        return
      }
    }

    const payload = { recipients, metrics }

    try {
      if (!useMock) {
        const res = await fetch(`${API_BASE}/sensor/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Bad status ${res.status}`)
      } else {
        localStorage.setItem(LS_KEY, JSON.stringify(payload))
      }
      setOk("บันทึกสำเร็จ")
    } catch (e) {
      console.error(e)
      setError("บันทึกไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  /** ---------- ส่งอีเมลทดสอบ ---------- */
  async function sendTestEmail() {
    setTesting(true)
    setError("")
    setOk("")

    const recipients = parseRecipients(recipientsInput)
    if (recipients.length === 0) {
      setTesting(false)
      setError("กรุณากรอกอีเมลผู้รับอย่างน้อย 1 ราย")
      return
    }
    for (const r of recipients) {
      if (!isEmailish(r)) {
        setTesting(false)
        setError(`อีเมลไม่ถูกต้อง: ${r}`)
        return
      }
    }

    // สุ่ม sample ค่าที่เกินช่วงสักตัว เพื่อให้ทดสอบข้อความแจ้งเตือนได้
    const sample = {}
    METRICS_CONFIG.forEach((m) => {
      const { min, max, enabled } = metrics[m.key] || {}
      if (enabled) {
        // เลือกสุ่มต่ำกว่า min หรือสูงกว่า max
        const outLow = Math.random() < 0.5
        sample[m.key] = outLow ? Number(min) - 0.1 * Math.abs(min || 1) - 0.1 : Number(max) + 0.1 * Math.abs(max || 1) + 0.1
      }
    })

    try {
      if (!useMock) {
        const res = await fetch(`${API_BASE}/sensor/settings/test-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients, sample }),
        })
        if (!res.ok) throw new Error(`Bad status ${res.status}`)
      } else {
        // mock: แกล้งดีเลย์เล็กน้อย
        await new Promise((r) => setTimeout(r, 700))
        console.log("[MOCK] send test email to:", recipients, "sample:", sample)
      }
      setOk("ส่งอีเมลทดสอบแล้ว")
    } catch (e) {
      console.error(e)
      setError("ส่งอีเมลทดสอบไม่สำเร็จ")
    } finally {
      setTesting(false)
    }
  }

  /** ---------- รีเซ็ตเป็นค่าแนะนำ ---------- */
  function resetRecommended() {
    const base = defaultSettings()
    setMetrics(base.metrics)
  }

  /** ---------- จัดการอินพุต ---------- */
  function updateMetric(key, patch) {
    setMetrics((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const hasAnyEnabled = useMemo(
    () => METRICS_CONFIG.some((m) => !!metrics[m.key]?.enabled),
    [metrics]
  )

  return (
    <div className="mx-auto max-w-3xl p-3 md:p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
            ตั้งค่าแจ้งเตือนค่าน้ำ
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            กำหนดช่วงค่าที่ “ยอมรับได้” ของแต่ละตัวชี้วัด หากค่าเซ็นเซอร์ต่ำกว่า/สูงกว่าช่วงนี้
            ระบบจะส่งอีเมลแจ้งเตือนให้คุณ
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{loading ? "กำลังโหลด..." : ""}</div>
      </div>

      {/* Recipients */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 text-sm font-semibold">ผู้รับอีเมลแจ้งเตือน</div>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none ring-emerald-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-950"
          placeholder="กรอกอีเมลคั่นด้วยเครื่องหมายจุลภาค เช่น you@example.com, staff@farm.co"
          value={recipientsInput}
          onChange={(e) => setRecipientsInput(e.target.value)}
        />
        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          คั่นด้วยเครื่องหมายจุลภาค (,), เว้นวรรค หรือขึ้นบรรทัดใหม่ก็ได้
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-3">
        {METRICS_CONFIG.map((m) => {
          const v = metrics[m.key] || { min: m.goodMin, max: m.goodMax, enabled: true }
          return (
            <div
              key={m.key}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{m.hint}</div>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={!!v.enabled}
                    onChange={(e) => updateMetric(m.key, { enabled: e.target.checked })}
                  />
                  เปิดแจ้งเตือน
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-300">ต่ำสุดที่ยอมรับได้</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={v.min}
                      onChange={(e) => updateMetric(m.key, { min: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none ring-emerald-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-950"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{m.unit}</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-300">สูงสุดที่ยอมรับได้</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={v.max}
                      onChange={(e) => updateMetric(m.key, { max: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none ring-emerald-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-950"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{m.unit}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                คำแนะนำเดิม: {m.goodMin} – {m.goodMax} {m.unit}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 z-10 mt-4 rounded-2xl border border-gray-200 bg-white/90 p-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {hasAnyEnabled
              ? "ระบบจะส่งอีเมลเมื่อค่าจริงต่ำกว่า/สูงกว่าช่วงที่ตั้งไว้"
              : "คุณปิดแจ้งเตือนของทุกตัวชี้วัดอยู่ จะไม่มีการส่งอีเมล"}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetRecommended}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 active:scale-[0.99] dark:border-gray-700 dark:hover:bg-gray-800"
            >
              รีเซ็ตเป็นค่าแนะนำ
            </button>
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={testing}
              className="rounded-xl border border-emerald-200 px-4 py-2 text-sm text-emerald-700 ring-emerald-300 hover:bg-emerald-50 active:scale-[0.99] disabled:opacity-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
            >
              {testing ? "กำลังส่งอีเมลทดสอบ..." : "ส่งอีเมลทดสอบ"}
            </button>
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm ring-emerald-400 hover:bg-emerald-700 focus:outline-none focus:ring-2 active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        </div>

        {/* Alerts */}
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

export default Setting
