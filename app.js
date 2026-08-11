(() => {
  const APP_VERSION = "1.9.0";

  let doors = Storage.load();
  let selectedFile = null;
  let deferredInstallPrompt = null;

  // Применяет поиск и все активные фильтры.
  function getFilteredDoors() {
    const query = Dom.elements["search-input"].value
      .trim()
      .toLocaleLowerCase("ru");
    const status = Dom.elements["status-filter"].value;
    const zone = Dom.elements["zone-filter"].value;
    const notes = Dom.elements["notes-filter"].value;

    return doors.filter((door) => {
      const matchesSearch =
        !query ||
        Object.values(door).some((value) =>
          String(value).toLocaleLowerCase("ru").includes(query),
        );

      const matchesStatus = status === "all" || (door.status || "") === status;
      const matchesZone = zone === "all" || (door.zone || "") === zone;
      const hasNotes = Boolean((door.notes || "").trim());
      const matchesNotes =
        notes === "all" || (notes === "with" ? hasNotes : !hasNotes);

      return matchesSearch && matchesStatus && matchesZone && matchesNotes;
    });
  }

  // Сортирует и выводит список дверей.
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

  // Удаляет запись после подтверждения.
  async function deleteDoor(door) {
    const name = door.dk || door.designation || "Эта дверь";
    const accepted = await Dom.confirm(
      "Удалить дверь?",
      `${name} будет удалена без возможности отмены.`,
    );

    if (!accepted) return;

    doors = doors.filter((item) => item.id !== door.id);
    Storage.save(doors);
    render();
  }

  // Сохраняет новую или изменённую дверь.
  function saveDoor(event) {
    event.preventDefault();
    const door = Dom.readDoorForm();

    const duplicate = doors.find((item) => {
      if (item.id === door.id) return false;
      if (door.dk) {
        return (
          item.dk?.toLocaleLowerCase("ru") === door.dk.toLocaleLowerCase("ru")
        );
      }
      if (door.designation) {
        return (
          !item.dk &&
          item.designation?.toLocaleLowerCase("ru") ===
            door.designation.toLocaleLowerCase("ru")
        );
      }
      return false;
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

  // Импортирует CSV с заменой или объединением данных.
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
        // DK используется как основной ключ, затем designation.
        // Записи без обоих значений получают уникальный ключ.
        const getKey = (door) => {
          if (door.dk) return `dk:${door.dk.toLocaleLowerCase("ru")}`;
          if (door.designation)
            return `designation:${door.designation.toLocaleLowerCase("ru")}`;
          return `id:${door.id}`;
        };

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

  // Показывает или скрывает общий блок фильтров.
  function toggleFilters() {
    const button = document.getElementById("filters-toggle");
    const panel = document.getElementById("filters-panel");
    const willOpen = panel.hidden;

    panel.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    button.classList.toggle("is-active", willOpen);
  }

  // Подключает пользовательские действия.
  function bindEvents() {
    document.querySelectorAll(".nav-button[data-screen]").forEach((button) => {
      button.addEventListener("click", () =>
        Dom.showScreen(button.dataset.screen),
      );
    });

    document
      .getElementById("filters-toggle")
      .addEventListener("click", toggleFilters);
    Dom.elements["search-input"].addEventListener("input", render);
    Dom.elements["status-filter"].addEventListener("change", render);
    Dom.elements["zone-filter"].addEventListener("change", render);
    Dom.elements["notes-filter"].addEventListener("change", render);
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

  // Регистрирует service worker и проверяет обновление при запуске.
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((error) => console.error("Service worker:", error));
  }

  function init() {
    Dom.cache();

    if (Dom.elements["app-version"]) {
      Dom.elements["app-version"].textContent = `v${APP_VERSION}`;
    }

    Dom.buildForm();
    bindEvents();
    render();
    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
