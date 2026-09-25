# Security

## Reporting a problem

Please email **support@sirux.io** instead of opening a public issue. Include what you found, how to reproduce it, and which version you used. You will get a reply within a few days.

## What md-press does and does not do

- md-press reads the Markdown files you give it and writes HTML files. It makes no network requests while building.
- Built pages load one outside script, Mermaid from jsDelivr, and only when the page contains a diagram.
- Markdown allows raw HTML, and md-press keeps it. A page built from an untrusted file can run that file's scripts when opened. Only press files you trust.
- Checklist progress stays in the viewer's browser storage and is never sent anywhere.

## Supported versions

Security fixes go into the latest release.
