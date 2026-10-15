// סנכרון (npm run sync -- <נתיב למאגר> [...]): מעתיק את src/ ואת scripts/ מהמאגר הראשי לגרסאות האחרות (צמחונית, demo2).
// src/variant.js לא מועתק — כל מאגר מחזיק את הגרסה שלו ("veg" / "demo2"). אחרי הסנכרון: npm run build, check ו-smoke במאגר היעד
import { cpSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const variantOf = d => { try { return (readFileSync(path.join(d, "src/variant.js"), "utf8").match(/VARIANT\s*=\s*"(\w+)"/) || [])[1]; } catch { return null; } };
const targets = process.argv.slice(2);
if (!targets.length) { console.log("שימוש: npm run sync -- <נתיב למאגר> [<נתיב נוסף>]"); process.exit(1); }
if (variantOf(root) !== "main") { console.log("⚠ מריצים רק מהמאגר הראשי (VARIANT=\"main\")"); process.exit(1); }
let bad = 0;
for (const t of targets) { const d = path.resolve(t), v = variantOf(d);
  if (!v || v === "main") { console.log(`✗ ${d}: אין src/variant.js עם גרסה אחרת מ-main — לא מסונכרן`); bad++; continue; }
  for (const f of readdirSync(path.join(root, "src"))) if (f !== "variant.js") cpSync(path.join(root, "src", f), path.join(d, "src", f), { recursive: true });
  if (existsSync(path.join(root, "scripts"))) cpSync(path.join(root, "scripts"), path.join(d, "scripts"), { recursive: true });
  console.log(`✓ ${d} (${v}) — src/ ו-scripts/ עודכנו`); }
process.exit(bad ? 1 : 0);
