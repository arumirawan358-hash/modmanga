/* =========================================================
   image.js — layar Gambar AI + galeri lokal (IndexedDB)
   ========================================================= */

import {
  $, $$, uid, toast, escapeHtml, slugify, copyText,
} from "./util.js";
import {
  IMAGE_STYLES, RATIOS, IMAGE_SURPRISES, PUTER_IMAGE_MODELS,
} from "./config.js";
import { getPrefs, setPrefs, onPrefs } from "./prefs.js";
import {
  buildPollinationsImageUrl, fetchPollinationsImage, puterImage, connectPuter, AiError,
} from "./api.js";
import { saveImage, listImages, deleteImage, clearImages } from "./db.js";

const MAX_GALLERY = 40;

let els = {};
let gallery = [];
let objectUrls = new Map();
let running = false;
let controller = null;
let timer = null;
let activeStyle = "anime";
let activeRatio = "1:1";
let currentItem = null;

/* ---------------- init ---------------- */
export async function initImage() {
  els = {
    form: $("#imageForm"),
    prompt: $("#imgPrompt"),
    count: $("#imgCount"),
    styleChips: $("#styleChips"),
    ratioChips: $("#ratioChips"),
    seed: $("#imgSeed"),
    lockSeed: $("#imgLockSeed"),
    randomSeed: $("#imgRandomSeed"),
    enhance: $("#imgEnhance"),
    safe: $("#imgSafe"),
    surprise: $("#imgSurprise"),
    engine: $("#imgEngine"),
    modelWrap: $("#imgModelWrap"),
    model: $("#imgModel"),
    genBtn: $("#genBtn"),
    hint: $("#imgHint"),
    status: $("#imgStatus"),
    gallery: $("#gallery"),
    galleryEmpty: $("#galleryEmpty"),
    galleryCount: $("#galleryCount"),
    clearGallery: $("#clearGallery"),
    lightbox: $("#lightbox"),
    lbImg: $("#lightboxImg"),
    lbPrompt: $("#lightboxPrompt"),
    lbCopy: $("#lightboxCopy"),
    lbReuse: $("#lightboxReuse"),
    lbDownload: $("#lightboxDownload"),
    lbClose: $("#lightboxClose"),
  };

  activeStyle = getPrefs().imageStyle || "anime";
  activeRatio = getPrefs().imageRatio || "1:1";

  renderStyles();
  renderRatios();
  renderPuterModels();
  bind();
  syncEngineUI();
  updateHint();
  updateCount();
  randomizeSeed();
  syncGenBtn();

  onPrefs(() => {
    syncEngineUI();
    updateHint();
  });

  await loadGallery();
}

/* ---------------- render kontrol ---------------- */
function renderStyles() {
  if (!els.styleChips) return;
  els.styleChips.innerHTML = IMAGE_STYLES.map(
    (style) => `<button type="button" class="chip${style.id === activeStyle ? " is-active" : ""}" data-style="${style.id}">${escapeHtml(style.label)}</button>`,
  ).join("");
}

function renderRatios() {
  if (!els.ratioChips) return;
  els.ratioChips.innerHTML = RATIOS.map(
    (ratio) => `<button type="button" class="chip${ratio.id === activeRatio ? " is-active" : ""}" data-ratio="${ratio.id}">${ratio.label}</button>`,
  ).join("");
}

