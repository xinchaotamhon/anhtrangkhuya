import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json"
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = normalize(pathname).replace(/^([/\\])+/, "") || "index.html";
    let candidate = resolve(join(root, relative));
    if (!candidate.startsWith(root)) throw new Error("outside root");
    if ((await stat(candidate)).isDirectory()) candidate = join(candidate, "index.html");
    const body = await readFile(candidate);
    response.writeHead(200, {
      "Content-Type": mime[extname(candidate)] || "application/octet-stream",
      "Cache-Control": candidate.endsWith("sw.js") ? "no-cache" : "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(body);
  } catch (_) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Không tìm thấy tệp.");
  }
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Ánh Trăng Khuya đang mở tại http://127.0.0.1:${port}\n`);
});
