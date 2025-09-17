const API_BASE = import.meta.env.VITE_API_BASE || "";

async function http(method, url, body, opts = {}) {
  const res = await fetch(API_BASE + url, {
    method,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const get  = (url, opts) => http("GET", url, null, opts);
export const post = (url, body, opts) => http("POST", url, body, opts);
export { API_BASE };
