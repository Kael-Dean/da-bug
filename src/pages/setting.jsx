// src/pages/setting.jsx
import { useEffect, useMemo, useState } from "react"

/** ---------- ENV ---------- */
const API_BASE = import.meta.env.VITE_API_BASE || ""

/** ---------- CONFIG: 4 ค่าน้ำ (ปรับช่วงได้ตามหน้างาน) ---------- */
const METRICS_CONFIG = [
  { key: "temp",      label: "อุณหภูมิ", unit: "°C",  goodMin: 24,  goodMax: 30,  hint: "ช่วงเหมาะสม 24–30°C" },
  { key: "turbidity", label: "ความขุ่น", unit: "NTU", goodMin: 0,   goodMax: 50,  hint: "ควรไม่ขุ่นมากกว่า ~50 NTU" },
  { key: "salinity",  label: "ความเค็ม", unit: "ppt", goodMin: 0,   goodMax: 1,   hint: "น้ำจืดควรต่ำมาก < 1 ppt" },
  { key: "level",     label: "ระดับน้ำ", unit: "cm",  goodMin: 10,  goodMax: 25,  hint: "ปรับตามความสูงบ่อเลี้ยงจริง" },
]

/**
 * Backend Spec (แนะนำ)
 * GET  ${API_BASE}/sensor/settings
 *    -> { recipients: string[], metrics: { [key]: { min:number, max:number, enabled:boolean } } }
 * PUT  ${API_BASE}/sensor/settings
 * POST ${API_BASE}/sensor/settings/test-email
 * ถ้ายังไม่มี API: ใช้ localStorage คีย์ "water_alert_settings"
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
  // ตรวจรูปแบบอีเมลง่าย ๆ เพื่อกันพิมพ์ผิด
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

  const useMock = !API_BASE

  /** ---------- Persist helper: เขียนลง localStorage + เรียก PUT ถ้ามี API ---------- */
  async function persist(settings, { silent = true } = {}) {
    // เขียนลง localStorage เพื่อให้จำค่าแม้ปิดเว็บ/ย้ายหน้า
    localStorage.setItem(LS_KEY, JSON.stringify(settings))

    // ซิงก์ไปฝั่งเซิร์ฟเวอร์ถ้ามี API
    if (!useMock) {
      try {
        const res = await fetch(`${API_BASE}/sensor/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        })
        if (!res.ok) throw new Error(`Bad status ${res.status}`)
        if (!silent) setOk("บันทึกสำเร็จ")
      } catch (e) {
        console.warn("Persist failed:", e)
        if (!silent) setError("บันทึกไม่สำเร็จ")
      }
    } else {
      if (!silent) setOk("บันทึกสำเร็จ")
    }
  }

  function currentPayload() {
    return { recipients: parseRecipients(recipientsInput), metrics }
  }

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
        const base = defaultSettings()
        const loaded = {
          recipients: Array.isArray(json?.recipients) ? json.recipients : base.recipients,
          metrics: { ...base.metrics, ...(json?.metrics || {}) },
        }
        setRecipientsInput(toDisplayRecipients(loaded.recipients))
        setMetrics(loaded.metrics)
      } else {
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

  /** ---------- บันทึก (กดปุ่ม) ---------- */
  async function saveSettings() {
    setSaving(true)
    setError("")
    setOk("")

    const recipients = parseRecipients(recipientsInput)
    for (const r of recipients) {
      if (!isEmailish(r)) {
        setSaving(false)
        setError(`อีเมลไม่ถูกต้อง: ${r}`)
        return
      }
    }

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

    try {
      await persist({ recipients, metrics }, { silent: false })
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

    // บันทึกล่าสุดก่อนยิงทดสอบ
    await persist({ recipients, metrics }, { silent: true })

    // mock ค่าที่เกินช่วงเพื่อทดสอบ
    const sample = {}
    METRICS_CONFIG.forEach((m) => {
      const { min, max, enabled } = metrics[m.key] || {}
      if (enabled) {
        const outLow = Math.random() < 0.5
        sample[m.key] =
          outLow ? Number(min) - 0.1 * Math.abs(min || 1) - 0.1 : Number(max) + 0.1 * Math.abs(max || 1) + 0.1
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

  /** ---------- Toggle สวิตช์: บันทึกทันที (จำค่าแม้ปิดเว็บ/ย้ายหน้า) ---------- */
  async function toggleEnabled(key, nextEnabled) {
    setMetrics((prev) => {
      const next = { ...prev, [key]: { ...prev[key], enabled: nextEnabled } }
      const payload = { recipients: parseRecipients(recipientsInput), metrics: next }
      // persist แบบเงียบ ๆ ทุกครั้งที่สลับสวิตช์
      persist(payload, { silent: true })
      return next
    })
  }

  const hasAnyEnabled = useMemo(
    () => METRICS_CONFIG.some((m) => !!metrics[m.key]?.enabled),
    [metrics]
  )

  /** ---------- UI ---------- */
  // ปุ่มใหญ่ขึ้น อ่านง่าย
  const btnBase =
    "h-11 min-w-[180px] rounded-xl px-5 py-2 text-base inline-flex items-center justify-center active:scale-[0.99] disabled:opacity-60"

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      {/* Header ใหญ่ขึ้น */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            ตั้งค่าแจ้งเตือนค่าน้ำ
          </h1>
          <p className="mt-1 text-base text-gray-700 dark:text-gray-300">
            กำหนดช่วงค่าที่ “ยอมรับได้” ของแต่ละตัวชี้วัด หากค่าเซ็นเซอร์ต่ำกว่า/สูงกว่าช่วงนี้ ระบบจะส่งอีเมลแจ้งเตือน
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{loading ? "กำลังโหลด..." : ""}</div>
      </div>

      {/* Recipients (ใหญ่ขึ้น) */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 text-base font-semibold">ผู้รับอีเมลแจ้งเตือน</div>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-base outline-none ring-emerald-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-950"
          placeholder="กรอกอีเมลคั่นด้วยเครื่องหมายจุลภาค เช่น you@example.com, staff@farm.co"
          value={recipientsInput}
          onChange={(e) => setRecipientsInput(e.target.value)}
        />
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          คั่นด้วยเครื่องหมายจุลภาค (,), เว้นวรรค หรือขึ้นบรรทัดใหม่ก็ได้
        </div>
      </div>

      {/* Metrics (การ์ดใหญ่ + สวิตช์เลื่อน + ป้ายข้อความข้างปุ่ม) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {METRICS_CONFIG.map((m) => {
          const v = metrics[m.key] || { min: m.goodMin, max: m.goodMax, enabled: true }
          const enabled = !!v.enabled
          return (
            <div
              key={m.key}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">{m.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{m.hint}</div>
                </div>

                {/* กลุ่มป้าย + สวิตช์ + สถานะ */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">เปิดการแจ้งเตือน</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label="สวิตช์เปิดการแจ้งเตือน"
                    onClick={() => toggleEnabled(m.key, !enabled)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition ${
                      enabled ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
                    }`}
                    title={enabled ? "ปิดการแจ้งเตือน" : "เปิดการแจ้งเตือน"}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                        enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{enabled ? "เปิดอยู่" : "ปิดอยู่"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">ต่ำสุดที่ยอมรับได้</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={v.min}
                      onChange={(e) => updateMetric(m.key, { min: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-base outline-none ring-emerald-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-950"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{m.unit}</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">สูงสุดที่ยอมรับได้</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={v.max}
                      onChange={(e) => updateMetric(m.key, { max: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-base outline-none ring-emerald-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-950"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{m.unit}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                คำแนะนำเดิม: {m.goodMin} – {m.goodMax} {m.unit}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="text-sm text-gray-600 dark:text-gray-400 sm:mr-auto">
            {hasAnyEnabled
              ? "ระบบจะส่งอีเมลเมื่อค่าจริงต่ำกว่า/สูงกว่าช่วงที่ตั้งไว้"
              : "คุณปิดแจ้งเตือนของทุกตัวชี้วัดอยู่ จะไม่มีการส่งอีเมล"}
          </div>

          <button
            type="button"
            onClick={resetRecommended}
            className={`${btnBase} border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800`}
          >
            รีเซ็ตเป็นค่าแนะนำ
          </button>

          <button
            type="button"
            onClick={sendTestEmail}
            disabled={testing}
            className={`${btnBase} border border-emerald-200 text-emerald-700 ring-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/20`}
          >
            {testing ? "กำลังส่งอีเมลทดสอบ..." : "ส่งอีเมลทดสอบ"}
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className={`${btnBase} bg-emerald-600 font-medium text-white shadow-sm ring-emerald-400 hover:bg-emerald-700 focus:outline-none focus:ring-2`}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </button>
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
