(() => {
  let doors = Storage.load();
  let selectedFile = null;
  let deferredInstallPrompt = null;

  // Поиск ведётся сразу по всем полям двери.
  function getFilteredDoors() {
    const query = Dom.elements["search-input"].value
      .trim()
      .toLocaleLowerCase("ru");
    if (!query) return doors;
    return doors.filter((door) =>
      Object.values(door).some((value) =>
        String(value).toLocaleLowerCase("ru").includes(query),
      ),
    );
  }

  // Обновляет список и сохраняет единый порядок по номеру DK.
  function render() {
    const sorted = [...getFilteredDoors()].sort((a, b) => {
      const aNumber = Number(a.dk.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
      const bNumber = Number(b.dk.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
      return aNumber - bNumber || a.dk.localeCompare(b.dk, "ru");
    });
    Dom.renderDoors(sorted, { onEdit: editDoor, onDelete: deleteDoor });
  }

  function editDoor(door) {
    Dom.openDoorDialog(door);
  }

  // Удаляет дверь только после явного подтверждения.
  async function deleteDoor(door) {
    const accepted = await Dom.confirm(
      "Удалить дверь?",
      `${door.dk || "Эта дверь"} будет удалена без возможности отмены.`,
    );
    if (!accepted) return;
    doors = doors.filter((item) => item.id !== door.id);
    Storage.save(doors);
    render();
  }

  // Обновляет существующую запись или добавляет новую.
  function saveDoor(event) {
    event.preventDefault();
    const door = Dom.readDoorForm();
    const duplicate = doors.find(
      (item) =>
        item.dk.toLocaleLowerCase("ru") === door.dk.toLocaleLowerCase("ru") &&
        item.id !== door.id,
    );
    if (duplicate) {
      alert(`Дверь ${door.dk} уже существует.`);
      return;
    }
    const index = doors.findIndex((item) => item.id === door.id);
    if (index >= 0) doors[index] = door;
    else doors.push(door);
    Storage.save(doors);
    Dom.elements["door-dialog"].close();
    render();
  }

  // Импорт либо заменяет каталог, либо объединяет записи по DK.
  async function importCsv() {
    if (!selectedFile) return;
    try {
      const imported = Csv.parse(await selectedFile.text());
      const mode = document.querySelector(
        'input[name="import-mode"]:checked',
      ).value;
      if (mode === "replace") {
        doors = imported;
      } else {
        const byDk = new Map(
          doors.map((door) => [door.dk.toLocaleLowerCase("ru"), door]),
        );
        imported.forEach((door) => {
          const key = door.dk.toLocaleLowerCase("ru");
          const existing = byDk.get(key);
          byDk.set(key, existing ? { ...door, id: existing.id } : door);
        });
        doors = [...byDk.values()];
      }
      Storage.save(doors);
      Dom.elements["import-status"].textContent =
        `Импортировано записей: ${imported.length}.`;
      Dom.elements["csv-file-input"].value = "";
      selectedFile = null;
      Dom.elements["import-button"].disabled = true;
      render();
    } catch (error) {
      Dom.elements["import-status"].textContent = `Ошибка: ${error.message}`;
    }
  }

  // Подключает все пользовательские действия в одном месте.
  function bindEvents() {
    document
      .querySelectorAll(".nav-button")
      .forEach((button) =>
        button.addEventListener("click", () =>
          Dom.showScreen(button.dataset.screen),
        ),
      );
    Dom.elements["search-input"].addEventListener("input", render);
    Dom.elements["add-door-button"].addEventListener("click", () =>
      Dom.openDoorDialog(),
    );
    Dom.elements["door-form"].addEventListener("submit", saveDoor);
    Dom.elements["close-dialog-button"].addEventListener("click", () =>
      Dom.elements["door-dialog"].close(),
    );
    Dom.elements["cancel-door-button"].addEventListener("click", () =>
      Dom.elements["door-dialog"].close(),
    );

    Dom.elements["csv-file-input"].addEventListener("change", (event) => {
      selectedFile = event.target.files[0] || null;
      Dom.elements["import-button"].disabled = !selectedFile;
      Dom.elements["import-status"].textContent = selectedFile
        ? `Выбран файл: ${selectedFile.name}`
        : "";
    });
    Dom.elements["import-button"].addEventListener("click", importCsv);
    Dom.elements["export-button"].addEventListener("click", () =>
      Csv.download(doors),
    );
    Dom.elements["reset-button"].addEventListener("click", async () => {
      const accepted = await Dom.confirm(
        "Восстановить исходные данные?",
        "Все локальные изменения будут удалены.",
        "Восстановить",
      );
      if (!accepted) return;
      doors = Storage.reset();
      render();
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      Dom.elements["install-button"].hidden = false;
    });
    Dom.elements["install-button"].addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      Dom.elements["install-button"].hidden = true;
    });
  }

  // Регистрирует service worker только при поддержке браузером.
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .catch((error) => console.error("Service worker:", error));
    }
  }

  function init() {
    Dom.cache();
    Dom.buildForm();
    bindEvents();
    render();
    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
