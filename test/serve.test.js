/*
Tests for md-press serve, run against a real server on a free port. They
cover the promises the server makes: saves land in the file, stale saves are
refused, and nothing outside the Markdown file's folder or addressed from
another host is served.
*/

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fileSystem = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { startServer, versionOf } = require("../src/serve.js");

let server;
let baseUrl;
let workFolder;
let sourcePath;
const initialText = "# Plan\n\n- [ ] first\n- [x] second\n";

before(async () => {
  workFolder = fileSystem.mkdtempSync(path.join(os.tmpdir(), "md-press-serve-"));
  sourcePath = path.join(workFolder, "plan.md");
  fileSystem.writeFileSync(sourcePath, initialText);
  fileSystem.writeFileSync(path.join(workFolder, "picture.png"), "not really a png");
  fileSystem.writeFileSync(path.join(workFolder, ".env"), "SECRET=1");
  ({ server, url: baseUrl } = await startServer(sourcePath, { port: 0 }));
});

after(() => server.close());

function saveTask(body, contentType = "application/json") {
  return fetch(`${baseUrl}/api/task`, { method: "POST", headers: { "Content-Type": contentType }, body: JSON.stringify(body) });
}

function requestWithHost(pathName, hostHeader) {
  return new Promise((resolve, reject) => {
    const request = http.request(`${baseUrl}${pathName}`, { headers: { Host: hostHeader } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on("error", reject);
    request.end();
  });
}

test("serves a live page for the file", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  const page = await response.text();
  assert.match(page, /<title>Plan<\/title>/);
  assert.match(page, /"writable":true/);
  assert.match(page, new RegExp(`"version":"${versionOf(initialText)}"`));
});

test("a save writes the checkbox into the file and returns the new version", async () => {
  fileSystem.writeFileSync(sourcePath, initialText);
  const response = await saveTask({ index: 0, checked: true, version: versionOf(initialText) });
  assert.equal(response.status, 200);
  const expectedText = "# Plan\n\n- [x] first\n- [x] second\n";
  assert.equal(fileSystem.readFileSync(sourcePath, "utf8"), expectedText);
  assert.deepEqual(await response.json(), { version: versionOf(expectedText) });
  assert.deepEqual(fileSystem.readdirSync(workFolder).filter((name) => name.endsWith(".tmp")), []);
});

test("a save based on an old version is refused and the file is untouched", async () => {
  const editedElsewhere = "# Plan\n\n- [ ] first, renamed in an editor\n- [x] second\n";
  fileSystem.writeFileSync(sourcePath, editedElsewhere);
  const response = await saveTask({ index: 0, checked: true, version: versionOf(initialText) });
  assert.equal(response.status, 409);
  assert.equal(fileSystem.readFileSync(sourcePath, "utf8"), editedElsewhere);
});

test("the version endpoint follows changes on disk", async () => {
  const newText = "# Plan\n\nChanged.\n";
  fileSystem.writeFileSync(sourcePath, newText);
  const { version } = await (await fetch(`${baseUrl}/api/version`)).json();
  assert.equal(version, versionOf(newText));
});

test("bad saves are rejected", async () => {
  fileSystem.writeFileSync(sourcePath, initialText);
  const version = versionOf(initialText);
  assert.equal((await saveTask({ index: 0, checked: true, version }, "text/plain")).status, 415);
  assert.equal((await saveTask({ index: "0", checked: true, version })).status, 400);
  assert.equal((await saveTask({ index: 9, checked: true, version })).status, 400);
  assert.equal(fileSystem.readFileSync(sourcePath, "utf8"), initialText);
});

test("serves files next to the Markdown file, but never dotfiles or outside the folder", async () => {
  assert.equal((await fetch(`${baseUrl}/picture.png`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/.env`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/%2e%2e/%2e%2e/etc/passwd`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/missing.png`)).status, 404);
});

test("only answers requests addressed to localhost", async () => {
  assert.equal(await requestWithHost("/", "evil.example.com"), 403);
  assert.equal(await requestWithHost("/", "localhost"), 200);
});

test("moves to the next port when the first is busy", async () => {
  const busyPort = new URL(baseUrl).port;
  const { server: secondServer, url } = await startServer(sourcePath, { port: Number(busyPort) });
  assert.notEqual(new URL(url).port, busyPort);
  secondServer.close();
});
