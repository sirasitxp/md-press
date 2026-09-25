/*
Makes task list checkboxes remember their state in this browser. Each box is
keyed by its label text (plus a counter for duplicate labels), so reordering
or adding items in the Markdown does not scramble saved progress. Browser
storage can be blocked, for example in private windows, so every storage call
goes through helpers that fail quietly: the checklist still works, it just
forgets on reload. The build step defines storageKey before this script runs.
*/
(function () {
  const checkboxes = Array.from(document.querySelectorAll("input.task"));
  const progressFill = document.querySelector(".progress-fill");
  const progressLabel = document.querySelector(".progress-label");
  const resetButton = document.querySelector(".progress-reset");
  const seenLabels = {};

  function readSavedStates() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch (_error) {
      return {};
    }
  }

  function writeSavedStates(states) {
    try {
      if (states) localStorage.setItem(storageKey, JSON.stringify(states));
      else localStorage.removeItem(storageKey);
    } catch (_error) {
      return;
    }
  }

  function saveAndUpdate() {
    const states = {};
    checkboxes.forEach(function (checkbox) { states[checkbox.dataset.key] = checkbox.checked; });
    writeSavedStates(states);
    updateProgress();
  }

  function updateProgress() {
    const doneCount = checkboxes.filter(function (checkbox) { return checkbox.checked; }).length;
    checkboxes.forEach(function (checkbox) { checkbox.parentElement.classList.toggle("done", checkbox.checked); });
    progressFill.style.width = (doneCount / checkboxes.length * 100) + "%";
    progressLabel.textContent = doneCount + " of " + checkboxes.length + " done";
  }

  const savedStates = readSavedStates();
  checkboxes.forEach(function (checkbox) {
    const labelText = checkbox.parentElement.textContent.trim().replace(/\s+/g, " ");
    seenLabels[labelText] = (seenLabels[labelText] || 0) + 1;
    checkbox.dataset.key = labelText + "#" + seenLabels[labelText];
    checkbox.dataset.default = checkbox.checked ? "1" : "0";
    if (checkbox.dataset.key in savedStates) checkbox.checked = savedStates[checkbox.dataset.key];
    checkbox.setAttribute("aria-label", labelText);
    checkbox.addEventListener("change", saveAndUpdate);
  });

  resetButton.addEventListener("click", function () {
    if (!confirm("Clear saved progress and restore the checklist from the file?")) return;
    writeSavedStates(null);
    checkboxes.forEach(function (checkbox) { checkbox.checked = checkbox.dataset.default === "1"; });
    updateProgress();
  });

  updateProgress();
})();
