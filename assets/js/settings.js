/* =========================================================
   settings.js — halaman Pengaturan, tema, akun Puter, data
   ========================================================= */

import { $, $$, toast, store, slugify, downloadBlob } from "./util.js";
import { getPrefs, setPrefs, onPrefs } from "./prefs.js";
import {
  connectPuter, disconnectPuter, getPuterUser, testCustom, customReady,
} from "./api.js";
import { imageStats, clearImages, formatBytes } from "./db.js";
import { APP_INFO } from "./config.js";

let els = {};

export function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "light" ? "#f1ebdd" : "#08080e");
  $$("[data-set-theme]").forEach((card) => {
    const active = card.dataset.setTheme === next;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  const next = current === "light" ? "dark" : "light";
  setPrefs({ theme: next });
  applyTheme(next);
  toast(next === "light" ? "Tema Kertas Manga aktif." : "Tema Malam Ink aktif.", { type: "info", timeout: 2200 });
}

export function initSettings() {
  els = {
    themeCards: $("#themeCards"),
    chatEngine: $("#setChatEngine"),
    imageEngine: $("#setImageEngine"),
    puterUser: $("#puterUser"),
    puterUserSub: $("#puterUserSub"),
    puterAvatar: $("#puterAvatar"),
    puterConnect: $("#puterConnect"),
    puterSignOut: $("#puterSignOut"),
    customBase: $("#setCustomBase"),
    customKey: $("#setCustomKey"),
    customModel: $("#setCustomModel"),
    saveCustom: $("#saveCustom"),
    testCustom: $("#testCustom"),
    clearCustom: $("#clearCustom"),
    customStatus: $("#customStatus"),
    stats: $("#storageStats"),
    exportData: $("#exportData"),
    clearAll: $("#clearAllData"),
  };

  applyTheme(getPrefs().theme);
  syncControls();
  bind();
  onPrefs(() => {
    applyTheme(getPrefs().theme);
    syncControls();
  });
}

function syncControls() {
  const prefs = getPrefs();
  if (els.chatEngine) els.chatEngine.value = prefs.chatEngine;
  if (els.imageEngine) els.imageEngine.value = prefs.imageEngine;

  if (els.customBase) els.customBase.value = prefs.custom?.baseUrl || "";
  if (els.customKey) els.customKey.value = prefs.custom?.apiKey || "";
  if (els.customModel) els.customModel.value = prefs.custom?.model || "";
}

export async function refreshSettings() {
  await Promise.all([refreshAccount(), refreshStats()]);
}

async function refreshAccount() {
  const connected = getPrefs().puterConnected;
  if (!els.puterUser) return;

  if (!connected) {
    els.puterUser.textContent = "Belum terhubung";
    els.puterUserSub.textContent = "Login gratis lewat popup Puter — tanpa API key.";
    if (els.puterConnect) els.puterConnect.hidden = false;
    if (els.puterSignOut) els.puterSignOut.hidden = true;
    return;
  }

  els.puterUser.textContent = "Terhubung ke Puter";
  els.puterUserSub.textContent = "Memuat detail akun…";
  if (els.puterConnect) els.puterConnect.hidden = true;
  if (els.puterSignOut) els.puterSignOut.hidden = false;

  const user = await getPuterUser();
  const name = user?.username || "pengguna puter";
  els.puterUser.textContent = `@${name}`;
  els.puterUserSub.textContent = "Akun gratis aktif · biaya AI ditanggung akun ini";
  if (els.puterAvatar) {
    const initial = String(name).trim().charAt(0).toUpperCase() || "P";
    els.puterAvatar.innerHTML = `<b>${initial}</b>`;
  }
}

async function refreshStats() {
  if (!els.stats) return;
  const chats = store.get("chats", { convs: [] }) || { convs: [] };
  const conversations = Array.isArray(chats.convs) ? chats.convs : [];
  const messages = conversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0);
  let images = { count: 0, bytes: 0 };
  try {
    images = await imageStats();
  } catch {
    /* ignore */
  }

  els.stats.innerHTML = `
    <div class="stat-pill"><b>${conversations.length}</b><small>Percakapan</small></div>
    <div class="stat-pill"><b>${messages}</b><small>Pesan</small></div>
    <div class="stat-pill"><b>${images.count}</b><small>Gambar</small></div>
    <div class="stat-pill"><b>${formatBytes(images.bytes)}</b><small>Galeri</small></div>`;
}

