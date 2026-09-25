#!/usr/bin/env node
/*
Command line entry for md-press. Two modes share one parser for options:
"build" (the default, so a bare file list builds pages) and "serve", which
opens one file as a live page on localhost. The command stays thin; all
behavior worth testing lives in src/.
*/

const fileSystem = require("fs");
const { spawn } = require("child_process");
const { buildFile } = require("../src/build.js");
const { startServer } = require("../src/serve.js");
const { version } = require("../package.json");

const usageText = `md-press ${version}
Press Markdown into clean pages, to share or to work in.

Usage:
  md-press <file.md> [more.md ...] [--out folder]   Build static pages
  md-press serve <file.md> [--port 5180]            Open a live page that saves checkboxes to the file

Options:
  --out <folder>   Build: write pages into this folder instead of next to each file
  --port <number>  Serve: port to start from (default 5180, tries the next 9 if busy)
  --no-open        Serve: do not open the browser
  -v, --version    Show the version
  -h, --help       Show this help`;

function exitWithError(message) {
  console.error(`md-press: ${message}`);
  console.error("Run md-press --help for usage.");
  process.exit(1);
}

/*
Splits raw arguments into file paths and options. Options that do not apply
to the chosen mode, and unknown flags, are rejected rather than silently
ignored or treated as file names.
*/
function readArguments(rawArguments, mode) {
  const sourcePaths = [];
  const options = { outputFolder: null, port: 5180, openBrowser: true };
  for (let index = 0; index < rawArguments.length; index += 1) {
    const argument = rawArguments[index];
    const nextArgument = rawArguments[index + 1];
    if (argument === "-h" || argument === "--help") {
      console.log(usageText);
      process.exit(0);
    } else if (argument === "-v" || argument === "--version") {
      console.log(version);
      process.exit(0);
    } else if (argument === "--out" && mode === "build") {
      if (!nextArgument || nextArgument.startsWith("-")) exitWithError("--out needs a folder name");
      options.outputFolder = nextArgument;
      index += 1;
    } else if (argument === "--port" && mode === "serve") {
      const port = Number(nextArgument);
      if (!Number.isInteger(port) || port < 1 || port > 65535) exitWithError("--port needs a number from 1 to 65535");
      options.port = port;
      index += 1;
    } else if (argument === "--no-open" && mode === "serve") {
      options.openBrowser = false;
    } else if (argument.startsWith("-")) {
      exitWithError(`unknown option ${argument} for ${mode}`);
    } else {
      sourcePaths.push(argument);
    }
  }
  return { sourcePaths, options };
}

function isReadableFile(filePath) {
  return fileSystem.existsSync(filePath) && fileSystem.statSync(filePath).isFile();
}

function runBuild(rawArguments) {
  const { sourcePaths, options } = readArguments(rawArguments, "build");
  if (sourcePaths.length === 0) {
    console.log(usageText);
    process.exit(1);
  }
  if (options.outputFolder) fileSystem.mkdirSync(options.outputFolder, { recursive: true });

  for (const sourcePath of sourcePaths) {
    if (!isReadableFile(sourcePath)) {
      console.error(`Skipped ${sourcePath}: file not found`);
      process.exitCode = 1;
      continue;
    }
    const outputPath = buildFile(sourcePath, options.outputFolder);
    console.log(`${sourcePath} -> ${outputPath}`);
  }
}

/*
Opens the page in the default browser. Failure is harmless because the URL
is also printed, so errors from the opener are ignored.
*/
function openInBrowser(url) {
  const opener = process.platform === "darwin"
    ? ["open", [url]]
    : process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : ["xdg-open", [url]];
  const child = spawn(opener[0], opener[1], { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}

async function runServe(rawArguments) {
  const { sourcePaths, options } = readArguments(rawArguments, "serve");
  if (sourcePaths.length !== 1) exitWithError("serve takes exactly one Markdown file");
  const [sourcePath] = sourcePaths;
  if (!isReadableFile(sourcePath)) exitWithError(`${sourcePath}: file not found`);

  try {
    const { url } = await startServer(sourcePath, { port: options.port });
    console.log(`Serving ${sourcePath} at ${url}`);
    console.log("Checkbox changes save to the file. Press Ctrl+C to stop.");
    if (options.openBrowser) openInBrowser(url);
  } catch (error) {
    exitWithError(`could not start the server: ${error.message}`);
  }
}

function main() {
  const rawArguments = process.argv.slice(2);
  if (rawArguments[0] === "serve") return runServe(rawArguments.slice(1));
  if (rawArguments[0] === "build") return runBuild(rawArguments.slice(1));
  return runBuild(rawArguments);
}

main();
