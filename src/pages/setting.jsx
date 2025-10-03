// src/pages/setting.jsx — uses /settings + /settings/subscribers/add (SubscriberIn)
// - GLOBAL mode (fixed DEVICE_ID)
// - Add emails via POST /settings/subscribers/add
// - Save thresholds via PUT /settings  (no notify_emails)
// - Send test: ensure subscribers added, then POST /settings/send-test?device_id=...

import { useEffect, useMemo, useState } from "react"

/** ---------- ENV ---------- */
const API_BASE = import.meta.env.VITE_API_BASE || ""

/** ---------- DEVICE SCOPE ---------- 
 * Backend SubscriberIn requires `device_id: str`.
 * For global settings page, we use a fixed logical device id.
 */
const DEVICE_ID = "GLOBAL"

/**
 * FE metric keys (UI)  ↔  BE field names
 * - FE uses 4 cards: temp, turbidity, salinity, level
 * - BE expects: temperature, turbidity, salinity, water_level
 */
const METRICS_CONFIG = [
  { fe: "temp",        be: "temperature", label: "อุณหภูมิ", unit: "°C",  goodMin: 24,  goodMax: 30, hint: "ช่วงเหมาะสม 24–30°C" },
  { fe: "turbidity",   be: "turbidity",   label: "ความขุ่น", unit: "NTU", goodMin: 0,   goodMax: 50, hint: "ควรไม่ขุ่นมากกว่า ~50 NTU" },
  { fe: "salinity",    be: "salinity",    label: "ความเค็ม", unit: "ppt", goodMin: 0,   goodMax: 1,  hint: "น้ำจืดควรต่ำมาก < 1 ppt" },
  { fe: "level",       be: "water_level", label: "ระดับน้ำ", unit: "cm",  goodMin: 10,  goodMax: 25, hint: "ปรับตามความสูงบ่อเลี้ยงจริง" },
]

const FE_BY_BE = METRICS_CONFIG.reduce((acc, m) => { acc[m.be] = m.fe; return acc }, {})

/** ---------- Local helpers ---------- */
function defaultMetrics() {
  const out = {}
  METRICS_CONFIG.forEach((m) => {
    out[m.fe] = { min: m.goodMin, max: m.goodMax, enabled: true }
  })
  return out
}

function defaultForm() {
  return {
    recipientsInput: "",
    metrics: defaultMetrics(),
  }
}

function parseRecipients(input) {
  return (input || "")
    .split(/[\n,;\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isEmailish(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

/** ---------- API shape mapping ---------- */
function feToSettingsPayload(feMetrics) {
  const payload = {
    device_id: null, // keep thresholds on GLOBAL row (backend treats None as global)
  }
  for (const m of METRICS_CONFIG) {
    const v = feMetrics[m.fe] || { min: m.goodMin, max: m.goodMax, enabled: true }
    payload[m.be] = {
      enabled: !!v.enabled,
      min: Number(v.min),
      max: Number(v.max),
    }
  }
  return payload
}

function responseToForm(json) {
  const feMetrics = defaultMetrics()
  for (const [beKey, val] of Object.entries(json || {})) {
    const feKey = FE_BY_BE[beKey]
    if (feKey && val && typeof val === "object") {
      feMetrics[feKey] = {
        enabled: !!val.enabled,
        min: Number(val.min),
        max: Number(val.max),
      }
    }
  }
  return {
    recipientsInput: "", // ← ไม่ prefll
    metrics: feMetrics,
  }
}

/**
 * Optional: local fallback if API_BASE is missing in dev
 */
const LS_KEY = "water_alert_settings_v3"
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : defaultForm()
  } catch { return defaultForm() }
}
function saveLocal(form) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(form)) } catch {}
}

