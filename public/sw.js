// תיקון (לבקשת המשתמש: "במובייל האתר לא עולה כלל תחת כרום") — ה-service-worker הקודם (network-first) עצמו
// זוהה כגורם-סיכון-חוזר: התיעוד כאן כבר הזהיר בעבר מ"בעיית הדף-לא-נמצא שנשארת גם אחרי ניקוי-מטמון" - וזה
// בדיוק מה שקרה עכשיו, בצורה חמורה יותר (האתר לא עולה כלל, לא רק כפתור בודד לא מגיב).
//
// בהינתן שזה כבר קרה פעמיים ופעם השנייה חמורה יותר, ההחלטה כאן היא לוותר על ה-service-worker לגמרי, במקום
// להמשיך לנסות לתקן/לכוונן אותו: קובץ זה כעת "מבטל את עצמו" - מבטל את הרישום שלו ומנקה את כל המטמון ששמר,
// כך שדפדפנים עם גרסה-תקועה-ישנה מתעדכנים אוטומטית בפעם הבאה שהם מנסים לטעון את קובץ ה-SW הזה (שהם כבר
// עושים באופן שוטף, ברירת-המחדל של הדפדפן) - בלי לדרוש מהמשתמש לדעת לנקות-נתוני-אתר בעצמו.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      await self.registration.unregister();
      const clientsList = await self.clients.matchAll({ type: "window" });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});
