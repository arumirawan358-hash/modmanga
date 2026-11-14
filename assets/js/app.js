/* =========================================================
   app.js — titik masuk: routing, tema, status mesin, PWA
   ========================================================= */

import { $, $$, toast } from "./util.js";
import { getPrefs, setPrefs, onPrefs } from "./prefs.js";
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
    title.textContent = "Hanzal AI";
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

/* ---------------- splash & nama pengguna ---------------- */
function startSplash() {
  const splash = $("#splash");
  const bar = $("#splashBar");
  const status = $("#splashStatus");
  if (!splash) return { finish: (cb) => cb?.() };

  const steps = ["Menyalakan mesin…", "Menyiapkan chat…", "Memuat galeri…", "Menyetel suara…", "Hampir siap…"];
  let progress = 8;
  let step = 0;
  const timer = setInterval(() => {
    progress = Math.min(progress + 7 + Math.random() * 12, 92);
    if (bar) bar.style.width = `${progress}%`;
    step = Math.min(step + 1, steps.length - 1);
    if (status) status.textContent = steps[step];
  }, 200);

  let done = false;
  return {
    finish(callback) {
      if (done) return;
      done = true;
      clearInterval(timer);
      if (bar) bar.style.width = "100%";
      if (status) status.textContent = "Siap!";
      setTimeout(() => {
        splash.classList.add("is-out");
        setTimeout(() => {
          splash.remove();
          callback?.();
        }, 560);
      }, 240);
    },
  };
}

function profileName() {
  return (getPrefs().profile?.name || "").trim();
}

function applyGreeting() {
  const name = profileName();
  const sub = $(".brand-sub");
  if (sub) {
    sub.textContent = name ? `Hai, ${name} · studio gratis tanpa API key` : "Studio gratis · tanpa API key";
  }
  const card = $("#profileCard h2");
  if (card && name) card.textContent = `Profil · ${name}`;
}

/** Tanya nama sekali saja. Tanpa login, tanpa akun. */
function askName() {
  applyGreeting();
  if (profileName()) return;

  const modal = $("#onboard");
  const form = $("#onboardForm");
  const input = $("#onboardName");
  if (!modal || !form || !input) return;

  modal.hidden = false;
  setTimeout(() => input.focus(), 160);

  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const name = (input.value || "").trim().slice(0, 24);
      if (!name) {
        input.focus();
        return;
      }
      setPrefs({ profile: { name } });
      modal.hidden = true;
      applyGreeting();
      toast(`Halo ${name}! Semua fitur sudah terbuka — tanpa login.`, { type: "ok", timeout: 4200 });
    },
    { once: true },
  );
}

/* ---------------- boot ---------------- */
function boot() {
  const bootAt = Date.now();
  const splash = startSplash();

  applyTheme(getPrefs().theme);

  try {
    initChat();
    initTTS();
    initSettings();
    initImage().catch(() => toast("Galeri lokal tidak bisa dimuat di mode ini.", { type: "warn" }));
  } catch (error) {
    console.error(error);
  }

  route();
  updateEngineStatus();
  onPrefs(() => {
    updateEngineStatus();
    applyGreeting();
  });

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

  // splash tampil minimal ~1,1 detik supaya animasinya nikmat, lalu tanya nama
  const remaining = Math.max(0, 1100 - (Date.now() - bootAt));
  setTimeout(() => splash.finish(() => askName()), remaining);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