/** ---------- Component ---------- */
function Setting() {
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [testing, setTesting]   = useState(false)
  const [error, setError]       = useState("")
  const [ok, setOk]             = useState("")

  const [recipientsInput, setRecipientsInput] = useState("")
  const [metrics, setMetrics] = useState(defaultMetrics())

  const useMock = !API_BASE

  /** ---------- Load on mount ---------- */
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError("")
      setOk("")
      try {
        if (!useMock) {
          const url = new URL(`${API_BASE.replace(/\/$/, "")}/settings`)
          // global thresholds => no device_id query
          const res = await fetch(url, { method: "GET" })
          if (!res.ok) throw new Error(`GET /settings ${res.status}`)
          const json = await res.json()
          const form = responseToForm(json)
          setRecipientsInput("")          // ช่องอีเมลว่างเสมอ
          setMetrics(form.metrics)
        } else {
          const local = loadLocal()
          setRecipientsInput("")          // ว่างเสมอแม้มีค่า local
          setMetrics(local.metrics || defaultMetrics())
        }
      } catch (e) {
        console.error(e)
        setError("โหลดการตั้งค่าไม่สำเร็จ ใช้ค่าแนะนำชั่วคราว")
        const base = defaultForm()
        setRecipientsInput("")            // ว่าง
        setMetrics(base.metrics)
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** ---------- Derived ---------- */
  const hasAnyEnabled = useMemo(
    () => METRICS_CONFIG.some((m) => !!metrics[m.fe]?.enabled),
    [metrics]
  )

  /** ---------- UI change handlers ---------- */
  function updateMetric(feKey, patch) {
    setMetrics((prev) => ({ ...prev, [feKey]: { ...prev[feKey], ...patch } }))
  }

  /** ---------- Validation ---------- */
  function validateAndCollectRecipients() {
    const recipients = (recipientsInput || "").trim() ? parseRecipients(recipientsInput) : []
    for (const r of recipients) {
      if (!isEmailish(r)) throw new Error(`อีเมลไม่ถูกต้อง: ${r}`)
    }
    return recipients
  }

  function validateMetrics() {
    for (const m of METRICS_CONFIG) {
      const { min, max } = metrics[m.fe] || {}
      if (!(Number.isFinite(min) && Number.isFinite(max))) {
        throw new Error(`กรุณากรอกตัวเลขขั้นต่ำ/ขั้นสูงของ ${m.label}`)
      }
      if (Number(min) >= Number(max)) {
        throw new Error(`ค่า "ต่ำสุด" ต้องน้อยกว่า "สูงสุด" (${m.label})`)
      }
    }
  }

  /** ---------- API actions ---------- */
  async function putSettingsThresholds() {
    const payload = feToSettingsPayload(metrics)
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`PUT /settings ${res.status}`)
    const json = await res.json()
    const form = responseToForm(json)
    setMetrics(form.metrics)
  }

  async function addSubscribers(emails) {
    if (!emails?.length) return
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/settings/subscribers/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: DEVICE_ID, emails }),
    })
    if (!res.ok) throw new Error(`POST /settings/subscribers/add ${res.status}`)
    // no need to use response body; backend returns the list of subscriptions
  }

  /** ---------- Actions (buttons) ---------- */
  async function saveSettings() {
    setSaving(true)
    setError("")
    setOk("")
    try {
      validateMetrics()
      const recipients = validateAndCollectRecipients()

      if (!useMock) {
        // 1) Save thresholds (global)
        await putSettingsThresholds()
        // 2) Add subscribers for this DEVICE_ID
        if (recipients.length) await addSubscribers(recipients)
      } else {
        // mock local store
        saveLocal({ recipientsInput, metrics })
        console.log("[MOCK] saved thresholds; added subscribers:", recipients)
      }

      // clear email input after successful save
      setRecipientsInput("")
      setOk("บันทึกการตั้งค่าสำเร็จ")
    } catch (e) {
      console.error(e)
      setError(e?.message || "บันทึกไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  async function resetRecommended() {
    setLoading(true)
    setError("")
    setOk("")
    try {
      if (!useMock) {
        const url = new URL(`${API_BASE.replace(/\/$/, "")}/settings/reset`)
        const res = await fetch(url, { method: "POST" })
        if (!res.ok) throw new Error(`POST /settings/reset ${res.status}`)
        const json = await res.json()
        const form = responseToForm(json)
        setRecipientsInput("")            // ว่างเสมอ
        setMetrics(form.metrics)
      } else {
        const base = defaultForm()
        setRecipientsInput("")            // ว่าง
        setMetrics(base.metrics)
        saveLocal({ recipientsInput: "", metrics: base.metrics })
      }
      setOk("รีเซ็ตเป็นค่าแนะนำแล้ว")
    } catch (e) {
      console.error(e)
      setError("รีเซ็ตไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  async function sendTestEmail() {
    setTesting(true)
    setError("")
    setOk("")
    try {
      // Validate & stage emails into subscribers first
      const recipients = validateAndCollectRecipients()
      if (!useMock) {
        // keep thresholds in sync (in case changed)
        validateMetrics()
        await putSettingsThresholds()
        if (recipients.length) await addSubscribers(recipients)

        // trigger test ONLY for this DEVICE_ID
        const res = await fetch(
          `${API_BASE.replace(/\/$/, "")}/settings/send-test?device_id=${encodeURIComponent(DEVICE_ID)}`,
          { method: "POST" }
        )
        if (!res.ok) throw new Error(`POST /settings/send-test ${res.status}`)
      } else {
        await new Promise((r) => setTimeout(r, 500))
        console.log("[MOCK] send test to (DEVICE_ID=%s):", DEVICE_ID, recipients)
      }

      setRecipientsInput("") // clear after test
      setOk("ส่งอีเมลทดสอบแล้ว")
    } catch (e) {
      console.error(e)
      setError(e?.message || "ส่งอีเมลทดสอบไม่สำเร็จ")
    } finally {
      setTesting(false)
    }
  }

  /** ---------- UI ---------- */
  const cardCls = "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
  const inputCls = "w-full rounded-lg border border-gray-300 bg-white p-3 text-base outline-none ring-emerald-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-950"
  const btnBase = "h-11 min-w-[170px] rounded-xl px-5 py-2 text-base inline-flex items-center justify-center active:scale-[0.99] disabled:opacity-60"

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">ตั้งค่าแจ้งเตือนค่าน้ำ</h1>
          <p className="mt-1 text-base text-gray-700 dark:text-gray-300">
            กำหนดช่วงค่าที่ “ยอมรับได้” ของแต่ละตัวชี้วัด ถ้าค่าจริงต่ำกว่า/สูงกว่าช่วงนี้ ระบบจะส่งอีเมลแจ้งเตือน
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{loading ? "กำลังโหลด..." : ""}</div>
      </div>

      {/* Recipients (SubscriberIn via /subscribers/add) */}
      <div className={`${cardCls} mb-6`}>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-base font-semibold">ผู้รับอีเมลแจ้งเตือน</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Device ID: <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">{DEVICE_ID}</code></div>
        </div>
        <input
          type="text"
          className={inputCls}
          placeholder="กรอกอีเมลคั่นด้วยเครื่องหมายจุลภาค เช่น you@example.com, staff@farm.co"
          value={recipientsInput}
          onChange={(e) => setRecipientsInput(e.target.value)}
        />
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          คั่นด้วยเครื่องหมายจุลภาค (,), เว้นวรรค หรือขึ้นบรรทัดใหม่ก็ได้ • เมื่อกด “บันทึกการตั้งค่า” หรือ “ส่งอีเมลทดสอบ”
          ระบบจะเพิ่มอีเมลเหล่านี้เข้า Subscribers ของอุปกรณ์ {DEVICE_ID}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {METRICS_CONFIG.map((m) => {
          const v = metrics[m.fe] || { min: m.goodMin, max: m.goodMax, enabled: true }
          const enabled = !!v.enabled
          return (
            <div key={m.fe} className={cardCls}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">{m.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{m.hint}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label="สวิตช์เปิด/ปิดการแจ้งเตือน"
                    onClick={() => updateMetric(m.fe, { enabled: !enabled })}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition ${enabled ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"}`}
                    title={enabled ? "ปิดการแจ้งเตือน" : "เปิดการแจ้งเตือน"}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-6" : "translate-x-1"}`} />
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
                      onChange={(e) => updateMetric(m.fe, { min: e.target.value === "" ? "" : Number(e.target.value) })}
                      className={inputCls}
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
                      onChange={(e) => updateMetric(m.fe, { max: e.target.value === "" ? "" : Number(e.target.value) })}
                      className={inputCls}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{m.unit}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">คำแนะนำเดิม: {m.goodMin} – {m.goodMax} {m.unit}</div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className={`${cardCls} mt-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="text-sm text-gray-600 dark:text-gray-400 sm:mr-auto">
            {hasAnyEnabled ? "ระบบจะส่งอีเมลเมื่อค่าจริงต่ำกว่า/สูงกว่าช่วงที่ตั้งไว้" : "คุณปิดแจ้งเตือนของทุกตัวชี้วัดอยู่ จะไม่มีการส่งอีเมล"}
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

        {error && (
          <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">{error}</div>
        )}
        {ok && (
          <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200">{ok}</div>
        )}
      </div>
    </div>
  )
}

export default Setting
