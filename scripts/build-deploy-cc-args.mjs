import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const index = fs.readFileSync(
  path.join(root, "supabase/functions/admin-command-center-data/index.ts"),
  "utf8",
);
const cors = fs.readFileSync(
  path.join(root, "supabase/functions/admin-command-center-data/cors.ts"),
  "utf8",
);
const args = {
  name: "admin-command-center-data",
  entrypoint_path: "index.ts",
  verify_jwt: false,
  files: [
    { name: "index.ts", content: index },
    { name: "cors.ts", content: cors },
  ],
};
const out = path.join(root, "deploy/mcp-deploy-cc-args.json");
fs.writeFileSync(out, JSON.stringify(args), "utf8");
console.log("wrote", out, fs.statSync(out).size);
