# md-press

[![Test](https://github.com/sirasitxp/md-press/actions/workflows/test.yml/badge.svg)](https://github.com/sirasitxp/md-press/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/md-press.svg)](https://www.npmjs.com/package/md-press)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Press Markdown into clean, self-contained HTML pages. Pure code: no AI, no tokens, no build setup.

```sh
npm install -g md-press
md-press notes.md
```

You get `notes.html`: one file with its styles and scripts inlined, ready to open, share, print, or host anywhere.

## Why

Notes, plans, and trackers live best as Markdown. They read best as a page. md-press turns one into the other in milliseconds, with the same result every time, and works offline.

## Usage

```sh
md-press notes.md                  # writes notes.html next to notes.md
md-press docs/*.md --out pages     # builds many files into one folder
npx md-press notes.md              # runs without installing
```

| Option | What it does |
| --- | --- |
| `--out <folder>` | Writes pages into this folder instead of next to each file |
| `-v`, `--version` | Shows the version |
| `-h`, `--help` | Shows help |

`md-press build notes.md` works too. The explicit `build` subcommand leaves room for more modes later.

## What you get

- **One file.** Styles and scripts are inlined, so the page has no dependencies to lose.
- **Light and dark mode** that follow the system setting, plus clean print styles.
- **Readable on phones.** Wide tables and code scroll inside themselves, never the page.
- **Code highlighting** done at build time, so pages stay fast.
- **Live checklists.** `- [ ]` items become real checkboxes with a progress bar. Progress is saved in the browser and survives rebuilds. Reset returns to what the file says.
- **Smart titles.** Uses frontmatter `title:`, then the first `#` heading, then the file name.
- **Diagrams.** ` ```mermaid ` blocks render as diagrams. This is the only feature that loads anything from the network, and only on pages that have a diagram. Offline, the diagram source shows instead.

See [`examples/showcase.md`](examples/showcase.md) for every feature on one page.

## Frontmatter

```markdown
---
title: Q4 launch plan
description: Owners, dates, and open risks
---
```

`title` sets the browser tab title. `description` sets the page's meta description. Other keys are ignored for now.

## Use it from code

```js
const { renderPage, buildFile } = require("md-press");

const html = renderPage("# Hello\n\n- [ ] Ship it", "hello.md");
buildFile("notes.md", "pages");
```

## Good to know

- **Checklist progress is per browser.** It lives in that browser's storage, keyed by file name. It does not write back to the Markdown file.
- **Raw HTML passes through.** Markdown allows inline HTML, and md-press keeps it. Only press files you trust, the same as opening any HTML file.
- **Requires Node 20 or newer.**

## Docs

- [How it works](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

## License

MIT © Sirasit Thitirattanakorn. Made by [Sirux](https://sirux.io).
