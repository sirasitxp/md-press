/*
Runs inside every page that has a checklist, and inside every served page.
The build step defines mdPress before this script: a storage key, plus a live
object when the page comes from md-press serve.

A built page is static, so checkbox state is saved in this browser only, keyed
by label text (plus a counter for duplicate labels) so edits to the file do
not scramble saved progress. Reset returns to what the file says.

A served page writes each checkbox to the Markdown file itself. Every save
carries the file version the page was built from, and the server refuses it if
the file changed since, so the page reloads instead of overwriting someone
else's edit. The page also watches the version and reloads, keeping its scroll
position, whenever the file changes on disk.

Browser storage can be blocked, for example in private windows, so every
storage call fails quietly: the page still works, it just forgets more.
*/
(function () {
  const checkboxes = Array.from(document.querySelectorAll("input.task"));
  const progressFill = document.querySelector(".progress-fill");
  const progressLabel = document.querySelector(".progress-label");
  const statusLabel = document.querySelector(".toolbar-status");
  const resetButton = document.querySelector(".progress-reset");
  const scrollStorageKey = "md-press-scroll:" + location.pathname;

  function readStorage(storage, key) {
    try {
      return storage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch (_error) {
      return;
    }
  }

  function updateProgress() {
    if (!progressFill || checkboxes.length === 0) return;
    const doneCount = checkboxes.filter(function (checkbox) { return checkbox.checked; }).length;
    checkboxes.forEach(function (checkbox) { checkbox.parentElement.classList.toggle("done", checkbox.checked); });
    progressFill.style.width = (doneCount / checkboxes.length * 100) + "%";
    progressLabel.textContent = doneCount + " of " + checkboxes.length + " done";
  }

  function labelFor(checkbox) {
    return checkbox.parentElement.textContent.trim().replace(/\s+/g, " ");
  }

  function setupStoredChecklist() {
    const seenLabels = {};
    let savedStates = {};
    try {
      savedStates = JSON.parse(readStorage(localStorage, mdPress.storageKey)) || {};
    } catch (_error) {
      savedStates = {};
    }

    function saveStates() {
      const states = {};
      checkboxes.forEach(function (checkbox) { states[checkbox.dataset.key] = checkbox.checked; });
      writeStorage(localStorage, mdPress.storageKey, JSON.stringify(states));
      updateProgress();
    }

    checkboxes.forEach(function (checkbox) {
      const labelText = labelFor(checkbox);
      seenLabels[labelText] = (seenLabels[labelText] || 0) + 1;
      checkbox.dataset.key = labelText + "#" + seenLabels[labelText];
      checkbox.dataset.default = checkbox.checked ? "1" : "0";
      if (checkbox.dataset.key in savedStates) checkbox.checked = savedStates[checkbox.dataset.key];
      checkbox.addEventListener("change", saveStates);
    });

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        if (!confirm("Clear saved progress and restore the checklist from the file?")) return;
        writeStorage(localStorage, mdPress.storageKey, null);
        checkboxes.forEach(function (checkbox) { checkbox.checked = checkbox.dataset.default === "1"; });
        updateProgress();
      });
    }
  }

  function setupLiveFile() {
    const live = mdPress.live;
    let currentVersion = live.version;
    let pendingSaves = 0;
    let serverReachable = true;

    function setStatus(text, isError) {
      statusLabel.textContent = text;
      statusLabel.classList.toggle("error", Boolean(isError));
    }

    function reloadKeepingScroll() {
      writeStorage(sessionStorage, scrollStorageKey, String(window.scrollY));
      location.reload();
    }

    const savedScroll = Number(readStorage(sessionStorage, scrollStorageKey));
    writeStorage(sessionStorage, scrollStorageKey, null);
    if (savedScroll > 0) window.scrollTo(0, savedScroll);

    if (!live.writable) {
      checkboxes.forEach(function (checkbox) { checkbox.disabled = true; });
      setStatus("Read-only: some checkboxes could not be matched to lines in " + live.fileName, true);
    }

    async function saveCheckbox(checkbox, taskIndex) {
      pendingSaves += 1;
      checkbox.disabled = true;
      setStatus("Saving");
      try {
        const response = await fetch("/api/task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: taskIndex, checked: checkbox.checked, version: currentVersion }),
        });
        if (response.status === 409) return reloadKeepingScroll();
        if (!response.ok) throw new Error("Save failed with status " + response.status);
        currentVersion = (await response.json()).version;
        setStatus("Saved to " + live.fileName);
      } catch (_error) {
        checkbox.checked = !checkbox.checked;
        setStatus("Could not save. Is md-press serve still running?", true);
      } finally {
        pendingSaves -= 1;
        checkbox.disabled = !live.writable;
        updateProgress();
      }
    }

    if (live.writable) {
      checkboxes.forEach(function (checkbox, taskIndex) {
        checkbox.addEventListener("change", function () { saveCheckbox(checkbox, taskIndex); });
      });
    }

    setInterval(async function () {
      if (pendingSaves > 0) return;
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        const { version } = await response.json();
        if (!serverReachable) {
          serverReachable = true;
          setStatus("Live, saving to " + live.fileName);
        }
        if (version !== currentVersion) reloadKeepingScroll();
      } catch (_error) {
        serverReachable = false;
        setStatus("Server stopped. Run md-press serve again to keep saving.", true);
      }
    }, 1500);
  }

  checkboxes.forEach(function (checkbox) { checkbox.setAttribute("aria-label", labelFor(checkbox)); });
  if (mdPress.live) setupLiveFile();
  else setupStoredChecklist();
  updateProgress();
})();
