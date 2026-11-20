let visitorToken: string | undefined;

export function getVisitorToken() {
  if (visitorToken) return visitorToken;
  const key = "plateau-visitor-token";
  try {
    const saved = localStorage.getItem(key);
    if (saved && /^[0-9a-f]{64}$/.test(saved)) return (visitorToken = saved);
  } catch {}
  visitorToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
  try { localStorage.setItem(key, visitorToken); } catch {}
  return visitorToken;
}
