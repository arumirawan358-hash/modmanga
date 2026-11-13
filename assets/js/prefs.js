/* =========================================================
   prefs.js — preferensi aplikasi (localStorage) + notifikasi
   ========================================================= */

import { DEFAULT_PREFS } from "./config.js";
import { store } from "./util.js";

const KEY = "prefs";
let cache = null;
const listeners = new Set();

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function merge(base, patch) {
  if (!isPlainObject(patch)) return patch === undefined ? base : patch;
  const out = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(patch)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? merge(out[key], value) : value;
  }
  return out;
}

function clone(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

export function getPrefs() {
  if (!cache) {
    cache = merge(clone(DEFAULT_PREFS), store.get(KEY, {}) || {});
  }
  return cache;
}

export function setPrefs(patch) {
  cache = merge(getPrefs(), patch);
  const ok = store.set(KEY, cache);
  for (const fn of listeners) {
    try { fn(cache, ok); } catch { /* jangan sampai memutus alur */ }
  }
  return cache;
}

export function resetPrefs() {
  cache = clone(DEFAULT_PREFS);
  store.set(KEY, cache);
  for (const fn of listeners) {
    try { fn(cache, true); } catch { /* ignore */ }
  }
  return cache;
}

export function onPrefs(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getTtsPrefs() {
  return getPrefs().tts;
}

export function setTtsPrefs(patch) {
  return setPrefs({ tts: patch });
}
