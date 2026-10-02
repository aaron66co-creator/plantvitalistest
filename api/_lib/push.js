// התראות (Web Push) — שרת קטן ב-Vercel. נשמרים רק: "כתובת" ההתראות האנונימית של הדפדפן, אזור הזמן, שפת הממשק,
// התזכורות ושעותיהן, ותאריך התיעוד האחרון (כדי לא להזכיר למי שכבר תיעד). שום מידע על אוכל או בריאות.
// אחסון: Upstash Redis (חיבור דרך Vercel → Storage, משתני הסביבה נוספים אוטומטית). מפתחות VAPID נוצרים אוטומטית
// בפעם הראשונה ונשמרים במאגר — או, אם הוגדרו, מ-VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
import webpush from "web-push";
import { createHash } from "node:crypto";

const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOK_ = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasStore = () => !!(URL_() && TOK_());

export async function redis(cmd) {
  if (!hasStore()) throw new Error("NO_STORE");
  const r = await fetch(URL_(), { method: "POST", headers: { Authorization: `Bearer ${TOK_()}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

let vapidCache = null;
export async function vapid() {
  if (vapidCache) return vapidCache;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) vapidCache = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  else {
    let v = await redis(["GET", "pv:vapid"]);
    if (!v) { await redis(["SET", "pv:vapid", JSON.stringify(webpush.generateVAPIDKeys()), "NX"]); v = await redis(["GET", "pv:vapid"]); }
    vapidCache = JSON.parse(v);
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://plantvitalistest.vercel.app", vapidCache.publicKey, vapidCache.privateKey);
  return vapidCache;
}

export const subId = (endpoint) => createHash("sha256").update(String(endpoint)).digest("hex").slice(0, 32);
export async function getSub(id) { const v = await redis(["GET", "pv:sub:" + id]); return v ? JSON.parse(v) : null; }
export async function putSub(id, rec) { await redis(["SET", "pv:sub:" + id, JSON.stringify(rec)]); await redis(["SADD", "pv:subs", id]); }
export async function delSub(id) { await redis(["DEL", "pv:sub:" + id]); await redis(["SREM", "pv:subs", id]); }

export function body(req) { const b = req.body; if (!b) return {}; if (typeof b === "string") { try { return JSON.parse(b); } catch { return {}; } } return b; }

// תוכן ההתראות — קצר וכללי (השרת לא יודע מה בתפריט)
export function message(kind, lang) {
  const he = lang !== "en";
  if (kind === "log") return { title: he ? "📝 איך היה היום?" : "📝 How was today?", body: he ? "לחיצה אחת לתעד שאכלת כמתוכנן — או לעדכן מה השתנה." : "One tap to log that you ate as planned — or update what changed.", url: "/?go=log", tag: "pv-log",
    actions: [{ action: "ate", title: he ? "✓ אכלתי כמתוכנן" : "✓ Ate as planned" }, { action: "open", title: he ? "עדכון ביומן" : "Update the log" }] };
  if (kind === "supp") return { title: he ? "💊 תזכורת: B12 וויטמין D" : "💊 Reminder: B12 and vitamin D", body: he ? "אם נטלת — אפשר לסמן ביומן." : "If you took them — you can tick them in the log.", url: "/?go=log", tag: "pv-supp" };
  return { title: he ? "🔔 ההתראות פועלות" : "🔔 Notifications are on", body: he ? "כך תיראה תזכורת מ-PlantVitalis." : "This is how a PlantVitalis reminder looks.", url: "/", tag: "pv-test" };
}

export async function send(rec, kind) {
  await vapid();
  return webpush.sendNotification(rec.sub, JSON.stringify(message(kind, rec.lang)), { TTL: 3600, urgency: "normal" });
}

// התאריך והשעה עכשיו באזור הזמן של המשתמש
export function localNow(tz) {
  let parts;
  try { parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()); }
  catch { return localNow("Asia/Jerusalem"); }
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, min: (+g("hour")) * 60 + (+g("minute")) };
}
export const REMINDER_KINDS = ["log", "supp"];
