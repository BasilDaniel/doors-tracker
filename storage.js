const Storage = (() => {
  const KEY = "doors-catalog-v1";

  // Добавляет новые поля старым записям без потери локальных данных.
  function normalize(doors) {
    return doors.map((door) => ({ status: "", notes: "", ...door }));
  }

  // Возвращает сохранённый массив или исходные данные при первом запуске.
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const initial = normalize(structuredClone(DEFAULT_DOORS));
        save(initial);
        return initial;
      }
      const data = JSON.parse(raw);
      const normalized = Array.isArray(data) ? normalize(data) : [];
      save(normalized);
      return normalized;
    } catch (error) {
      console.error("Не удалось прочитать локальные данные:", error);
      return normalize(structuredClone(DEFAULT_DOORS));
    }
  }

  // Сохраняет весь каталог одним JSON-массивом.
  function save(doors) {
    localStorage.setItem(KEY, JSON.stringify(normalize(doors)));
  }

  // Возвращает исходный набор и сразу сохраняет его.
  function reset() {
    const data = normalize(structuredClone(DEFAULT_DOORS));
    save(data);
    return data;
  }

  return { load, save, reset };
})();
