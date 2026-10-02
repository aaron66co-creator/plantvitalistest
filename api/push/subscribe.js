import { hasStore, subId, getSub, putSub, body, REMINDER_KINDS } from "../_lib/push.js";
const okTime = (t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!hasStore()) return res.status(503).json({ error: "NO_STORE" });
  const b = body(req); const sub = b.subscription;
  if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return res.status(400).json({ error: "BAD_SUBSCRIPTION" });
  const rem = {}; for (const k of REMINDER_KINDS) { const r = b.rem?.[k]; rem[k] = { on: !!r?.on, t: okTime(r?.t) ? r.t : (k === "log" ? "20:30" : "09:00") }; }
  const id = subId(sub.endpoint); const prev = (await getSub(id)) || {};
  const rec = { sub: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }, tz: typeof b.tz === "string" ? b.tz.slice(0, 64) : "Asia/Jerusalem", lang: b.lang === "en" ? "en" : "he", rem, sent: prev.sent || {}, logged: prev.logged || null, at: Date.now() };
  await putSub(id, rec);
  res.status(200).json({ ok: true });
}
