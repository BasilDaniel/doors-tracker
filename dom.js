const Dom = (() => {
  const fieldConfig = [
    { key: "dk", label: "DK" },
    { key: "designation", label: "Обозначение двери" },
    {
      key: "status",
      label: "Статус",
      type: "select",
      options: ["", "Готово", "Монтаж", "Тестирование", "Зависимость"],
    },
    {
      key: "zone",
      label: "Зона",
      type: "select",
      options: ["", "Офисное здание", "Цех", "Другие здания"],
    },
    {
      key: "floor",
      label: "Этаж",
      type: "select",
      options: ["", "1 эт", "2 эт", "Тех. эт"],
    },
    {
      key: "access",
      label: "СКУД",
      type: "select",
      options: ["", "M — Master", "M-S — Master Slave"],
    },
    { key: "lock", label: "Замок / привод" },
    { key: "latch", label: "Защёлка" },
    {
      key: "mode",
      label: "Режим работы",
      type: "select",
      options: ["", "RS — fail safe", "AS — fail secure"],
    },
    { key: "panic", label: "Паника / эвакуация", wide: true },
    { key: "notes", label: "Notes", type: "textarea", wide: true },
  ];

  const elements = {};

  // Сохраняет ссылки на элементы, чтобы не искать их повторно.
  function cache() {
    [
      "doors-list",
      "doors-count",
      "search-input",
      "status-filter",
      "zone-filter",
      "floor-filter",
      "notes-filter",
      "add-door-button",
      "app-version",
      "door-dialog",
      "door-form",
      "door-id",
      "dialog-title",
      "door-form-fields",
      "close-dialog-button",
      "cancel-door-button",
      "confirm-dialog",
      "confirm-title",
      "confirm-message",
      "csv-file-input",
      "import-button",
      "import-status",
      "export-button",
      "reset-button",
      "install-button",
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  // Создаёт краткий тег только для заполненных значений.
  function makeTag(text) {
    if (!text) return null;
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = text;
    return tag;
  }

  // Возвращает CSS-класс статуса без привязки к отображаемому тексту.
  function getStatusClass(status) {
    if (status === "Готово") return "status-ready";
    if (status === "Монтаж") return "status-installation";
    if (status === "Тестирование") return "status-testing";
    if (status === "Зависимость") return "status-dependency";
    return "status-empty";
  }

  // Создаёт заметную метку статуса для заголовка карточки.
  function makeStatus(status) {
    const badge = document.createElement("span");
    badge.className = `door-status ${getStatusClass(status)}`;
    badge.textContent = status || "Статус не указан";
    return badge;
  }

  // Перерисовывает сворачиваемые карточки после поиска или изменения данных.
  function renderDoors(doors, handlers) {
    elements["doors-list"].replaceChildren();
    elements["doors-count"].textContent = doors.length;

    if (!doors.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Двери не найдены.";
      elements["doors-list"].append(empty);
      return;
    }

    doors.forEach((door) => {
      const card = document.createElement("details");
      card.className = "door-card";

      // В закрытом виде видны только DK, designation и статус.
      const summary = document.createElement("summary");
      summary.className = "door-summary";

      const heading = document.createElement("div");
      heading.className = "door-heading";
      const title = document.createElement("h3");
      // Если DK и designation не заполнены, показывает прочерк.
      title.textContent =
        [door.dk, door.designation].filter(Boolean).join(" · ") || "—";
      heading.append(title);

      const statusWrap = document.createElement("div");
      statusWrap.className = "door-status-wrap";
      statusWrap.append(makeStatus(door.status));

      // Notes показываются только в шапке карточки и видны даже в свернутом состоянии.
      if (door.notes) {
        const notes = document.createElement("p");
        notes.className = "door-summary-notes";
        notes.textContent = door.notes;
        heading.append(notes);
      }

      summary.append(heading, statusWrap);

      // Остальные параметры и действия показываются после раскрытия карточки.
      const body = document.createElement("div");
      body.className = "door-card-body";

      const location = document.createElement("div");
      location.className = "door-location";
      location.append(
        ...[makeTag(door.zone), makeTag(door.floor)].filter(Boolean),
      );

      const details = document.createElement("div");
      details.className = "door-details";
      details.append(
        ...[door.access, door.lock, door.latch, door.mode, door.panic]
          .map(makeTag)
          .filter(Boolean),
      );

      if (!location.childElementCount && !details.childElementCount) {
        const emptyDetails = document.createElement("p");
        emptyDetails.className = "door-empty-details";
        emptyDetails.textContent = "Дополнительные параметры не указаны.";
        details.append(emptyDetails);
      }

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const edit = document.createElement("button");
      edit.className = "button button-secondary";
      edit.type = "button";
      edit.textContent = "Редактировать";
      edit.addEventListener("click", () => handlers.onEdit(door));

      const remove = document.createElement("button");
      remove.className = "button button-danger";
      remove.type = "button";
      remove.textContent = "Удалить";
      remove.addEventListener("click", () => handlers.onDelete(door));

      actions.append(edit, remove);
      body.append(location, details, actions);
      card.append(summary, body);
      elements["doors-list"].append(card);
    });
  }

  // Строит форму из компактного описания полей.
  function buildForm() {
    fieldConfig.forEach((field) => {
      const wrapper = document.createElement("label");
      if (field.wide) wrapper.className = "form-field-wide";
      wrapper.textContent = field.label;

      let control;
      if (field.type === "select") {
        control = document.createElement("select");
        field.options.forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value || "Без значения";
          control.append(option);
        });
      } else if (field.type === "textarea") {
        control = document.createElement("textarea");
        control.rows = 3;
      } else {
        control = document.createElement("input");
        control.type = "text";
      }
      control.name = field.key;
      control.required = Boolean(field.required);
      wrapper.append(control);
      elements["door-form-fields"].append(wrapper);
    });
  }

  // Открывает форму для новой или существующей двери.
  function openDoorDialog(door = null) {
    elements["door-form"].reset();
    elements["door-id"].value = door?.id || "";
    const title = door?.dk || door?.designation || "—";
    elements["dialog-title"].textContent = door
      ? `Редактирование ${title}`
      : "Новая дверь";
    fieldConfig.forEach((field) => {
      elements["door-form"].elements[field.key].value = door?.[field.key] || "";
    });
    elements["door-dialog"].showModal();
    elements["door-form"].elements.dk.focus();
  }

  // Собирает значения формы в обычный объект.
  function readDoorForm() {
    const data = Object.fromEntries(
      new FormData(elements["door-form"]).entries(),
    );
    data.id =
      elements["door-id"].value ||
      (crypto.randomUUID ? crypto.randomUUID() : `door-${Date.now()}`);
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string") data[key] = data[key].trim();
    });
    return data;
  }

  // Показывает подтверждение и возвращает результат как Promise.
  function confirm(title, message, confirmText = "Удалить") {
    elements["confirm-title"].textContent = title;
    elements["confirm-message"].textContent = message;
    elements["confirm-dialog"].querySelector('[value="confirm"]').textContent =
      confirmText;
    elements["confirm-dialog"].showModal();
    return new Promise((resolve) => {
      elements["confirm-dialog"].addEventListener(
        "close",
        () => {
          resolve(elements["confirm-dialog"].returnValue === "confirm");
        },
        { once: true },
      );
    });
  }

  // Переключает видимый экран без перезагрузки страницы.
  function showScreen(name) {
    document
      .querySelectorAll(".screen")
      .forEach((screen) =>
        screen.classList.toggle("is-active", screen.id === `screen-${name}`),
      );
    document
      .querySelectorAll(".nav-button")
      .forEach((button) =>
        button.classList.toggle("is-active", button.dataset.screen === name),
      );
  }

  return {
    elements,
    cache,
    buildForm,
    renderDoors,
    openDoorDialog,
    readDoorForm,
    confirm,
    showScreen,
  };
})();
