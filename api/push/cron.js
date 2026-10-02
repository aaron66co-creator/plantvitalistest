import { hasStore, redis, getSub, putSub, delSub, send, localNow, REMINDER_KINDS } from "../_lib/push.js";
// נקרא כל 15 דקות (GitHub Actions — .github/workflows/push-cron.yml). שולח כל תזכורת שהגיע זמנה (עד 90 דקות איחור),
// פעם אחת ביום לכל תזכורת. קריאה נוספת לא שולחת שוב — אפשר לקרוא לו בבטחה
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}` && req.query?.key !== secret) return res.status(401).end();
  if (!hasStore()) return res.status(503).json({ error: "NO_STORE" });
  const ids = (await redis(["SMEMBERS", "pv:subs"])) || []; let sent = 0, removed = 0;
  for (const id of ids) {
    const rec = await getSub(id); if (!rec) { await redis(["SREM", "pv:subs", id]); continue; }
    const now = localNow(rec.tz); let changed = false; rec.sent = rec.sent || {};
    for (const k of REMINDER_KINDS) {
      const r = rec.rem?.[k]; if (!r?.on || rec.sent[k] === now.date) continue;
      const [h, m] = String(r.t || "").split(":").map(Number); const t = h * 60 + m;
      if (!(now.min >= t && now.min < t + 90)) continue;
      rec.sent[k] = now.date; changed = true;
      if (k === "log" && rec.logged === now.date) continue; // כבר תיעד היום — בלי תזכורת
      try { await send(rec, k); sent++; }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { await delSub(id); removed++; changed = false; break; } }
    }
    if (changed) await putSub(id, rec);
  }
  res.status(200).json({ ok: true, subs: ids.length, sent, removed });
}
