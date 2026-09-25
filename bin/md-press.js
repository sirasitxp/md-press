#!/usr/bin/env node
/*
Command line entry for md-press. Today it has one job, building pages, so a
bare file list builds them. "build" is also accepted as an explicit
subcommand, which leaves room for more modes later without breaking this one.
*/

const fileSystem = require("fs");
const { buildFile } = require("../src/build.js");
const { version } = require("../package.json");

const usageText = `md-press ${version}
Press Markdown into clean, self-contained HTML pages.

Usage:
  md-press <file.md> [more.md ...] [--out folder]

Options:
  --out <folder>   Write pages into this folder instead of next to each file
  -v, --version    Show the version
  -h, --help       Show this help`;

function exitWithError(message) {
  console.error(`md-press: ${message}`);
  console.error("Run md-press --help for usage.");
  process.exit(1);
}

/*
Splits raw arguments into source files and options. Unknown flags are
rejected rather than silently treated as file names.
*/
function readArguments(rawArguments) {
  const sourcePaths = [];
  let outputFolder = null;
  for (let index = 0; index < rawArguments.length; index += 1) {
    const argument = rawArguments[index];
    if (argument === "--out") {
      outputFolder = rawArguments[index + 1];
      if (!outputFolder || outputFolder.startsWith("-")) exitWithError("--out needs a folder name");
      index += 1;
    } else if (argument === "-h" || argument === "--help") {
      console.log(usageText);
      process.exit(0);
    } else if (argument === "-v" || argument === "--version") {
      console.log(version);
      process.exit(0);
    } else if (argument.startsWith("-")) {
      exitWithError(`unknown option ${argument}`);
    } else {
      sourcePaths.push(argument);
    }
  }
  return { sourcePaths, outputFolder };
}

function main() {
  const rawArguments = process.argv.slice(2);
  if (rawArguments[0] === "build") rawArguments.shift();
  const { sourcePaths, outputFolder } = readArguments(rawArguments);

  if (sourcePaths.length === 0) {
    console.log(usageText);
    process.exit(1);
  }
  if (outputFolder) fileSystem.mkdirSync(outputFolder, { recursive: true });

  for (const sourcePath of sourcePaths) {
    if (!fileSystem.existsSync(sourcePath) || !fileSystem.statSync(sourcePath).isFile()) {
      console.error(`Skipped ${sourcePath}: file not found`);
      process.exitCode = 1;
      continue;
    }
    const outputPath = buildFile(sourcePath, outputFolder);
    console.log(`${sourcePath} -> ${outputPath}`);
  }
}

main();
