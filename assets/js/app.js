/* =========================================================
   app.js — titik masuk: routing, tema, status mesin, PWA
   ========================================================= */

import { $, $$, toast } from "./util.js";
import { getPrefs, onPrefs } from "./prefs.js";
import { customReady, getCustomConfig } from "./api.js";
import { initChat } from "./chat.js";
import { initImage } from "./image.js";
import { initTTS } from "./tts.js";
import { initSettings, applyTheme, toggleTheme, refreshSettings } from "./settings.js";
import { APP_INFO } from "./config.js";

const VIEWS = ["chat", "gambar", "suara", "pengaturan"];
const TITLES = {
  chat: "Chat AI",
  gambar: "Gambar AI",
  suara: "Teks ke Suara",
  pengaturan: "Pengaturan",
};

function currentView() {
  const hash = location.hash.replace(/^#\/?/, "").split("?")[0];
  return VIEWS.includes(hash) ? hash : "chat";
}

function route() {
  const view = currentView();
  VIEWS.forEach((name) => {
    const section = document.getElementById(`view-${name}`);
    if (section) section.hidden = name !== view;
  });

  $$("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === view;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  document.title = `${TITLES[view]} · ${APP_INFO.name}`;
  closeDrawer();

  if (view === "pengaturan") refreshSettings();

}

/* ---------------- drawer (mobile) ---------------- */
function openDrawer() {
  $("#sidebar")?.classList.add("is-open");
  const scrim = $("#drawerScrim");
  if (scrim) scrim.hidden = false;
  $("#menuBtn")?.setAttribute("aria-expanded", "true");
}

function closeDrawer() {
  $("#sidebar")?.classList.remove("is-open");
  const scrim = $("#drawerScrim");
  if (scrim) scrim.hidden = true;
  $("#menuBtn")?.setAttribute("aria-expanded", "false");
}

/* ---------------- status mesin ---------------- */
function updateEngineStatus() {
  const prefs = getPrefs();
  const dot = $("#engineDot");
  const title = $("#engineStatusTitle");
  const sub = $("#engineStatusSub");
  if (!title || !sub) return;

  if (prefs.chatEngine === "custom" && customReady()) {
    title.textContent = "API sendiri";
    sub.textContent = getCustomConfig().model || "OpenAI-compatible";
    dot?.classList.add("dot-on");
    dot?.classList.remove("dot-off");
    return;
  }

  if (prefs.puterConnected) {
    title.textContent = "Puter AI";
    sub.textContent = prefs.puterModel;
    dot?.classList.add("dot-on");
    dot?.classList.remove("dot-off");
    return;
  }

  title.textContent = "Pollinations";
  sub.textContent = "Gratis · tanpa login";
  dot?.classList.add("dot-off");
  dot?.classList.remove("dot-on");
}

/* ---------------- boot ---------------- */
function boot() {
  applyTheme(getPrefs().theme);

  initChat();
  initTTS();
  initSettings();
  initImage().catch(() => toast("Galeri lokal tidak bisa dimuat di mode ini.", { type: "warn" }));

  route();
  updateEngineStatus();
  onPrefs(updateEngineStatus);

  $("#menuBtn")?.addEventListener("click", openDrawer);
  $("#sidebarClose")?.addEventListener("click", closeDrawer);
  $("#drawerScrim")?.addEventListener("click", closeDrawer);
  $("#themeToggle")?.addEventListener("click", toggleTheme);
  $("#themeToggleMobile")?.addEventListener("click", toggleTheme);
  $("#engineStatus")?.addEventListener("click", () => { location.hash = "#pengaturan"; });

  window.addEventListener("hashchange", route);
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeDrawer();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });

  $$(".nav-item, .tab").forEach((link) => link.addEventListener("click", () => closeDrawer()));

  window.addEventListener("offline", () => toast("Kamu sedang offline. AI butuh internet, tetapi galeri tetap ada.", { type: "warn" }));
  window.addEventListener("online", () => toast("Kembali online.", { type: "ok", timeout: 2400 }));

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => { /* offline shell tidak wajib */ });
    });
  }

  document.documentElement.classList.add("is-ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