function renderPuterModels() {
  if (!els.model) return;
  els.model.innerHTML = PUTER_IMAGE_MODELS.map(
    (model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label)}</option>`,
  ).join("");
}

function syncEngineUI() {
  const engine = getPrefs().imageEngine;
  if (els.engine) els.engine.value = engine;
  if (els.modelWrap) els.modelWrap.hidden = engine !== "puter";
}

function updateHint() {
  if (!els.hint) return;
  const engine = getPrefs().imageEngine;
  const pending = queue.length + (running ? 1 : 0);

  if (engine === "puter") {
    els.hint.textContent = !getPrefs().puterConnected
      ? "Puter belum terhubung. Hubungkan akun gratis di Pengaturan — atau pakai Pollinations tanpa login."
      : pending > 1
        ? `${pending} gambar diproses berurutan tanpa jeda buatan.`
        : "Puter · model gambar akunmu · kualitas & rasio lebih fleksibel.";
    return;
  }

  els.hint.textContent = pending > 1
    ? `${pending} gambar dalam antrean — diproses langsung, tanpa diminta menunggu.`
    : "Pollinations gratis tanpa login · setiap klik langsung diproses, tanpa diminta menunggu.";
}

function updateCount() {
  if (!els.count || !els.prompt) return;
  els.count.textContent = String(els.prompt.value.length);
}

/* ---------------- galeri ---------------- */
function urlFor(record) {
  if (objectUrls.has(record.id)) return objectUrls.get(record.id);
  if (record.blob) {
    const url = URL.createObjectURL(record.blob);
    objectUrls.set(record.id, url);
    return url;
  }
  return record.remoteUrl || "";
}

function releaseUrl(id) {
  const url = objectUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(id);
}

async function loadGallery() {
  try {
    gallery = await listImages();
  } catch {
    gallery = [];
  }
  renderGallery();
}

function renderGallery() {
  if (!els.gallery) return;
  els.galleryCount.textContent = String(gallery.length);
  els.galleryEmpty.hidden = gallery.length > 0;

  els.gallery.innerHTML = gallery
    .map((record) => {
      const url = urlFor(record);
      const alt = escapeHtml(record.prompt.slice(0, 90));
      return `<figure class="gallery-item" data-id="${record.id}" tabindex="0" role="button" aria-label="Buka gambar: ${alt}">
        ${url ? `<img src="${url}" alt="${alt}" loading="lazy" width="${record.width || 768}" height="${record.height || 768}">` : ""}
        <span class="gi-badge">${escapeHtml(record.engine === "puter" ? "Puter" : "Flux")} · ${escapeHtml(record.ratio || "1:1")}</span>
        <div class="gi-tools">
          <button type="button" data-act="download" data-id="${record.id}" title="Unduh" aria-label="Unduh gambar">
            <svg class="ico" aria-hidden="true"><use href="#i-download"></use></svg>
          </button>
          <button type="button" data-act="delete" data-id="${record.id}" title="Hapus" aria-label="Hapus gambar">
            <svg class="ico" aria-hidden="true"><use href="#i-trash"></use></svg>
          </button>
        </div>
        <figcaption class="gi-overlay"><p>${alt}</p></figcaption>
      </figure>`;
    })
    .join("");
}

async function pruneGallery() {
  while (gallery.length > MAX_GALLERY) {
    const oldest = gallery[gallery.length - 1];
    gallery.pop();
    releaseUrl(oldest.id);
    await deleteImage(oldest.id);
  }
}

async function persist(record) {
  gallery.unshift(record);
  await saveImage(record).catch(() => { /* db.js punya fallback memori */ });
  await pruneGallery();
  renderGallery();
}

/* ---------------- status ---------------- */
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function showGenerating(prompt, engine, queued = 0) {
  if (!els.status) return;
  const started = Date.now();
  els.status.hidden = false;
  els.status.innerHTML = `
    <div class="gen-preview">
      <div class="skeleton"></div>
      <div class="gen-overlay">
        <span class="gen-spark"><svg class="ico" aria-hidden="true"><use href="#i-sparkles"></use></svg></span>
        <b id="genStatusText">${engine === "puter" ? "Meminta gambar ke Puter…" : "Menggambar dengan Flux…"}${queued > 0 ? ` <span class="gen-queue">· ${queued} antre</span>` : ""}</b>
        <small id="genStatusTime">0 detik</small>
        <button type="button" class="ghost-btn" data-cancel="1">Batalkan</button>
      </div>
    </div>
    <p class="gen-prompt">${escapeHtml(prompt)}</p>`;

  const timeEl = $("#genStatusTime", els.status);
  const textEl = $("#genStatusText", els.status);
  stopTimer();
  requestAnimationFrame(() => {
    els.status?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  timer = setInterval(() => {
    const seconds = (Date.now() - started) / 1000;
    if (timeEl) timeEl.textContent = `${Math.round(seconds)} detik`;
    if (textEl && !textEl.dataset.custom && seconds > 22) textEl.textContent = "Masih mengerjakan detail…";
    if (textEl && !textEl.dataset.custom && seconds > 50) textEl.textContent = "Model masih menyelesaikan gambar…";
  }, 500);
}

function showError(message, { connect = false } = {}) {
  stopTimer();
  if (!els.status) return;
  els.status.hidden = false;
  els.status.innerHTML = `
    <div class="gen-error">
      <svg class="ico" aria-hidden="true"><use href="#i-alert"></use></svg>
      <div class="gen-error-copy">
        <b>Gambar gagal dibuat</b>
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="gen-error-actions">
        ${connect ? '<button type="button" class="primary-btn sm" data-connect="1">Hubungkan Puter</button>' : ""}
        <button type="button" class="ghost-btn" data-retry="1">Coba lagi</button>
        <button type="button" class="ghost-btn" data-dismiss="1">Tutup</button>
      </div>
    </div>`;
}

function hideStatus() {
  stopTimer();
  if (els.status) {
    els.status.hidden = true;
    els.status.innerHTML = "";
  }
}

/* ---------------- generate ---------------- */
function currentPrompt() {
  return (els.prompt?.value || "").trim();
}

function fullPrompt(prompt) {
  const style = IMAGE_STYLES.find((item) => item.id === activeStyle);
  return [prompt, style?.suffix].filter(Boolean).join(", ");
}

function randomizeSeed() {
  if (els.seed && !els.lockSeed?.checked) {
    els.seed.value = String(Math.floor(Math.random() * 999_999_999) + 1);
  }
}

/* ---------------- generate (antrean, tanpa jeda buatan) ---------------- */
const queue = [];

function setGenStatus(text) {
  const textEl = els.status ? $("#genStatusText", els.status) : null;
  if (!textEl) return;
  textEl.textContent = text;
  textEl.dataset.custom = "1";
}

function syncGenBtn() {
  const btn = els.genBtn;
  if (!btn) return;
  const span = btn.querySelector("span");
  const pending = queue.length;
  btn.disabled = false; // selalu bisa diklik: klik berikutnya masuk antrean
  if (!running) span.textContent = "Buat gambar";
  else if (pending > 0) span.textContent = `Tambah antrean · ${pending}`;
  else span.textContent = "Menggambar…";
}

function enqueueGeneration() {
  const rawPrompt = currentPrompt();
  if (!rawPrompt) {
    toast("Tulis dulu ide gambarmu.", { type: "warn" });
    els.prompt?.focus();
    return;
  }

  const engine = getPrefs().imageEngine;
  if (engine === "puter" && !getPrefs().puterConnected) {
    toast("Puter belum terhubung. Pakai Pollinations (tanpa login) atau hubungkan akun gratis di Pengaturan.", { type: "warn" });
    return;
  }

  const ratio = RATIOS.find((item) => item.id === activeRatio) || RATIOS[0];
  const seed = Number(els.seed?.value) || Math.floor(Math.random() * 999_999_999) + 1;
  const model = engine === "puter" ? els.model?.value || "" : "";

  queue.push({
    id: uid("job"),
    rawPrompt,
    prompt: fullPrompt(rawPrompt),
    ratio,
    seed,
    engine,
    model,
    safe: Boolean(els.safe?.checked),
  });

  randomizeSeed(); // siapkan seed baru untuk klik berikutnya
  syncGenBtn();
  updateHint();
  runQueue();
}

function generate() {
  enqueueGeneration();
}

async function runQueue() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      controller = new AbortController();
      syncGenBtn();
      updateHint();
      hideStatus();
      showGenerating(job.prompt, job.engine, queue.length);
      try {
        await runJob(job, controller.signal);
      } catch (error) {
        handleJobError(error);
      } finally {
        controller = null;
      }
    }
  } finally {
    running = false;
    syncGenBtn();
    updateHint();
  }
}

async function runJob(job, signal) {
  let blob = null;
  let remoteUrl = "";

  if (job.engine === "puter") {
    const result = await puterImage({
      prompt: job.prompt,
      model: job.model,
      aspectRatio: job.ratio.id,
      signal,
    });
    if (result instanceof Blob) blob = result;
    else remoteUrl = result.remoteUrl || "";
  } else {
    const url = buildPollinationsImageUrl({
      prompt: job.prompt,
      width: job.ratio.w,
      height: job.ratio.h,
      seed: job.seed,
      safe: job.safe,
    });
    blob = await fetchPollinationsImage(url, {
      signal,
      onRetry: ({ attempt, attempts, reason }) => {
        if (reason === "rate_limit") setGenStatus(`Penyedia ramai · coba ulang otomatis ${attempt}/${attempts}`);
        else setGenStatus(`Menyambung ulang · percobaan ${attempt}/${attempts}`);
      },
    });
  }

  const record = {
    id: uid("img"),
    prompt: job.rawPrompt,
    fullPrompt: job.prompt,
    width: job.ratio.w,
    height: job.ratio.h,
    ratio: job.ratio.id,
    style: activeStyle,
    seed: job.seed,
    engine: job.engine,
    model: job.model,
    createdAt: Date.now(),
    blob: blob || null,
    remoteUrl: remoteUrl || null,
  };

  hideStatus();
  await persist(record);
  syncGenBtn();
  updateHint();
  els.gallery?.firstElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  toast(queue.length ? "Gambar siap! Lanjut ke antrean berikutnya." : "Gambar siap! Tersimpan di galeri perangkatmu.", { type: "ok" });
}

function handleJobError(error) {
  if (error?.name === "AbortError") {
    hideStatus();
    toast("Dibatalkan.", { type: "info", timeout: 2200 });
    return;
  }
  if (error instanceof AiError && error.code === "auth") {
    showError(error.message, { connect: true });
    return;
  }
  showError(error?.message || "Terjadi kesalahan tak terduga.");
}

/* ---------------- lightbox & item ---------------- */
function openLightbox(record) {
  if (!record || !els.lightbox) return;
  currentItem = record;
  const url = urlFor(record);
  if (els.lbImg) els.lbImg.src = url;
  if (els.lbPrompt) els.lbPrompt.textContent = record.fullPrompt || record.prompt;
  if (els.lbDownload) {
    els.lbDownload.href = url;
    els.lbDownload.download = `modmanga-${slugify(record.prompt)}.jpg`;
  }
  if (typeof els.lightbox.showModal === "function") els.lightbox.showModal();
  else els.lightbox.setAttribute("open", "");
}

function downloadRecord(record) {
  const url = urlFor(record);
  if (!url) return;
  if (record.remoteUrl && !record.blob) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = `modmanga-${slugify(record.prompt)}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function removeRecord(id) {
  gallery = gallery.filter((item) => item.id !== id);
  releaseUrl(id);
  await deleteImage(id);
  renderGallery();
  toast("Gambar dihapus dari galeri.", { type: "info", timeout: 2600 });
}

/* ---------------- bind ---------------- */
function bind() {
  els.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    generate();
  });

  els.prompt?.addEventListener("input", updateCount);

  els.styleChips?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-style]");
    if (!chip) return;
    activeStyle = chip.dataset.style;
    setPrefs({ imageStyle: activeStyle });
    $$("[data-style]", els.styleChips).forEach((item) => item.classList.toggle("is-active", item === chip));
  });

  els.ratioChips?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-ratio]");
    if (!chip) return;
    activeRatio = chip.dataset.ratio;
    setPrefs({ imageRatio: activeRatio });
    $$("[data-ratio]", els.ratioChips).forEach((item) => item.classList.toggle("is-active", item === chip));
  });

  els.surprise?.addEventListener("click", () => {
    if (!els.prompt) return;
    els.prompt.value = IMAGE_SURPRISES[Math.floor(Math.random() * IMAGE_SURPRISES.length)];
    updateCount();
    randomizeSeed();
    els.prompt.focus();
  });

  els.randomSeed?.addEventListener("click", () => {
    if (els.lockSeed) els.lockSeed.checked = false;
    randomizeSeed();
  });

  els.engine?.addEventListener("change", () => {
    setPrefs({ imageEngine: els.engine.value });
    syncEngineUI();
    updateHint();
  });

  els.status?.addEventListener("click", async (event) => {
    if (event.target.closest("[data-cancel]")) {
      controller?.abort();
      if (queue.length) {
        queue.length = 0;
        syncGenBtn();
        updateHint();
        toast("Antrean dikosongkan.", { type: "info", timeout: 2400 });
      }
      return;
    }
    if (event.target.closest("[data-dismiss]")) {
      hideStatus();
      return;
    }
    if (event.target.closest("[data-retry]")) {
      hideStatus();
      generate();
      return;
    }
    if (event.target.closest("[data-connect]")) {
      const button = event.target.closest("[data-connect]");
      button.disabled = true;
      try {
        const user = await connectPuter();
        setPrefs({ puterConnected: true });
        toast(`Terhubung sebagai ${user.username}.`, { type: "ok" });
        hideStatus();
      } catch (error) {
        toast(error?.message || "Gagal menghubungkan Puter.", { type: "error" });
      } finally {
        button.disabled = false;
      }
    }
  });

  els.gallery?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-act]");
    if (action) {
      event.stopPropagation();
      const record = gallery.find((item) => item.id === action.dataset.id);
      if (!record) return;
      if (action.dataset.act === "download") downloadRecord(record);
      if (action.dataset.act === "delete") {
        if (confirm("Hapus gambar ini dari galeri?")) removeRecord(record.id);
      }
      return;
    }
    const item = event.target.closest("[data-id]");
    if (!item) return;
    const record = gallery.find((entry) => entry.id === item.dataset.id);
    if (record) openLightbox(record);
  });

  els.gallery?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest("[data-id]");
    if (!item) return;
    event.preventDefault();
    const record = gallery.find((entry) => entry.id === item.dataset.id);
    if (record) openLightbox(record);
  });

  els.clearGallery?.addEventListener("click", async () => {
    if (!gallery.length) return;
    if (!confirm("Hapus semua gambar di galeri? Tindakan ini tidak bisa dibatalkan.")) return;
    gallery.forEach((record) => releaseUrl(record.id));
    gallery = [];
    await clearImages();
    renderGallery();
    hideStatus();
    toast("Galeri dibersihkan.", { type: "info" });
  });

  els.lbClose?.addEventListener("click", () => els.lightbox?.close());
  els.lightbox?.addEventListener("click", (event) => {
    if (event.target === els.lightbox) els.lightbox.close();
  });

  els.lbCopy?.addEventListener("click", async () => {
    if (!currentItem) return;
    const ok = await copyText(currentItem.fullPrompt || currentItem.prompt);
    toast(ok ? "Prompt disalin." : "Gagal menyalin.", { type: ok ? "ok" : "error", timeout: 2400 });
  });

  els.lbReuse?.addEventListener("click", () => {
    if (!currentItem) return;
    els.lightbox?.close();
    location.hash = "#gambar";
    if (els.prompt) {
      els.prompt.value = currentItem.prompt;
      updateCount();
      els.prompt.focus();
    }
    if (els.seed) els.seed.value = String(currentItem.seed || "");
    activeStyle = currentItem.style || activeStyle;
    renderStyles();
    setPrefs({ imageStyle: activeStyle });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.lightbox?.open) els.lightbox.close();
  });
}

export function refreshImageStats() {
  return gallery.length;
}
