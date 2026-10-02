import { hasStore, subId, delSub, body } from "../_lib/push.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!hasStore()) return res.status(503).json({ error: "NO_STORE" });
  const b = body(req); if (typeof b.endpoint !== "string") return res.status(400).json({ error: "BAD" });
  await delSub(subId(b.endpoint)); res.status(200).json({ ok: true });
}
