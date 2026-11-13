/* =========================================================
   tts.js — layar Teks ke Suara
   1) Browser  : Web Speech API (instan, gratis, offline)
   2) Puter    : Gemini / OpenAI / ElevenLabs / Polly (neural)
   ========================================================= */

import { $, $$, toast, clamp, escapeHtml, downloadBlob, relTime, uid } from "./util.js";
import { TTS_PROVIDERS, TTS_SAMPLES, VOICES_PREF } from "./config.js";
import { getPrefs, setPrefs, setTtsPrefs } from "./prefs.js";
import { puterSpeech, connectPuter, AiError } from "./api.js";

const MAX_CHARS = 3000;

let els = {};
let voices = [];
let mode = "browser";
let history = [];
let speaking = false;
let activeSpeech = null;
let audioLoading = false;

/* ---------------- util teks ---------------- */
export function stripMarkdown(text = "") {
  return String(text)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text, limit = 220) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= limit) return [clean];

  const parts = clean.split(/(?<=[.!?…。！？:])\s+/);
  const chunks = [];
  let current = "";

  for (const part of parts) {
    if (!part) continue;
    if ((current + " " + part).trim().length <= limit) {
      current = `${current} ${part}`.trim();
    } else {
      if (current) chunks.push(current);
      if (part.length > limit) {
        let rest = part;
        while (rest.length > limit) {
          const cut = rest.lastIndexOf(" ", limit);
          const at = cut > 40 ? cut : limit;
          chunks.push(rest.slice(0, at).trim());
          rest = rest.slice(at).trim();
        }
        current = rest;
      } else {
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/* ---------------- init ---------------- */
export function initTTS() {
  els = {
    engineSwitch: $("#ttsEngineSwitch"),
    text: $("#ttsText"),
    count: $("#ttsCount"),
    samples: $("#ttsSamples"),
    browserControls: $("#browserControls"),
    puterControls: $("#puterControls"),
    browserVoice: $("#ttsBrowserVoice"),
    rate: $("#ttsRate"),
    rateVal: $("#ttsRateVal"),
    pitch: $("#ttsPitch"),
    pitchVal: $("#ttsPitchVal"),
    provider: $("#ttsProvider"),
    voice: $("#ttsVoice"),
    style: $("#ttsStyle"),
    btn: $("#ttsBtn"),
    chip: $("#ttsEngineChip"),
    player: $("#player"),
    playerEmpty: $("#playerEmpty"),
    playerBody: $("#playerBody"),
    playPause: $("#playPause"),
    playerTitle: $("#playerTitle"),
    playerMeta: $("#playerMeta"),
    download: $("#downloadAudio"),
    audio: $("#audioEl"),
    history: $("#ttsHistory"),
    historyEmpty: $("#ttsHistoryEmpty"),
  };

  renderSamples();
  loadVoices();
  populateProviders();
  restore();
  bind();
  applyMode(getPrefs().tts.engine || "browser");
  updateCount();
  renderHistory();
}

function renderSamples() {
  if (!els.samples) return;
  els.samples.innerHTML = TTS_SAMPLES.map(
    (sample) => `<button type="button" class="chip" data-sample="${escapeHtml(sample.text)}">${escapeHtml(sample.label)}</button>`,
  ).join("");
}

/* ---------------- suara browser ---------------- */
function voiceScore(voice) {
  const lang = (voice.lang || "").toLowerCase();
  let score = 0;
  if (lang.startsWith("id")) score += 100;
  if (/natural|neural|premium|enhanced/i.test(voice.name || "")) score += 30;
  if (/google/i.test(voice.name || "")) score += 12;
  if (lang.startsWith("en")) score += 6;
  if (voice.default) score += 2;
  return score;
}

function loadVoices() {
  const synth = window.speechSynthesis;
  if (!synth) {
    if (els.browserVoice) {
      els.browserVoice.innerHTML = '<option value="">Browser ini tidak mendukung suara</option>';
    }
    return;
  }

  const list = synth.getVoices();
  if (!list.length) return;

  voices = list.slice().sort((a, b) => voiceScore(b) - voiceScore(a) || (a.name || "").localeCompare(b.name || ""));
  const saved = getPrefs().tts.browserVoice;

  if (els.browserVoice) {
    els.browserVoice.innerHTML = voices
      .map((voice) => `<option value="${escapeHtml(voice.voiceURI)}">${escapeHtml(`${voice.name} · ${voice.lang}`)}</option>`)
      .join("");
    const match = voices.find((voice) => voice.voiceURI === saved) || voices[0];
    if (match) els.browserVoice.value = match.voiceURI;
  }
}

/* ---------------- Puter ---------------- */
function populateProviders() {
  if (!els.provider) return;
  els.provider.innerHTML = Object.entries(TTS_PROVIDERS)
    .map(([id, cfg]) => `<option value="${id}">${escapeHtml(cfg.label)}</option>`)
    .join("");
  const saved = getPrefs().tts.provider;
  els.provider.value = TTS_PROVIDERS[saved] ? saved : "gemini";
  populateVoices(els.provider.value);
}

function populateVoices(providerId) {
  const cfg = TTS_PROVIDERS[providerId];
  if (!cfg || !els.voice) return;
  els.voice.innerHTML = cfg.voices
    .map((voice) => `<option value="${escapeHtml(voice.id)}">${escapeHtml(voice.label)}</option>`)
    .join("");
  const saved = getPrefs().tts.voice;
  const match = cfg.voices.find((voice) => voice.id === saved);
  els.voice.value = match ? match.id : cfg.defaultVoice;
  if (els.style) els.style.disabled = !cfg.supportsInstructions;
  updateChip();
}

function updateChip() {
  if (!els.chip) return;
  if (mode === "browser") {
    els.chip.textContent = "Browser";
    return;
  }
  const cfg = TTS_PROVIDERS[els.provider?.value] || TTS_PROVIDERS.gemini;
  els.chip.textContent = cfg.label.replace("Google ", "");
}

/* ---------------- restore & UI ---------------- */
function restore() {
  const tts = getPrefs().tts || VOICES_PREF;
  if (els.rate) {
    els.rate.value = String(tts.rate ?? 1);
    els.rateVal.textContent = `${Number(els.rate.value).toFixed(1)}×`;
  }
  if (els.pitch) {
    els.pitch.value = String(tts.pitch ?? 1);
    els.pitchVal.textContent = Number(els.pitch.value).toFixed(1);
  }
  if (els.style) els.style.value = tts.instructions || VOICES_PREF.instructions;
  if (els.text && !els.text.value.trim()) els.text.value = TTS_SAMPLES[0].text;
}

function applyMode(next) {
  if (mode !== (next === "puter" ? "puter" : "browser") && window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    markPlaying(false);
  }
  mode = next === "puter" ? "puter" : "browser";
  setTtsPrefs({ engine: mode });

  $$("[data-tts-engine]", els.engineSwitch).forEach((button) => {
    const isActive = button.dataset.ttsEngine === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (els.browserControls) els.browserControls.hidden = mode !== "browser";
  if (els.puterControls) els.puterControls.hidden = mode !== "puter";
  if (els.download) els.download.hidden = mode !== "puter";
  updateChip();
  setPlayerMetaDefault();
}

function setPlayerMetaDefault() {
  if (!els.playerMeta) return;
  els.playerMeta.textContent = mode === "browser"
    ? "Suara bawaan perangkat · tidak bisa diunduh"
    : "Suara neural · bisa diunduh";
}

function updateCount() {
  if (!els.count || !els.text) return;
  els.count.textContent = String(els.text.value.length);
}

/* ---------------- pemutar ---------------- */
function showPlayer() {
  if (els.playerEmpty) els.playerEmpty.hidden = true;
  if (els.playerBody) els.playerBody.hidden = false;
}

function markPlaying(isPlaying) {
  els.player?.classList.toggle("is-playing", isPlaying);
  els.player?.classList.toggle("is-speaking", isPlaying);
  if (els.playPause) els.playPause.setAttribute("aria-label", isPlaying ? "Jeda" : "Putar");
}

function resetPlayerVisual() {
  markPlaying(false);
}

/* ---------------- browser speak ---------------- */
function browserSpeak({ text, onStart, onEnd } = {}) {
  const synth = window.speechSynthesis;
  if (!synth) {
    toast("Browser ini tidak mendukung Web Speech API.", { type: "error" });
    return null;
  }

  const tts = getPrefs().tts;
  const voice = voices.find((item) => item.voiceURI === (els.browserVoice?.value || tts.browserVoice)) || voices[0] || null;
  const chunks = chunkText(text);
  if (!chunks.length) return null;

  synth.cancel();
  let index = 0;
  let stopped = false;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    speaking = false;
    activeSpeech = null;
    resetPlayerVisual();
    onEnd?.();
  };

  const speakNext = () => {
    if (stopped) return;
    if (index >= chunks.length) { finish(); return; }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    index += 1;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "id-ID";
    } else {
      utterance.lang = "id-ID";
    }
    utterance.rate = clamp(Number(els.rate?.value || tts.rate || 1), 0.5, 2);
    utterance.pitch = clamp(Number(els.pitch?.value || tts.pitch || 1), 0, 2);
    utterance.volume = 1;

    utterance.onstart = () => {
      if (index === 1) onStart?.();
      markPlaying(true);
    };
    utterance.onend = () => {
      if (stopped) return;
      setTimeout(speakNext, 30);
    };
    utterance.onerror = (event) => {
      if (["interrupted", "canceled"].includes(event.error)) return;
      if (event.error === "not-allowed") {
        toast("Browser memblokir suara. Ketuk sekali di halaman, lalu coba lagi.", { type: "warn" });
      }
      finish();
    };

    synth.speak(utterance);
  };

  speaking = true;
  activeSpeech = {
    stop: () => { stopped = true; synth.cancel(); finish(); },
    pause: () => synth.pause(),
    resume: () => synth.resume(),
    isPaused: () => synth.paused,
  };
  speakNext();
  return activeSpeech;
}

/* ---------------- Puter speak ---------------- */
async function puterSpeak() {
  const text = (els.text?.value || "").trim();
  if (!text) {
    toast("Tulis dulu naskahnya.", { type: "warn" });
    return;
  }
  if (text.length > MAX_CHARS) {
    toast(`Maksimal ${MAX_CHARS} karakter untuk suara neural.`, { type: "warn" });
    return;
  }

  const provider = els.provider?.value || "gemini";
  const cfg = TTS_PROVIDERS[provider] || TTS_PROVIDERS.gemini;
  const voiceId = els.voice?.value || cfg.defaultVoice;
  const voiceMeta = cfg.voices.find((voice) => voice.id === voiceId);
  const instructions = cfg.supportsInstructions ? (els.style?.value || "").trim() : "";

  if (!getPrefs().puterConnected) {
    try {
      const user = await connectPuter();
      setPrefs({ puterConnected: true });
      toast(`Terhubung sebagai ${user.username}.`, { type: "ok" });
    } catch (error) {
      toast(error?.message || "Hubungkan akun Puter dulu di Pengaturan.", { type: "error" });
      return;
    }
  }

  if (audioLoading) return;
  audioLoading = true;
  if (els.btn) {
    els.btn.disabled = true;
    els.btn.querySelector("span").textContent = "Menyiapkan suara…";
  }

  try {
    const audio = await puterSpeech({
      text,
      provider,
      voice: voiceId,
      model: cfg.defaultModel,
      instructions,
      language: voiceMeta?.language,
    });

    const src = audio?.src || audio?.getAttribute?.("src") || "";
    if (!src) throw new AiError("Puter tidak mengembalikan berkas audio.", { code: "empty", provider: "puter" });

    showPlayer();
    if (els.audio) {
      els.audio.hidden = false;
      els.audio.src = src;
      els.audio.play().catch(() => { /* pengguna bisa tekan play manual */ });
    }
    if (els.download) {
      els.download.href = src;
      els.download.download = `modmanga-suara-${provider}.${provider === "gemini" ? "wav" : "mp3"}`;
    }
    if (els.playerTitle) els.playerTitle.textContent = text.slice(0, 60) + (text.length > 60 ? "…" : "");
    if (els.playerMeta) els.playerMeta.textContent = `${cfg.label} · ${voiceId} · ${text.length} karakter`;
    updateChip();

    addHistory({ text, provider, voice: voiceId, src, engine: "puter" });
    toast("Suara siap diputar.", { type: "ok", timeout: 2600 });
  } catch (error) {
    if (error instanceof AiError) {
      toast(error.message, { type: "error" });
    } else {
      toast(error?.message || "Gagal membuat suara.", { type: "error" });
    }
  } finally {
    audioLoading = false;
    if (els.btn) {
      els.btn.disabled = false;
      els.btn.querySelector("span").textContent = "Bacakan";
    }
  }
}

/* ---------------- aksi utama ---------------- */
function speak() {
  const text = (els.text?.value || "").trim();
  if (!text) {
    toast("Tulis dulu naskahnya.", { type: "warn" });
    return;
  }

  if (mode === "puter") {
    puterSpeak();
    return;
  }

  const limited = text.slice(0, MAX_CHARS);
  showPlayer();
  if (els.audio) els.audio.hidden = true;
  if (els.download) els.download.hidden = true;
  if (els.playerTitle) els.playerTitle.textContent = limited.slice(0, 60) + (limited.length > 60 ? "…" : "");
  if (els.playerMeta) {
    const voiceName = els.browserVoice?.selectedOptions?.[0]?.textContent || "suara perangkat";
    els.playerMeta.textContent = `Browser · ${voiceName}`;
  }
  updateChip();

  browserSpeak({
    text: limited,
    onStart: () => markPlaying(true),
    onEnd: () => markPlaying(false),
  });

  addHistory({ text: limited, engine: "browser", voice: els.browserVoice?.value || "", src: "" });
}

function togglePlay() {
  if (mode === "browser" || (!els.audio?.src && activeSpeech)) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      markPlaying(false);
    } else if (synth.paused) {
      synth.resume();
      markPlaying(true);
    } else {
      speak();
    }
    return;
  }

  if (!els.audio?.src) {
    speak();
    return;
  }
  if (els.audio.paused) {
    els.audio.play().catch(() => toast("Tidak bisa memutar audio.", { type: "error" }));
  } else {
    els.audio.pause();
  }
}

/* ---------------- riwayat ---------------- */
function addHistory(entry) {
  history.unshift({ id: uid("tts"), createdAt: Date.now(), ...entry });
  history = history.slice(0, 8);
  renderHistory();
}

function renderHistory() {
  if (!els.history) return;
  els.historyEmpty.hidden = history.length > 0;
  els.history.innerHTML = history
    .map((item) => {
      const label = item.text.slice(0, 70) + (item.text.length > 70 ? "…" : "");
      const engine = item.engine === "puter" ? (TTS_PROVIDERS[item.provider]?.label || "Puter") : "Browser";
      return `<button type="button" class="history-item" data-hid="${item.id}">
        <svg class="ico" aria-hidden="true"><use href="${item.src ? "i-play" : "i-audio"}"></use></svg>
        <span>${escapeHtml(label)}</span>
        <small>${escapeHtml(engine)} · ${relTime(item.createdAt)}</small>
      </button>`;
    })
    .join("");
}

function playHistory(id) {
  const item = history.find((entry) => entry.id === id);
  if (!item) return;

  if (item.src && els.audio) {
    showPlayer();
    els.audio.hidden = false;
    els.audio.src = item.src;
    els.audio.play().catch(() => {});
    if (els.playerTitle) els.playerTitle.textContent = item.text.slice(0, 60);
    if (els.playerMeta) els.playerMeta.textContent = `${TTS_PROVIDERS[item.provider]?.label || "Suara"} · ${item.voice || "browser"}`;
    if (els.download) {
      els.download.hidden = false;
      els.download.href = item.src;
      els.download.download = `modmanga-suara.${item.provider === "gemini" ? "wav" : "mp3"}`;
    }
    return;
  }

  applyMode("browser");
  if (els.text) els.text.value = item.text;
  updateCount();
  speak();
}

/* ---------------- bind ---------------- */
function bind() {
  els.engineSwitch?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tts-engine]");
    if (!button) return;
    applyMode(button.dataset.ttsEngine);
  });

  els.text?.addEventListener("input", updateCount);

  els.samples?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-sample]");
    if (!chip) return;
    if (els.text) els.text.value = chip.dataset.sample;
    updateCount();
    els.text?.focus();
  });

  els.browserVoice?.addEventListener("change", () => setTtsPrefs({ browserVoice: els.browserVoice.value }));

  els.rate?.addEventListener("input", () => {
    els.rateVal.textContent = `${Number(els.rate.value).toFixed(1)}×`;
    setTtsPrefs({ rate: Number(els.rate.value) });
  });

  els.pitch?.addEventListener("input", () => {
    els.pitchVal.textContent = Number(els.pitch.value).toFixed(1);
    setTtsPrefs({ pitch: Number(els.pitch.value) });
  });

  els.provider?.addEventListener("change", () => {
    populateVoices(els.provider.value);
    setTtsPrefs({ provider: els.provider.value });
  });

  els.voice?.addEventListener("change", () => setTtsPrefs({ voice: els.voice.value }));

  els.style?.addEventListener("change", () => setTtsPrefs({ instructions: els.style.value }));

  els.btn?.addEventListener("click", speak);
  els.playPause?.addEventListener("click", togglePlay);

  els.audio?.addEventListener("play", () => markPlaying(true));
  els.audio?.addEventListener("pause", () => markPlaying(false));
  els.audio?.addEventListener("ended", () => markPlaying(false));

  els.history?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-hid]");
    if (item) playHistory(item.dataset.hid);
  });

  els.download?.addEventListener("click", async (event) => {
    const href = els.download.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    try {
      const res = await fetch(href);
      const blob = await res.blob();
      downloadBlob(blob, els.download.getAttribute("download") || "modmanga-suara.mp3");
    } catch {
      window.open(href, "_blank", "noopener");
    }
  });

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 350);
    setTimeout(loadVoices, 1400);
  }
}

/* ---------------- dipakai modul lain ---------------- */
export function speakQuick(text) {
  const clean = stripMarkdown(text || "").slice(0, 4000);
  if (!clean) {
    toast("Tidak ada teks untuk dibacakan.", { type: "warn" });
    return;
  }
  if (!window.speechSynthesis) {
    toast("Browser ini tidak mendukung suara.", { type: "error" });
    return;
  }

  if (els.playerTitle) els.playerTitle.textContent = clean.slice(0, 60) + (clean.length > 60 ? "…" : "");
  if (els.playerMeta) els.playerMeta.textContent = "Dibacakan dari chat · suara perangkat";
  if (els.playerEmpty) els.playerEmpty.hidden = true;
  if (els.playerBody) els.playerBody.hidden = false;
  if (els.audio) els.audio.hidden = true;
  if (els.download) els.download.hidden = mode !== "puter";

  browserSpeak({
    text: clean,
    onStart: () => markPlaying(true),
    onEnd: () => markPlaying(false),
  });
  toast("Membacakan jawaban…", { type: "info", timeout: 2000 });
}
