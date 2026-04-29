/**
 * Minimal static server for local preview when `npm run dev` is unavailable.
 * Prefer: npm install && npm run dev
 */
import http from "http";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  let u = decodeURIComponent((req.url || "").split("?")[0]);
  if (u === "/") u = "/index.html";
  const rel = u.startsWith("/") ? u.slice(1) : u;
  const p = path.join(root, rel);
  if (!p.startsWith(root)) {
    res.writeHead(403);
    return res.end();
  }
  fs.stat(p, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(p);
    res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
    fs.createReadStream(p).pipe(res);
  });
});

function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) out.push(ni.address);
    }
  }
  return out;
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3010;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Brewo static preview running on port ${PORT}`);
  console.log(`  Local:    http://127.0.0.1:${PORT}/`);
  for (const ip of lanAddresses()) {
    console.log(`  Network:  http://${ip}:${PORT}/   ← open this URL so QR works on phone`);
  }
});
