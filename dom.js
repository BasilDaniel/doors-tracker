const Dom = (() => {
  const fieldConfig = [
    { key: 'dk', label: 'DK', required: true },
    { key: 'designation', label: 'Обозначение двери' },
    { key: 'zone', label: 'Зона', type: 'select', options: ['', 'Офисное здание', 'Цех'] },
    { key: 'floor', label: 'Этаж', type: 'select', options: ['', '1 эт', '2 эт', 'Тех. эт'] },
    { key: 'access', label: 'СКУД', type: 'select', options: ['', 'M — Master', 'M-S — Master Slave'] },
    { key: 'lock', label: 'Замок / привод' },
    { key: 'latch', label: 'Защёлка' },
    { key: 'mode', label: 'Режим работы', type: 'select', options: ['', 'RS — fail safe', 'AS — fail secure'] },
    { key: 'panic', label: 'Паника / эвакуация', wide: true }
  ];

  const elements = {};

  // Сохраняет ссылки на элементы, чтобы не искать их повторно.
  function cache() {
    ['doors-list', 'doors-count', 'search-input', 'add-door-button', 'door-dialog', 'door-form',
      'door-id', 'dialog-title', 'door-form-fields', 'close-dialog-button', 'cancel-door-button',
      'confirm-dialog', 'confirm-title', 'confirm-message', 'csv-file-input', 'import-button',
      'import-status', 'export-button', 'reset-button', 'install-button']
      .forEach(id => { elements[id] = document.getElementById(id); });
  }

  // Создаёт краткий тег только для заполненных значений.
  function makeTag(text) {
    if (!text) return null;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = text;
    return tag;
  }

  // Перерисовывает карточки после поиска или изменения данных.
  function renderDoors(doors, handlers) {
    elements['doors-list'].replaceChildren();
    elements['doors-count'].textContent = doors.length;

    if (!doors.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Двери не найдены.';
      elements['doors-list'].append(empty);
      return;
    }

    doors.forEach(door => {
      const card = document.createElement('article');
      card.className = 'door-card';

      const main = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = door.dk || 'Без DK';
      const designation = document.createElement('p');
      designation.textContent = door.designation || 'Обозначение не указано';
      main.append(title, designation);

      const location = document.createElement('div');
      location.append(...[makeTag(door.zone), makeTag(door.floor)].filter(Boolean));

      const details = document.createElement('div');
      details.className = 'door-details';
      details.append(...[door.access, door.lock, door.latch, door.mode, door.panic]
        .map(makeTag).filter(Boolean));

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const edit = document.createElement('button');
      edit.className = 'icon-button'; edit.type = 'button'; edit.textContent = '✎';
      edit.title = 'Редактировать'; edit.addEventListener('click', () => handlers.onEdit(door));
      const remove = document.createElement('button');
      remove.className = 'icon-button'; remove.type = 'button'; remove.textContent = '×';
      remove.title = 'Удалить'; remove.addEventListener('click', () => handlers.onDelete(door));
      actions.append(edit, remove);

      card.append(main, location, details, actions);
      elements['doors-list'].append(card);
    });
  }

  // Строит форму из компактного описания полей.
  function buildForm() {
    fieldConfig.forEach(field => {
      const wrapper = document.createElement('label');
      if (field.wide) wrapper.className = 'form-field-wide';
      wrapper.textContent = field.label;

      let control;
      if (field.type === 'select') {
        control = document.createElement('select');
        field.options.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value || 'Без значения';
          control.append(option);
        });
      } else {
        control = document.createElement('input');
        control.type = 'text';
      }
      control.name = field.key;
      control.required = Boolean(field.required);
      wrapper.append(control);
      elements['door-form-fields'].append(wrapper);
    });
  }

  // Открывает форму для новой или существующей двери.
  function openDoorDialog(door = null) {
    elements['door-form'].reset();
    elements['door-id'].value = door?.id || '';
    elements['dialog-title'].textContent = door ? `Редактирование ${door.dk}` : 'Новая дверь';
    fieldConfig.forEach(field => {
      elements['door-form'].elements[field.key].value = door?.[field.key] || '';
    });
    elements['door-dialog'].showModal();
    elements['door-form'].elements.dk.focus();
  }

  // Собирает значения формы в обычный объект.
  function readDoorForm() {
    const data = Object.fromEntries(new FormData(elements['door-form']).entries());
    data.id = elements['door-id'].value || (crypto.randomUUID ? crypto.randomUUID() : `door-${Date.now()}`);
    Object.keys(data).forEach(key => { if (typeof data[key] === 'string') data[key] = data[key].trim(); });
    return data;
  }

  // Показывает подтверждение и возвращает результат как Promise.
  function confirm(title, message, confirmText = 'Удалить') {
    elements['confirm-title'].textContent = title;
    elements['confirm-message'].textContent = message;
    elements['confirm-dialog'].querySelector('[value="confirm"]').textContent = confirmText;
    elements['confirm-dialog'].showModal();
    return new Promise(resolve => {
      elements['confirm-dialog'].addEventListener('close', () => {
        resolve(elements['confirm-dialog'].returnValue === 'confirm');
      }, { once: true });
    });
  }

  // Переключает видимый экран без перезагрузки страницы.
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('is-active', screen.id === `screen-${name}`));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('is-active', button.dataset.screen === name));
  }

  return { elements, cache, buildForm, renderDoors, openDoorDialog, readDoorForm, confirm, showScreen };
})();
