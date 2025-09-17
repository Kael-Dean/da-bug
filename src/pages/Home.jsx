// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { get } from "../lib/api";

const METRICS = [
  { key: "temp_c",        label: "อุณหภูมิ", unit: "°C",  goodMin: 24, goodMax: 30 },
  { key: "turbidity_ntu", label: "ความขุ่น", unit: "NTU", goodMin: 0,  goodMax: 50 },
  { key: "tds_ppm",       label: "TDS",       unit: "ppm", goodMin: 0,  goodMax: 500 },
  { key: "water_level",   label: "ระดับน้ำ",  unit: "cm",  goodMin: 5,  goodMax: 20 },
];

const fmt = (v) => (v == null ? "-" : Number(v).toLocaleString(undefined,{ maximumFractionDigits: 2 }));
const statusOf = (v, min, max) => (v==null ? "ไม่มีข้อมูล" : v<min ? "ต่ำไป" : v>max ? "สูงไป" : "ปกติ");
const statusClass = (s) =>
  s==="ปกติ" ? "bg-emerald-600" : s==="ต่ำไป" ? "bg-amber-500" : s==="สูงไป" ? "bg-rose-600" : "bg-slate-400";
const thDateTime = (iso) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "medium" }).format(new Date(iso));

/** ---------- Sparkline (SVG, ไม่ใช้ไลบรารี) ---------- */
function Sparkline({ points = [], height = 32, strokeWidth = 1.25 }) {
  // points: [{t: ISO, v: number}, ...]
  if (!points || points.length < 2) {
    return (
      <div className="h-[32px] w-full rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 flex items-center justify-center">
        ไม่มีข้อมูลกราฟ
      </div>
    );
  }

  const values = points.map(p => Number(p.v)).filter(Number.isFinite);
  if (values.length < 2) {
    return <div className="h-[32px] w-full rounded-lg bg-slate-50 dark:bg-slate-800/60" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) === 0 ? Math.abs(max || 1) * 0.01 : 0;
  const lo = min - pad, hi = max + pad, span = hi - lo;

  const W = 160;
  const stepX = W / (values.length - 1);
  const toY = (v) => {
    const n = (v - lo) / span;
    return height - n * height;
  };

  let d = "";
  values.forEach((v, i) => {
    const x = i * stepX;
    const y = toY(v);
    d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="h-[32px] w-full rounded-lg bg-slate-50 dark:bg-slate-800/60"
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-emerald-500/80"
      />
    </svg>
  );
}


export default function Home() {
  const [data, setData]   = useState(null);
  const [loading, setL]   = useState(true);
  const [error, setError] = useState("");
  const [usingPath, setUsingPath] = useState(""); // debug: endpoint ที่ถูกเลือก

  // ปรับได้ตามจริง
  const deviceId = "esp32-1";
  const tz = "Asia/Bangkok";
  const hours = 24;     // fallback
  const limit = 144;    // /recent

  // ยิงหลาย candidate (prioritize recent)
  const fetchDashboard = async () => {
    const recentQs = `?device_id=${encodeURIComponent(deviceId)}&tz=${encodeURIComponent(tz)}&limit=${limit}`;
    const hoursQs  = `?device_id=${encodeURIComponent(deviceId)}&tz=${encodeURIComponent(tz)}&hours=${hours}`;

    const bases = ["", "/api"]; // เผื่อ main.py include_router(..., prefix="/api")
    const pathsPreferredFirst = [
      `/dashboard/dashboards/recent${recentQs}`,
      `/dashboard/recent${recentQs}`,
      `/dashboard/dashboards${hoursQs}`,
      `/dashboard${hoursQs}`,
    ];

    let lastErr = null;
    for (const b of bases) {
      for (const p of pathsPreferredFirst) {
        try {
          const full = `${b}${p}`;
          const res = await get(full);
          setUsingPath(full.split("?")[0]);
          return res;
        } catch (e) {
          lastErr = e;
        }
      }
    }
    throw lastErr || new Error("ไม่พบ endpoint /dashboard ที่เข้ากัน");
  };

  useEffect(() => {
    let live = true;
    setL(true); setError("");
    fetchDashboard()
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message || "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => live && setL(false));

    const t = setInterval(() => {
      fetchDashboard().then((d) => live && setData(d)).catch(() => {});
    }, 30000);

    return () => { live = false; clearInterval(t); };
  }, []);

  const latest = data?.latest;
  const todayStats = data?.today_stats || {};
  const series = data?.series || {}; // <- ใช้สำหรับกราฟจริง

  const issues = useMemo(() => {
    if (!latest) return [];
    return METRICS.map(m => {
      const s = statusOf(latest[m.key], m.goodMin, m.goodMax);
      return { ...m, status: s, value: latest[m.key] };
    }).filter(x => x.status !== "ปกติ" && x.status !== "ไม่มีข้อมูล");
  }, [latest]);

  return (
    <div className="p-4 pb-20">
      <h1 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">แดชบอร์ดคุณภาพน้ำ</h1>

      {/* debug เล็กๆ */}
      {usingPath && (
        <div className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          ใช้ endpoint: <code className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-700">{usingPath}</code>
        </div>
      )}

      {loading && <div className="rounded-xl border p-4">กำลังโหลดข้อมูลจริงจากอุปกรณ์…</div>}
      {error && !loading && <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-700">ผิดพลาด: {error}</div>}

      {!loading && !error && latest && (
        <>
          <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            อุปกรณ์: <b>{latest.device_id}</b> • ล่าสุด: <b>{thDateTime(latest.recorded_at)}</b>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {METRICS.map((m) => {
              const value = latest[m.key];
              const s = statusOf(value, m.goodMin, m.goodMax);
              const points = (series?.[m.key] || []); // [{t, v}, ...]
              return (
                <div key={m.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{m.label}</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                        {fmt(value)} <span className="text-base font-normal text-slate-500">{m.unit}</span>
                      </div>
                    </div>
                    <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium text-white ${statusClass(s)}`}>{s}</span>
                  </div>

                  {/* กราฟจริงจาก series */}
                  <div className="mt-3 text-slate-600 dark:text-slate-300">
                    <Sparkline points={points} />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-700/50">
                      <div className="text-slate-500">เฉลี่ย (ช่วงข้อมูลล่าสุด)</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{fmt(todayStats?.[m.key]?.avg)} {m.unit}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-700/50">
                      <div className="text-slate-500">ต่ำสุด</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{fmt(todayStats?.[m.key]?.min)} {m.unit}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-700/50">
                      <div className="text-slate-500">สูงสุด</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{fmt(todayStats?.[m.key]?.max)} {m.unit}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Alert รวมสำหรับการเลี้ยงแมลงดา */}
            <div className={issues.length ? "rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20" : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20"}>
              {issues.length ? (
                <>
                  <div className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">แจ้งเตือน</div>
                  <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200/90">
                    {issues.map((i) => (
                      <li key={i.key}>• {i.label}: {i.status} (ปัจจุบัน {fmt(i.value)} {i.unit})</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="text-emerald-800 dark:text-emerald-300">✅ ค่าทั้งหมดอยู่ในช่วงเหมาะสมสำหรับการเลี้ยงแมลงดา</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
