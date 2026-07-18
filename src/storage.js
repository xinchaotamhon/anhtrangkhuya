(function attachStorage(global) {
  "use strict";

  const DB_NAME = "anh-trang-khuya";
  const DB_VERSION = 1;
  let databasePromise;

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Không thể đọc cơ sở dữ liệu trình duyệt."));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Giao dịch dữ liệu thất bại."));
      transaction.onabort = () => reject(transaction.error || new Error("Giao dịch dữ liệu đã bị hủy."));
    });
  }

  function openDatabase() {
    if (!global.indexedDB) return Promise.reject(new Error("Trình duyệt này không hỗ trợ IndexedDB."));
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("questions")) db.createObjectStore("questions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("library")) db.createObjectStore("library", { keyPath: "id" });
        if (!db.objectStoreNames.contains("entries")) db.createObjectStore("entries", { keyPath: "date" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error || new Error("Không thể mở cơ sở dữ liệu trình duyệt."));
      request.onblocked = () => reject(new Error("Một thẻ khác đang giữ phiên bản dữ liệu cũ. Hãy đóng thẻ đó rồi thử lại."));
    });
    return databasePromise;
  }

  async function getAll(storeName) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, "readonly");
    return requestResult(transaction.objectStore(storeName).getAll());
  }

  async function getMeta(key, fallback) {
    const db = await openDatabase();
    const transaction = db.transaction("meta", "readonly");
    const record = await requestResult(transaction.objectStore("meta").get(key));
    return record ? record.value : fallback;
  }

  async function put(storeName, value) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    await transactionDone(transaction);
    return value;
  }

  async function remove(storeName, key) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    await transactionDone(transaction);
  }

  async function saveMeta(key, value) {
    return put("meta", { key, value });
  }

  async function seedDefaults(questions, libraryItems) {
    const [questionCount, libraryCount] = await Promise.all([
      (async () => {
        const db = await openDatabase();
        return requestResult(db.transaction("questions", "readonly").objectStore("questions").count());
      })(),
      (async () => {
        const db = await openDatabase();
        return requestResult(db.transaction("library", "readonly").objectStore("library").count());
      })()
    ]);

    const db = await openDatabase();
    const transaction = db.transaction(["questions", "library", "meta"], "readwrite");
    if (questionCount === 0) {
      for (const question of questions) transaction.objectStore("questions").put(question);
    }
    if (libraryCount === 0) {
      for (const item of libraryItems) transaction.objectStore("library").put(item);
    }
    transaction.objectStore("meta").put({ key: "seededVersion", value: 1 });
    await transactionDone(transaction);
  }

  async function loadAll() {
    const [questions, libraryItems, entries, settings, draft] = await Promise.all([
      getAll("questions"),
      getAll("library"),
      getAll("entries"),
      getMeta("settings", {}),
      getMeta("draft", null)
    ]);
    return { questions, libraryItems, entries, settings, draft };
  }

  async function replaceAllData(data) {
    const db = await openDatabase();
    const transaction = db.transaction(["questions", "library", "entries", "meta"], "readwrite");
    const questionStore = transaction.objectStore("questions");
    const libraryStore = transaction.objectStore("library");
    const entryStore = transaction.objectStore("entries");
    questionStore.clear();
    libraryStore.clear();
    entryStore.clear();
    for (const item of data.questions) questionStore.put(item);
    for (const item of data.libraryItems) libraryStore.put(item);
    for (const item of data.entries) entryStore.put(item);
    transaction.objectStore("meta").put({ key: "settings", value: data.settings || {} });
    transaction.objectStore("meta").delete("draft");
    await transactionDone(transaction);
  }

  const api = {
    DB_NAME,
    DB_VERSION,
    openDatabase,
    getAll,
    getMeta,
    put,
    remove,
    saveMeta,
    seedDefaults,
    loadAll,
    replaceAllData
  };

  global.ATKStorage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
