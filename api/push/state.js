import { hasStore, subId, getSub, putSub, body } from "../_lib/push.js";
// היום תועד — כדי שתזכורת התיעוד של הערב לא תישלח (נשמר רק התאריך)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!hasStore()) return res.status(503).json({ error: "NO_STORE" });
  const b = body(req); if (typeof b.endpoint !== "string" || !/^\d{4}-\d\d-\d\d$/.test(b.logged || "")) return res.status(400).json({ error: "BAD" });
  const id = subId(b.endpoint); const rec = await getSub(id); if (!rec) return res.status(404).json({ error: "NOT_FOUND" });
  if (rec.logged !== b.logged) { rec.logged = b.logged; await putSub(id, rec); }
  res.status(200).json({ ok: true });
}
