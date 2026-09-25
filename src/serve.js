/*
Serves one Markdown file as a live page on localhost. The file stays the
source of truth: people, editors, and agents can change it while the page is
open, and the page reloads to match.

Writes are guarded three ways. Every save carries the version (a hash of the
file) that the page was built from, and is refused with 409 if the file has
changed since. Each write goes to a temporary file that is then renamed over
the original, so the file is never left half written. Only the character
between a task's brackets changes, through setTaskState.

The server binds to 127.0.0.1 and answers only requests addressed to
localhost, which blocks DNS rebinding. Saves must be JSON, which a page on
another site cannot send without a CORS preflight that this server never
allows. Files next to the Markdown file (images, for example) are served so
relative links work, but never dotfiles, never anything outside that folder.
*/

const fileSystem = require("fs");
const fileSystemPromises = require("fs/promises");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { renderPage } = require("./build.js");
const { setTaskState, findTaskLines } = require("./tasks.js");

const maximumRequestBytes = 64 * 1024;
const allowedHostNames = new Set(["localhost", "127.0.0.1"]);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

function versionOf(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function send(response, status, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readRequestBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > maximumRequestBytes) throw Object.assign(new Error("Request too large"), { status: 413 });
  }
  return body;
}

/*
Writes through a temporary file in the same folder and renames it over the
original. A rename within one folder is atomic, so readers see either the old
file or the new one, never a mix. It is synchronous on purpose: see
handleTaskSave.
*/
function writeFileAtomically(filePath, text) {
  const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.md-press-${process.pid}.tmp`);
  fileSystem.writeFileSync(temporaryPath, text, "utf8");
  fileSystem.renameSync(temporaryPath, filePath);
}

/*
Applies one checkbox change from the page. Reading the file, checking its
version, and writing it back are all synchronous, with no await in between,
so on this single-threaded server two saves can never interleave and one can
never overwrite the other.
*/
async function handleTaskSave(request, response, sourcePath) {
  if (!(request.headers["content-type"] || "").startsWith("application/json")) {
    return send(response, 415, { error: "Expected application/json" });
  }
  let payload;
  try {
    payload = JSON.parse(await readRequestBody(request));
  } catch (error) {
    return send(response, error.status || 400, { error: error.status ? error.message : "Invalid JSON" });
  }
  const { index, checked, version } = payload || {};
  if (!Number.isInteger(index) || index < 0 || typeof checked !== "boolean" || typeof version !== "string") {
    return send(response, 400, { error: "Expected { index, checked, version }" });
  }

  const currentText = fileSystem.readFileSync(sourcePath, "utf8");
  const currentVersion = versionOf(currentText);
  if (currentVersion !== version) {
    return send(response, 409, { error: "The file changed on disk. Reload to see it.", version: currentVersion });
  }
  if (index >= findTaskLines(currentText).length) {
    return send(response, 400, { error: `No task at index ${index}` });
  }
  const updatedText = setTaskState(currentText, index, checked);
  if (updatedText !== currentText) writeFileAtomically(sourcePath, updatedText);
  return send(response, 200, { version: versionOf(updatedText) });
}

/*
Serves a file from the Markdown file's folder. The resolved path must stay
inside that folder, and any path segment starting with a dot is refused so
files like .env or .git are never exposed.
*/
async function handleFolderFile(response, sourceFolder, requestPath) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(requestPath).replace(/^\/+/, "");
  } catch (_error) {
    return send(response, 400, { error: "Bad path" });
  }
  const segments = relativePath.split(/[\\/]/);
  if (!relativePath || segments.some((segment) => segment.startsWith(".") || segment === "")) {
    return send(response, 404, { error: "Not found" });
  }
  const filePath = path.resolve(sourceFolder, relativePath);
  if (!filePath.startsWith(sourceFolder + path.sep)) return send(response, 404, { error: "Not found" });
  try {
    const stats = await fileSystemPromises.stat(filePath);
    if (!stats.isFile()) return send(response, 404, { error: "Not found" });
    const contentType = contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    return send(response, 200, await fileSystemPromises.readFile(filePath), contentType);
  } catch (_error) {
    return send(response, 404, { error: "Not found" });
  }
}

function createServeHandler(sourcePath) {
  const resolvedSourcePath = path.resolve(sourcePath);
  const sourceFolder = path.dirname(resolvedSourcePath);

  return async function handleRequest(request, response) {
    const hostName = (request.headers.host || "").replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
    if (!allowedHostNames.has(hostName)) return send(response, 403, { error: "Forbidden" });

    try {
      const url = new URL(request.url, "http://localhost");
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const text = fileSystem.readFileSync(resolvedSourcePath, "utf8");
        return send(response, 200, renderPage(text, resolvedSourcePath, { live: { version: versionOf(text) } }), "text/html; charset=utf-8");
      }
      if (request.method === "GET" && url.pathname === "/api/version") {
        return send(response, 200, { version: versionOf(fileSystem.readFileSync(resolvedSourcePath, "utf8")) });
      }
      if (request.method === "POST" && url.pathname === "/api/task") {
        return await handleTaskSave(request, response, resolvedSourcePath);
      }
      if (request.method === "GET") return await handleFolderFile(response, sourceFolder, url.pathname);
      return send(response, 405, { error: "Method not allowed" });
    } catch (error) {
      return send(response, 500, { error: error.message });
    }
  };
}

/*
Starts the server on the first free port, beginning at the requested one and
trying the next nine. Resolves with the server and its address.
*/
function startServer(sourcePath, { port = 5180, attempts = 10 } = {}) {
  const server = http.createServer(createServeHandler(sourcePath));
  return new Promise((resolve, reject) => {
    let attemptPort = port;
    let remainingAttempts = attempts;
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE" && port !== 0 && remainingAttempts > 1) {
        remainingAttempts -= 1;
        attemptPort += 1;
        server.listen(attemptPort, "127.0.0.1");
      } else {
        reject(error);
      }
    });
    server.on("listening", () => {
      const address = server.address();
      resolve({ server, url: `http://localhost:${address.port}` });
    });
    server.listen(attemptPort, "127.0.0.1");
  });
}

module.exports = { startServer, versionOf };
