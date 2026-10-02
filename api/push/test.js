import { hasStore, subId, getSub, delSub, send, body } from "../_lib/push.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!hasStore()) return res.status(503).json({ error: "NO_STORE" });
  const b = body(req); const id = subId(b.endpoint || ""); const rec = await getSub(id);
  if (!rec) return res.status(404).json({ error: "NOT_FOUND" });
  try { await send(rec, "test"); res.status(200).json({ ok: true }); }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await delSub(id); res.status(502).json({ error: String(e.statusCode || e.message) }); }
}
