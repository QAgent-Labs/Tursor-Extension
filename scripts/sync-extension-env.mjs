import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, "extension", ".env");
const primary = path.join(root, ".env");
const fallback = path.join(root, ".env.example");

const src = fs.existsSync(primary) ? primary : fallback;
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[sync-extension-env] ${path.relative(root, src)} -> extension/.env`);
