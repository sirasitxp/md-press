# Contributing

Thanks for helping make md-press better.

## Setup

```sh
git clone https://github.com/sirasitxp/md-press.git
cd md-press
npm install
npm run check     # lint and tests, the same as CI
```

Try your change on the showcase page, both ways:

```sh
node bin/md-press.js examples/showcase.md && open examples/showcase.html
node bin/md-press.js serve examples/showcase.md
```

To use your local copy as the `md-press` command, run `npm link`. Undo it with `npm unlink -g @sirux/md-press`.

Built `.html` files are git-ignored.

## Code style

- Use full, descriptive names. No abbreviations or acronyms in identifiers (`sourcePath`, not `src`).
- Prefix intentionally unused variables and arguments with an underscore (`_error`).
- Put one `/* */` block comment above a function when its design needs explaining. Describe the why, not each line. No per-line comments, and no leading `*` inside the block.
- Keep the command line thin. Logic belongs in `src/` as plain, testable functions.
- New runtime dependencies need a strong reason. See [How it works](docs/architecture.md).
- When you make a choice someone might later question, add an entry to [Decisions](docs/decisions.md).

ESLint enforces the mechanical parts: `npm run lint`.

## Tests

Tests use Node's built-in runner, so there is nothing extra to install. Add a test for every bug fix and every new behavior in `test/`.

## Pull requests

1. Branch from `main`.
2. Keep each pull request to one change.
3. Run `npm run check`.
4. Add a line to `CHANGELOG.md` under an "Unreleased" heading.

## Releasing (maintainers)

```sh
npm version patch   # or minor, or major
git push --follow-tags
npm publish
```

`npm publish` runs lint and tests first and stops if either fails.
