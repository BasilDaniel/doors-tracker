const Csv = (() => {
  const columns = [
    ['DK', 'dk'],
    ['Обозначение двери', 'designation'],
    ['Зона', 'zone'],
    ['Этаж', 'floor'],
    ['СКУД', 'access'],
    ['Замок / привод', 'lock'],
    ['Защёлка', 'latch'],
    ['Режим работы', 'mode'],
    ['Паника / эвакуация', 'panic']
  ];

  // Выбирает наиболее вероятный разделитель по первой строке.
  function detectDelimiter(text) {
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    return (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  }

  // Разбирает CSV с учётом кавычек и переносов внутри значений.
  function parseRows(text, delimiter) {
    const rows = [];
    let row = [], value = '', quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quoted && next === '"') {
        value += '"'; i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(value); value = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(value); value = '';
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
      } else {
        value += char;
      }
    }

    row.push(value);
    if (row.some(cell => cell !== '')) rows.push(row);
    return rows;
  }

  // Преобразует CSV в объекты приложения по названиям колонок.
  function parse(text) {
    const cleanText = text.replace(/^\uFEFF/, '');
    const rows = parseRows(cleanText, detectDelimiter(cleanText));
    if (rows.length < 2) throw new Error('В CSV нет строк данных.');

    const header = rows[0].map(value => value.trim());
    const indexByKey = Object.fromEntries(columns.map(([title, key]) => [key, header.indexOf(title)]));
    if (indexByKey.dk === -1) throw new Error('Не найдена обязательная колонка «DK».');

    return rows.slice(1).map((row, index) => {
      const door = { id: crypto.randomUUID ? crypto.randomUUID() : `door-${Date.now()}-${index}` };
      columns.forEach(([, key]) => {
        const columnIndex = indexByKey[key];
        door[key] = columnIndex >= 0 ? (row[columnIndex] || '').trim() : '';
      });
      return door;
    }).filter(door => door.dk);
  }

  // Экранирует значение для безопасной записи в CSV.
  function escapeValue(value, delimiter) {
    const text = String(value ?? '');
    return /["\r\n;,]/.test(text) || text.includes(delimiter)
      ? `"${text.replaceAll('"', '""')}"`
      : text;
  }

  // Формирует CSV в том же порядке колонок, что и исходный файл.
  function stringify(doors, delimiter = ';') {
    const header = columns.map(([title]) => escapeValue(title, delimiter)).join(delimiter);
    const lines = doors.map(door => columns
      .map(([, key]) => escapeValue(door[key], delimiter))
      .join(delimiter));
    return `\uFEFF${[header, ...lines].join('\r\n')}`;
  }

  // Создаёт временную ссылку и запускает скачивание файла.
  function download(doors) {
    const blob = new Blob([stringify(doors)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `doors-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return { parse, stringify, download };
})();
