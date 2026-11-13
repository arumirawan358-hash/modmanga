/* =========================================================
   db.js — penyimpanan blob lokal (IndexedDB) untuk galeri gambar
   Ada fallback memori bila IndexedDB tidak tersedia.
   ========================================================= */

const DB_NAME = "modmanga-ai";
const DB_VERSION = 1;
const STORE = "images";

let openPromise = null;
const memory = new Map();
let useMemory = false;

function openDb() {
  if (useMemory) return Promise.reject(new Error("IndexedDB tidak tersedia"));
  if (openPromise) return openPromise;

  openPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB tidak didukung"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Gagal membuka IndexedDB"));
    request.onblocked = () => reject(new Error("IndexedDB diblokir"));
  }).catch((error) => {
    useMemory = true;
    openPromise = null;
    throw error;
  });

  return openPromise;
}

export async function saveImage(record) {
  if (useMemory) {
    memory.set(record.id, record);
    return record;
  }
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    return record;
  } catch (error) {
    useMemory = true;
    memory.set(record.id, record);
    return record;
  }
}

export async function listImages() {
  const collect = () => Array.from(memory.values()).sort((a, b) => b.createdAt - a.createdAt);
  if (useMemory) return collect();
  try {
    const db = await openDb();
    const records = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    return records.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    useMemory = true;
    return collect();
  }
}

export async function deleteImage(id) {
  memory.delete(id);
  if (useMemory) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    /* ignore */
  }
}

export async function clearImages() {
  memory.clear();
  if (useMemory) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    /* ignore */
  }
}

export async function imageStats() {
  const records = await listImages();
  const bytes = records.reduce((sum, item) => sum + (item?.blob?.size || 0), 0);
  return { count: records.length, bytes };
}

export function formatBytes(bytes = 0) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
