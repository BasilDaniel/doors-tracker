const Storage = (() => {
  const KEY = 'doors-catalog-v1';

  // Возвращает сохранённый массив или исходные данные при первом запуске.
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        save(DEFAULT_DOORS);
        return structuredClone(DEFAULT_DOORS);
      }
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Не удалось прочитать локальные данные:', error);
      return structuredClone(DEFAULT_DOORS);
    }
  }

  // Сохраняет весь каталог одним JSON-массивом.
  function save(doors) {
    localStorage.setItem(KEY, JSON.stringify(doors));
  }

  // Возвращает исходный набор и сразу сохраняет его.
  function reset() {
    const data = structuredClone(DEFAULT_DOORS);
    save(data);
    return data;
  }

  return { load, save, reset };
})();
