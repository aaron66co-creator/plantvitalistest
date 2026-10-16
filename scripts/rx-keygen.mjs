// יצירת זוג מפתחות למרשמי מחקר (node scripts/rx-keygen.mjs): ECDSA P-256.
// המפתח הציבורי — להעתיק ל-RESEARCH_PUBKEYS ב-src/App.jsx. המפתח הפרטי — לשמור אצל צוות המחקר בלבד (לא בקוד ולא בגיט):
// מדביקים אותו פעם אחת במסך הצוות (?staff=1) במכשיר שמפיק מרשמים
import { webcrypto as C } from "node:crypto";
const kp = await C.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = await C.subtle.exportKey("jwk", kp.publicKey), priv = await C.subtle.exportKey("jwk", kp.privateKey);
const kid = "k" + Date.now().toString(36);
console.log("PUBLIC (src/App.jsx → RESEARCH_PUBKEYS):\n" + JSON.stringify({ kid, x: pub.x, y: pub.y }));
console.log("\nPRIVATE (staff only — keep secret):\n" + JSON.stringify({ kid, kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y, d: priv.d }));
