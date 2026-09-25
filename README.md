# md-press

[![Test](https://github.com/sirasitxp/md-press/actions/workflows/test.yml/badge.svg)](https://github.com/sirasitxp/md-press/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/@sirux/md-press.svg)](https://www.npmjs.com/package/@sirux/md-press)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Press Markdown into clean pages. Pure code: no AI, no tokens, no build setup.

```sh
npm install -g @sirux/md-press
md-press notes.md           # build notes.html, a page you can share anywhere
md-press serve notes.md     # open notes.md live, checkboxes save into the file
```

## Why

Notes, plans, and trackers live best as Markdown. They read best as a page. md-press gives the file a better view without taking it away from you. The file stays the source of truth, readable and editable by people, editors, and agents alike.

## Two ways to use it

### Build: a page to share

```sh
md-press notes.md                  # writes notes.html next to notes.md
md-press docs/*.md --out pages     # builds many files into one folder
npx @sirux/md-press notes.md       # runs without installing
```

You get one HTML file with its styles and scripts inlined, ready to open, send, print, or host anywhere. Checklist progress on a built page is saved in the viewer's browser.

### Serve: a live page for working

```sh
md-press serve notes.md
```

Opens `notes.md` at `http://localhost:5180`.

- **Checking a box saves `[x]` into the file.** Only that one character changes.
- **Edit the file anywhere**, in an editor or with an agent, and the page updates on its own, keeping your scroll position.
- **Safe with other editors.** If the file changed since the page loaded, a save is refused and the page reloads, so no one's edit is overwritten.
- **Images next to the file show up**, so relative links like `![](screenshot.png)` work.

Stop it with Ctrl+C.

## Options

| Option | Mode | What it does |
| --- | --- | --- |
| `--out <folder>` | build | Writes pages into this folder instead of next to each file |
| `--port <number>` | serve | Port to start from. Default 5180, and the next 9 are tried if it is busy |
| `--no-open` | serve | Does not open the browser |
| `-v`, `--version` | any | Shows the version |
| `-h`, `--help` | any | Shows help |

`md-press build notes.md` works too, same as `md-press notes.md`.

## What every page gets

- **Light and dark mode** that follow the system setting, plus clean print styles.
- **Readable on phones.** Wide tables and code scroll inside themselves, never the page.
- **Code highlighting**, done when the page is made, so pages stay fast.
- **Checklists.** `- [ ]` items become real checkboxes with a progress bar.
- **Smart titles.** Uses frontmatter `title:`, then the first `#` heading, then the file name.
- **Diagrams.** ` ```mermaid ` blocks render as diagrams. This is the only feature that loads anything from the network, and only on pages that have a diagram. Offline, the diagram source shows instead.

See [`examples/showcase.md`](examples/showcase.md) for every feature on one page. Try it both ways.

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
const { renderPage, buildFile } = require("@sirux/md-press");

const html = renderPage("# Hello\n\n- [ ] Ship it", "hello.md");
buildFile("notes.md", "pages");
```

## Good to know

- **Built pages save progress per browser**, keyed by file name. Only `serve` writes to the file.
- **A served page is read-only if md-press cannot match every checkbox to its line**, for example when a task sits inside an indented code block. It says so in the toolbar rather than risk editing the wrong line.
- **Raw HTML is kept**, so `<kbd>` and `<details>` work. To show a tag as text, wrap it in backticks. Only press or serve files you trust, the same as opening any HTML file.
- **`serve` answers only this computer.** It is not reachable from your phone or network.
- **The package is `@sirux/md-press`, the command is `md-press`.** npm reserves plain `md-press` because it is close to an older, unrelated package.
- **Requires Node 20 or newer.**

## Docs

- [How it works](docs/architecture.md)
- [Decisions](docs/decisions.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

## License

MIT © Sirasit Thitirattanakorn. Made by [Sirux](https://sirux.io).
