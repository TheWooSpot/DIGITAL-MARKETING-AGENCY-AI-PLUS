import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "../src/pages/partner-brief/AI_Readiness_Labs_Partner_Brief.html");
const html = fs.readFileSync(htmlPath, "utf8");

const si = html.indexOf("<style>") + 7;
const se = html.indexOf("</style>");
let styles = html
  .slice(si, se)
  .replace(/^@import\s+url\([^)]+\)\s*;\s*/m, "")
  .trim();

const bi = html.indexOf("<body>");
const scriptStart = html.indexOf('<script src="https://cdn.jsdelivr.net/npm/@supabase');
const body = html
  .slice(html.indexOf(">", bi) + 1, scriptStart)
  .trim()
  .replace('id="calls-badge"', 'id="pb-badge"')
  .replace(
    "<elevenlabs-convai agent-id=",
    '<elevenlabs-convai id="pb-el-widget" agent-id='
  );

const out = { styles, body };
fs.writeFileSync(path.join(__dirname, "../src/pages/_pb_embed.json"), JSON.stringify(out));
console.log("OK", styles.length, body.length);