function bind() {
  els.themeCards?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-set-theme]");
    if (!card) return;
    const theme = card.dataset.setTheme;
    setPrefs({ theme });
    applyTheme(theme);
  });

  els.chatEngine?.addEventListener("change", () => {
    setPrefs({ chatEngine: els.chatEngine.value });
    toast("Mesin chat default diperbarui.", { type: "ok", timeout: 2200 });
  });

  els.imageEngine?.addEventListener("change", () => {
    setPrefs({ imageEngine: els.imageEngine.value });
    toast("Mesin gambar default diperbarui.", { type: "ok", timeout: 2200 });
  });

  els.puterConnect?.addEventListener("click", async () => {
    const button = els.puterConnect;
    button.disabled = true;
    button.textContent = "Membuka…";
    try {
      const user = await connectPuter();
      setPrefs({ puterConnected: true });
      toast(`Berhasil masuk sebagai ${user.username}.`, { type: "ok" });
      await refreshAccount();
    } catch (error) {
      toast(error?.message || "Gagal masuk ke Puter.", { type: "error" });
    } finally {
      button.disabled = false;
      button.textContent = "Hubungkan";
    }
  });

  els.puterSignOut?.addEventListener("click", async () => {
    await disconnectPuter();
    setPrefs({ puterConnected: false });
    toast("Keluar dari akun Puter.", { type: "info" });
    await refreshAccount();
  });

  els.saveCustom?.addEventListener("click", () => {
    const custom = {
      baseUrl: (els.customBase?.value || "").trim(),
      apiKey: (els.customKey?.value || "").trim(),
      model: (els.customModel?.value || "").trim(),
    };
    setPrefs({ custom });
    if (custom.baseUrl && !/^https?:\/\//i.test(custom.baseUrl)) {
      toast("Base URL harus dimulai dengan http:// atau https://", { type: "warn" });
      return;
    }
    toast(customReady(custom) ? "API sendiri tersimpan." : "Tersimpan, tetapi Base URL dan model masih kosong.", {
      type: customReady(custom) ? "ok" : "warn",
    });
    if (els.customStatus) els.customStatus.textContent = "";
  });

  els.testCustom?.addEventListener("click", async () => {
    const custom = {
      baseUrl: (els.customBase?.value || "").trim(),
      apiKey: (els.customKey?.value || "").trim(),
      model: (els.customModel?.value || "").trim(),
    };
    if (!custom.baseUrl || !custom.model) {
      toast("Isi Base URL dan model dulu.", { type: "warn" });
      return;
    }
    els.testCustom.disabled = true;
    const previous = els.testCustom.textContent;
    els.testCustom.textContent = "Menguji…";
    if (els.customStatus) els.customStatus.textContent = "Menghubungi endpoint…";
    try {
      const reply = await testCustom(custom);
      if (els.customStatus) els.customStatus.textContent = `Berhasil ✓ Balasan: ${reply.slice(0, 120)}`;
      toast("Koneksi API berhasil.", { type: "ok" });
    } catch (error) {
      const message = error?.name === "AbortError" ? "Waktu habis (timeout)." : error?.message || "Gagal terhubung.";
      if (els.customStatus) els.customStatus.textContent = `Gagal: ${message}`;
      toast(message, { type: "error" });
    } finally {
      els.testCustom.disabled = false;
      els.testCustom.textContent = previous || "Tes koneksi";
    }
  });

  els.clearCustom?.addEventListener("click", () => {
    setPrefs({ custom: { baseUrl: "", apiKey: "", model: "" } });
    syncControls();
    if (els.customStatus) els.customStatus.textContent = "";
    toast("Pengaturan API sendiri dihapus.", { type: "info" });
  });

  els.exportData?.addEventListener("click", async () => {
    const prefs = JSON.parse(JSON.stringify(getPrefs()));
    if (prefs.custom) prefs.custom.apiKey = prefs.custom.apiKey ? "(disembunyikan)" : "";
    const chats = store.get("chats", { convs: [] });
    let images = [];
    try {
      const records = await imageStats();
      images = [{ count: records.count, bytes: records.bytes, note: "file gambar tidak disertakan" }];
    } catch {
      /* ignore */
    }
    const payload = {
      app: APP_INFO.name,
      version: APP_INFO.version,
      exportedAt: new Date().toISOString(),
      prefs,
      chats,
      images,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${slugify("modmanga-data")}-${new Date().toISOString().slice(0, 10)}.json`);
    toast("Data diekspor ke file JSON.", { type: "ok" });
  });

  els.clearAll?.addEventListener("click", async () => {
    if (!confirm("Hapus SEMUA data (percakapan, gambar, pengaturan) di browser ini?")) return;
    store.clearAll();
    try {
      await clearImages();
    } catch {
      /* ignore */
    }
    toast("Semua data dihapus. Memuat ulang…", { type: "info" });
    setTimeout(() => location.reload(), 900);
  });
}
