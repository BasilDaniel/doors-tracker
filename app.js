(() => {
  const APP_VERSION = "1.7.0";

  let doors = Storage.load();
  let selectedFile = null;
  let deferredInstallPrompt = null;

  // Одновременно применяет текстовый поиск и выбранный статус.
  function getFilteredDoors() {
    const query = Dom.elements["search-input"].value
      .trim()
      .toLocaleLowerCase("ru");
    const status = Dom.elements["status-filter"].value;
    const zone = Dom.elements["zone-filter"].value;

    return doors.filter((door) => {
      const matchesSearch =
        !query ||
        Object.values(door).some((value) =>
          String(value).toLocaleLowerCase("ru").includes(query),
        );

      // all означает отсутствие фильтра, пустая строка — двери без статуса.
      const matchesStatus = status === "all" || (door.status || "") === status;
      const matchesZone = zone === "all" || (door.zone || "") === zone;
      return matchesSearch && matchesStatus && matchesZone;
    });
  }

  // Обновляет список и сохраняет единый порядок по номеру DK.
  function render() {
    const sorted = [...getFilteredDoors()].sort((a, b) => {
      const aNumber = Number(
        (a.dk || "").match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER,
      );
      const bNumber = Number(
        (b.dk || "").match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER,
      );
      const aName = a.dk || a.designation || "";
      const bName = b.dk || b.designation || "";
      return aNumber - bNumber || aName.localeCompare(bName, "ru");
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
      `${door.dk || door.designation || "Эта дверь"} будет удалена без возможности отмены.`,
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
    // У записи должен быть хотя бы DK или designation.
    if (!door.dk && !door.designation) {
      alert("Укажите DK или designation.");
      return;
    }

    // Проверяет дубликаты только по заполненному идентификатору.
    const duplicate = doors.find((item) => {
      if (item.id === door.id) return false;
      if (door.dk)
        return (
          item.dk?.toLocaleLowerCase("ru") === door.dk.toLocaleLowerCase("ru")
        );
      return (
        !item.dk &&
        item.designation?.toLocaleLowerCase("ru") ===
          door.designation.toLocaleLowerCase("ru")
      );
    });
    if (duplicate) {
      alert(`Запись ${door.dk || door.designation} уже существует.`);
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
        // Для записей без DK ключом служит designation.
        const getKey = (door) =>
          door.dk
            ? `dk:${door.dk.toLocaleLowerCase("ru")}`
            : `designation:${door.designation.toLocaleLowerCase("ru")}`;
        const byKey = new Map(doors.map((door) => [getKey(door), door]));
        imported.forEach((door) => {
          const key = getKey(door);
          const existing = byKey.get(key);
          byKey.set(key, existing ? { ...door, id: existing.id } : door);
        });
        doors = [...byKey.values()];
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
    Dom.elements["status-filter"].addEventListener("change", render);
    Dom.elements["zone-filter"].addEventListener("change", render);
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

    // Показывает текущую версию приложения в заголовке.
    if (Dom.elements["app-version"])
      Dom.elements["app-version"].textContent = `v${APP_VERSION}`;
    Dom.buildForm();
    bindEvents();
    render();
    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
