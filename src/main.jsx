import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// תיקון (לבקשת המשתמש: "שתי הבעיות נמשכות") — הניקוי-העצמי-של-sw.js תלוי בכך שהדפדפן-הפגוע יבדוק-עדכון-ל-SW
// בעצמו, וזה עלול להתעכב או לא לקרות בפועל (במיוחד אם "האתר לא עולה כלל" מונע מהדף להגיע עד לשלב הזה). נוסף
// ניקוי-ישיר-בקוד-הדף עצמו: אם הבאנדל-החדש-הזה בכלל מצליח להיטען (בזכות כותרות-no-cache שנוספו ל-sw.js/
// index.html ב-vercel.json), הוא מבטל ישירות כל רישום-SW קיים ומנקה את כל המטמון - בלי להמתין למחזור-החיים
// העצמי של ה-SW הישן. שתי שכבות-ניקוי מקבילות, לא תלויות זו-בזו
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => {});
}
if ("caches" in window) {
  caches.keys().then((names) => {
    names.forEach((n) => caches.delete(n));
  }).catch(() => {});
}
// touch: force fresh deployment 1789444266
