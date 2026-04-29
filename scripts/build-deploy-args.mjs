import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const pairs = [
  ["functions/admin-send-invitations/index.ts", "supabase/functions/admin-send-invitations/index.ts"],
  ["functions/_shared/cors.ts", "supabase/functions/_shared/cors.ts"],
  ["functions/_shared/build-brief-invitation-html.ts", "supabase/functions/_shared/build-brief-invitation-html.ts"],
  ["functions/send-brief-invitation/brief-invitation-template.ts", "supabase/functions/send-brief-invitation/brief-invitation-template.ts"],
];

const files = pairs.map(([name, rel]) => ({
  name,
  content: fs.readFileSync(path.join(root, rel), "utf8"),
}));

const payload = {
  name: "admin-send-invitations",
  entrypoint_path: "functions/admin-send-invitations/index.ts",
  verify_jwt: false,
  files,
};

process.stdout.write(JSON.stringify(payload));
