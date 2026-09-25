# Security

## Reporting a problem

Please email **support@sirux.io** instead of opening a public issue. Include what you found, how to reproduce it, and which version you used. You will get a reply within a few days.

## What md-press does and does not do

- md-press reads the Markdown files you give it and writes HTML files. It makes no network requests while building.
- Pages load one outside script, Mermaid from jsDelivr, and only when the page contains a diagram.
- Markdown allows raw HTML, and md-press keeps it. A page built or served from an untrusted file can run that file's scripts when opened. Only press or serve files you trust.
- On built pages, checklist progress stays in the viewer's browser storage and is never sent anywhere.

### md-press serve

- Listens on `127.0.0.1` only, and answers only requests whose Host is `localhost` or `127.0.0.1`. This blocks DNS rebinding attacks from websites you visit.
- Saves must be sent as JSON, which another website cannot do without a CORS preflight. The server never allows one.
- Writes only the served Markdown file, and only the character between a task's brackets.
- Serves other files from the Markdown file's folder so images work, but never dotfiles (such as `.env` or `.git`) and never anything outside that folder. Do not serve a file from a folder holding secrets in plain, non-dot files.

## Supported versions

Security fixes go into the latest release.
