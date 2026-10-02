import { hasStore, vapid } from "../_lib/push.js";
// המפתח הציבורי להרשמה להתראות (בטוח לחשיפה). ready=false — המאגר עוד לא חובר ב-Vercel
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!hasStore()) return res.status(200).json({ ready: false });
  try { const v = await vapid(); res.status(200).json({ ready: true, publicKey: v.publicKey }); }
  catch (e) { res.status(500).json({ ready: false, error: String(e.message || e) }); }
}
