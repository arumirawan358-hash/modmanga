/* =========================================================
   TTSFree.clone — app.js
   Tiga mesin suara gratis:
     1) browser : Web Speech API (instan, offline, tanpa unduhan)
     2) google  : Google Translate TTS (natural, bisa disimpan)
     3) neural  : Puter AI (Azure Neural / Polly / Gemini / OpenAI)
   + musik latar prosedural (Web Audio API) & mixing offline
   ========================================================= */
"use strict";

/* ---------------------------------------------------------
   1. DATA BAHASA & SUARA
   --------------------------------------------------------- */
const LANGS = [
  {
    id: "id", flag: "🇮🇩", num: 69, tr: "id", bcp: "id-ID",
    label: "Indonesian (Indonesia) - ID",
    neural: {
      male: { name: "Ardi", id: "id-ID-ArdiNeural", puter: { provider: "gemini", voice: "Puck" } },
      female: { name: "Gadis", id: "id-ID-GadisNeural", puter: { provider: "gemini", voice: "Kore" } },
    },
    demo: "Halo, saya suara AI Bahasa Indonesia. Senang bisa membacakan teksmu hari ini.",
  },
  {
    id: "en-US", flag: "🇺🇸", num: 1, tr: "en", bcp: "en-US",
    label: "English (United States) - EN",
    neural: {
      male: { name: "Guy", id: "en-US-GuyNeural", puter: { provider: "gemini", voice: "Charon" } },
      female: { name: "Jenny", id: "en-US-JennyNeural", puter: { provider: "gemini", voice: "Aoede" } },
    },
    demo: "Hello, I am an AI voice. I can read your text out loud in a natural way.",
  },
  {
    id: "en-GB", flag: "🇬🇧", num: 2, tr: "en-GB", bcp: "en-GB",
    label: "English (United Kingdom) - EN",
    neural: {
      male: { name: "Ryan", id: "en-GB-RyanNeural", puter: { provider: "gemini", voice: "Fenrir" } },
      female: { name: "Sonia", id: "en-GB-SoniaNeural", puter: { provider: "gemini", voice: "Sulafat" } },
    },
    demo: "Hello there, this is a British English voice reading your text.",
  },
  {
    id: "ms-MY", flag: "🇲🇾", num: 40, tr: "ms", bcp: "ms-MY",
    label: "Malay (Malaysia) - MS",
    neural: {
      male: { name: "Osman", id: "ms-MY-OsmanNeural", puter: { provider: "gemini", voice: "Puck" } },
      female: { name: "Yasmin", id: "ms-MY-YasminNeural", puter: { provider: "gemini", voice: "Kore" } },
    },
    demo: "Hai, saya suara Bahasa Melayu. Sedia membacakan teks anda.",
  },
  {
    id: "ja-JP", flag: "🇯🇵", num: 12, tr: "ja", bcp: "ja-JP",
    label: "Japanese (Japan) - JA",
    neural: {
      male: { name: "Keita", id: "ja-JP-KeitaNeural", puter: { provider: "gemini", voice: "Charon" } },
      female: { name: "Nanami", id: "ja-JP-NanamiNeural", puter: { provider: "gemini", voice: "Kore" } },
    },
    demo: "こんにちは。私は日本語を読むことができる AI の声です。",
  },
  {
    id: "ko-KR", flag: "🇰🇷", num: 13, tr: "ko", bcp: "ko-KR",
    label: "Korean (Korea) - KO",
    neural: {
      male: { name: "InJoon", id: "ko-KR-InJoonNeural", puter: { provider: "gemini", voice: "Puck" } },
      female: { name: "SeoYeon", id: "ko-KR-SeoYeonNeural", puter: { provider: "gemini", voice: "Aoede" } },
    },
    demo: "안녕하세요. 저는 텍스트를 읽어 주는 AI 목소리입니다.",
  },
  {
    id: "ar-SA", flag: "🇸🇦", num: 20, tr: "ar", bcp: "ar-SA",
    label: "Arabic (Saudi Arabia) - AR",
    neural: {
      male: { name: "Hamed", id: "ar-SA-HamedNeural", puter: { provider: "gemini", voice: "Orus" } },
      female: { name: "Zariyah", id: "ar-SA-ZariyahNeural", puter: { provider: "gemini", voice: "Leda" } },
    },
    demo: "مرحباً، أنا صوت ذكاء اصطناعي يقرأ النصوص بوضوح.",
  },
  {
    id: "es-ES", flag: "🇪🇸", num: 25, tr: "es", bcp: "es-ES",
    label: "Spanish (Spain) - ES",
    neural: {
      male: { name: "Alvaro", id: "es-ES-AlvaroNeural", puter: { provider: "gemini", voice: "Puck" } },
      female: { name: "Elvira", id: "es-ES-ElviraNeural", puter: { provider: "gemini", voice: "Kore" } },
    },
    demo: "Hola, soy una voz de inteligencia artificial que lee tus textos.",
  },
  {
    id: "hi-IN", flag: "🇮🇳", num: 50, tr: "hi", bcp: "hi-IN",
    label: "Hindi (India) - HI",
    neural: {
      male: { name: "Madhur", id: "hi-IN-MadhurNeural", puter: { provider: "gemini", voice: "Fenrir" } },
      female: { name: "Swara", id: "hi-IN-SwaraNeural", puter: { provider: "gemini", voice: "Aoede" } },
    },
    demo: "नमस्ते, मैं एक ए आई आवाज़ हूँ जो आपका पाठ पढ़ती है।",
  },
  {
    id: "zh-CN", flag: "🇨🇳", num: 3, tr: "zh-CN", bcp: "zh-CN",
    label: "Chinese (Mandarin) - ZH",
    neural: {
      male: { name: "Yunxi", id: "zh-CN-YunxiNeural", puter: { provider: "gemini", voice: "Charon" } },
      female: { name: "Xiaoxiao", id: "zh-CN-XiaoxiaoNeural", puter: { provider: "gemini", voice: "Leda" } },
    },
    demo: "你好，我是一个可以朗读文字的智能语音。",
  },
];

/* Nada & kecepatan untuk suara "standard" supaya tiap nama terdengar beda */
const STANDARD_STYLES = [
  { name: "Standard-A", gender: "female", pitch: 1.18, rate: 1.02, face: "👩" },
  { name: "Standard-B", gender: "male", pitch: 0.82, rate: 0.98, face: "👨" },
  { name: "Standard-C", gender: "male", pitch: 0.72, rate: 0.94, face: "👨" },
  { name: "Standard-D", gender: "female", pitch: 1.28, rate: 1.05, face: "👩" },
];

const PREMIUM_VOICES = [
  { name: "Wavenet-A", gender: "female", pitch: 1.1, rate: 1.0, face: "👩" },
  { name: "Wavenet-B", gender: "male", pitch: 0.85, rate: 1.0, face: "👨" },
  { name: "Wavenet-C", gender: "male", pitch: 0.75, rate: 0.97, face: "👨" },
  { name: "Wavenet-D", gender: "female", pitch: 1.22, rate: 1.03, face: "👩" },
];

function voicesFor(lang) {
  const list = [
    {
      key: "neural-male", kind: "neural", name: lang.neural.male.name, face: "👨",
      gender: "male", id: lang.neural.male.id, puter: lang.neural.male.puter,
      tag: "AI-2", pitch: 0.92, rate: 1,
    },
    {
      key: "neural-female", kind: "neural", name: lang.neural.female.name, face: "👩",
      gender: "female", id: lang.neural.female.id, puter: lang.neural.female.puter,
      tag: "AI-2", pitch: 1.06, rate: 1,
    },
    ...STANDARD_STYLES.map((s) => ({
      ...s, key: s.name, kind: "standard", id: `${lang.bcp}-${s.name}`, tag: "AI-1",
    })),
    ...PREMIUM_VOICES.map((p) => ({
      ...p, key: p.name, kind: "premium", id: `${lang.bcp}-${p.name}`, tag: "AI-1", locked: true,
    })),
  ];
  return list;
}

const MUSIC_PRESETS = {
  lofi: {
    label: "Lo-fi hangat", note: "rileks · 70 BPM",
    chords: [[220.0, 261.63, 329.63], [196.0, 246.94, 293.66], [174.61, 220.0, 261.63], [196.0, 246.94, 329.63]],
    cutoff: 1400, noise: 0.012, pluck: true,
  },
  ambient: {
    label: "Ambient lembut", note: "tenang · padat",
    chords: [[174.61, 261.63, 349.23], [155.56, 233.08, 311.13], [196.0, 293.66, 392.0], [146.83, 220.0, 329.63]],
    cutoff: 900, noise: 0.02, pluck: false,
  },
  rain: {
    label: "Hujan & nada", note: "fokus · tekstur",
    chords: [[196.0, 293.66, 392.0], [174.61, 261.63, 349.23]],
    cutoff: 1700, noise: 0.075, pluck: false,
  },
  epic: {
    label: "Epik ringan", note: "heroik · 90 BPM",
    chords: [[146.83, 220.0, 293.66, 349.23], [164.81, 246.94, 329.63, 392.0], [130.81, 196.0, 261.63, 329.63], [146.83, 220.0, 293.66, 349.23]],
    cutoff: 2300, noise: 0.008, pluck: true,
  },
};

/* ---------------------------------------------------------
   2. UTIL
   --------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const rand = (n) => Math.random() * n;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function toast(message, type = "ok", timeout = 3800) {
  const wrap = $("#toastWrap");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === "ok" ? "✅" : type === "warn" ? "⚠️" : "⛔"}</span><span>${escapeHtml(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s, transform .25s";
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    setTimeout(() => el.remove(), 260);
  }, timeout);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function chunkText(text, limit = 190) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= limit) return [clean];
  const parts = clean.split(/(?<=[.!?…;:])\s+/);
  const out = [];
  let cur = "";
  for (const part of parts) {
    if (!part) continue;
    if ((cur + " " + part).trim().length <= limit) {
      cur = `${cur} ${part}`.trim();
      continue;
    }
    if (cur) out.push(cur);
    if (part.length > limit) {
      let rest = part;
      while (rest.length > limit) {
        let cut = rest.lastIndexOf(" ", limit);
        if (cut < 40) cut = limit;
        out.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      cur = rest;
    } else {
      cur = part;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function encodeWav(buffer) {
  const channels = Math.min(buffer.numberOfChannels, 2);
  const frames = buffer.length;
  const bytes = 44 + frames * channels * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  str(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, frames * channels * 2, true);

  const data = [];
  for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = clamp(data[c][i], -1, 1);
      view.setInt16(off, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

function loadScript(src, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    if ($$(`script[src="${src}"]`).length) return resolve();
    const s = document.createElement("script");
    let done = false;
    const finish = (fn, arg) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      fn(arg);
    };
    const timer = setTimeout(() => finish(reject, new Error("Waktu habis memuat " + src)), timeoutMs);
    s.src = src;
    s.onload = () => finish(resolve);
    s.onerror = () => finish(reject, new Error("Gagal memuat " + src));
    document.head.appendChild(s);
  });
}

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* penuh / privasi */ }
  },
};

/* ---------------------------------------------------------
   3. STATE
   --------------------------------------------------------- */
const state = {
  langId: "id",
  voiceKey: "neural-male",
  engine: "browser",          // mesin untuk suara AI-1
  rate: 1,
  pitch: 1,
  volume: 1,
  loggedIn: false,
  music: { on: false, preset: "lofi", volume: 0.22, mix: true, url: "" },
  last: null,                 // { engine, voice, text, buffer, blob, mime, url, duration }
  history: [],
  busy: false,
};

const els = {};
let audioCtx = null;
let analyser = null;
let musicSource = null;
let musicGain = null;
const musicCache = new Map();

/* ---------------------------------------------------------
   4. RENDER
   --------------------------------------------------------- */
function currentLang() {
  return LANGS.find((l) => l.id === state.langId) || LANGS[0];
}
function currentVoice() {
  return voicesFor(currentLang()).find((v) => v.key === state.voiceKey) || voicesFor(currentLang())[0];
}

function renderLangs() {
  els.lang.innerHTML = LANGS.map(
    (l) => `<option value="${l.id}">${l.flag} ${l.num}. ${escapeHtml(l.label)}</option>`,
  ).join("");
  els.lang.value = state.langId;
}

function renderVoices() {
  const voices = voicesFor(currentLang());
  els.voiceGrid.innerHTML = voices.map((v) => {
    const active = v.key === state.voiceKey ? " is-active" : "";
    const locked = v.locked ? " locked" : "";
    const tagCls = v.tag === "AI-2" ? "tag-ai2" : "tag-ai1";
    const meta = v.locked ? `<span class="vpremium">Premium</span>` : `<i class="tag ${tagCls}">${v.tag}</i>`;
    return `
      <button type="button" class="vcard${active}${locked}" data-voice="${v.key}"
              role="radio" aria-checked="${v.key === state.voiceKey}"
              title="${escapeHtml(v.name)} · ${escapeHtml(v.id)}">
        ${v.locked ? '<span class="lock" aria-hidden="true">🔒</span>' : ""}
        <span class="vcard-top">
          <span class="vface" aria-hidden="true">${v.face}</span>
          <span class="vname">${escapeHtml(v.name)}</span>
          <span class="vplay" data-preview="${v.key}" role="button" tabindex="-1" aria-label="Dengarkan ${escapeHtml(v.name)}">▶</span>
        </span>
        <span class="vmeta">${v.gender === "male" ? "Pria" : "Wanita"} ${meta}</span>
      </button>`;
  }).join("");
  syncEngineUI();
}

function syncEngineUI() {
  const v = currentVoice();
  $$("#engineSeg button").forEach((b) => {
    const on = b.dataset.engine === state.engine;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", String(on));
  });
  const hint = els.engineHint;
  if (v.kind === "neural") hint.textContent = "AI-2 selalu pakai neural";
  else if (v.locked) hint.textContent = "suara premium terkunci";
  else hint.textContent = "untuk suara AI-1";
}

function renderCatalog() {
  const lang = currentLang();
  els.catalog.innerHTML = voicesFor(lang).map((v) => `
    <article class="cat-card${v.locked ? " locked" : ""}">
      <div class="cat-face" aria-hidden="true">${v.face}</div>
      <div class="cat-body">
        <div class="cat-name">
          <span>${escapeHtml(v.name)}</span>
          <span class="cat-flag">${lang.flag}</span>
          ${v.locked ? '<span class="vpremium">Premium</span>' : ""}
        </div>
        <div class="cat-id">voiceID: ${escapeHtml(v.id)}</div>
      </div>
      <button class="cat-play" type="button" data-preview="${v.key}" aria-label="Dengarkan demo ${escapeHtml(v.name)}">▶</button>
    </article>
  `).join("");
}

function renderTracks() {
  els.tracks.innerHTML = Object.entries(MUSIC_PRESETS).map(([id, p]) => `
    <button type="button" class="track${id === state.music.preset ? " is-active" : ""}" data-track="${id}">
      ${escapeHtml(p.label)}<span>${escapeHtml(p.note)}</span>
    </button>
  `).join("");
}

/* ---------------------------------------------------------
   5. TEKS & LIMIT
   --------------------------------------------------------- */
function updateCounter() {
  const len = els.text.value.length;
  els.count.textContent = len.toLocaleString("id-ID");
  els.text.maxLength = 524288; // batas teknis browser saja, bukan batas layanan
  els.counter.classList.toggle("is-long", len > 8000);
}

/* ---------------------------------------------------------
   6. WEB AUDIO DASAR
   --------------------------------------------------------- */
function getCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

/* ---------- musik prosedural ---------- */
function buildNoiseBuffer(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = 0.97 * last + 0.03 * white;
    data[i] = last;
  }
  return buf;
}

/* Menggambar grafik musik ke sebuah destination pada ctx (dipakai live & offline) */
function scheduleMusic(ctx, destination, presetId, duration) {
  const p = MUSIC_PRESETS[presetId] || MUSIC_PRESETS.lofi;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(destination);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = p.cutoff;
  filter.Q.value = 0.6;
  filter.connect(master);

  const segLen = duration / p.chords.length;

  p.chords.forEach((chord, ci) => {
    const start = ci * segLen;
    chord.forEach((freq, fi) => {
      [-4, 0, 4].forEach((detune, di) => {
        const osc = ctx.createOscillator();
        osc.type = di === 1 ? "triangle" : "sine";
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const g = ctx.createGain();
        const peak = (0.16 / (fi + 1)) * (di === 1 ? 1 : 0.7);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(peak, start + segLen * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, start + segLen * 1.02);
        osc.connect(g).connect(filter);
        osc.start(start);
        osc.stop(start + segLen * 1.05);
      });
    });

    if (p.pluck) {
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const t = start + (segLen / steps) * s;
        const freq = chord[s % chord.length] * 2;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        osc.connect(g).connect(master);
        osc.start(t);
        osc.stop(t + 0.95);
      }
    }
  });

  if (p.noise > 0) {
    const noise = ctx.createBufferSource();
    noise.buffer = buildNoiseBuffer(ctx, duration);
    noise.loop = true;
    const ng = ctx.createGain();
    ng.gain.value = p.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200;
    bp.Q.value = 0.4;
    noise.connect(bp).connect(ng).connect(master);
    noise.start(0);
    noise.stop(duration);
  }

  return master;
}

function renderMusicBuffer(presetId) {
  if (musicCache.has(presetId)) return Promise.resolve(musicCache.get(presetId));
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Ctx) return Promise.reject(new Error("OfflineAudioContext tidak didukung"));
  const duration = 12;
  const ctx = new Ctx(2, 44100 * duration, 44100);
  scheduleMusic(ctx, ctx.destination, presetId, duration);
  return ctx.startRendering().then((buffer) => {
    musicCache.set(presetId, buffer);
    return buffer;
  });
}

async function startMusic() {
  if (!state.music.on) return;
  const ctx = getCtx();
  const buffer = await renderMusicBuffer(state.music.preset);
  stopMusic();
  musicGain = ctx.createGain();
  musicGain.gain.value = state.music.volume;
  musicGain.connect(ctx.destination);
  musicSource = ctx.createBufferSource();
  musicSource.buffer = buffer;
  musicSource.loop = true;
  musicSource.connect(musicGain);
  musicSource.start();
}

function stopMusic() {
  if (musicSource) {
    try { musicSource.stop(); } catch { /* sudah berhenti */ }
    musicSource.disconnect();
    musicSource = null;
  }
  if (musicGain) {
    musicGain.disconnect();
    musicGain = null;
  }
}

/* ---------------------------------------------------------
   7. MESIN 1 — BROWSER (Web Speech API)
   --------------------------------------------------------- */
let sysVoices = [];
function refreshVoices() {
  if (!("speechSynthesis" in window)) return;
  sysVoices = window.speechSynthesis.getVoices() || [];
}
if ("speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

function pickSystemVoice(lang, voice) {
  const want = lang.bcp.toLowerCase();
  const base = want.split("-")[0];
  const list = sysVoices.length ? sysVoices : (window.speechSynthesis?.getVoices?.() || []);
  const female = voice.gender === "female";
  const score = (v) => {
    const tag = (v.lang || "").toLowerCase().replace("_", "-");
    let s = 0;
    if (tag === want) s += 100;
    else if (tag.split("-")[0] === base) s += 60;
    if (/google/i.test(v.name)) s += 25;
    if (/natural|neural|premium/i.test(v.name)) s += 15;
    const femaleName = /female|wanita|perempuan|google bahasa|damayanti|andika|gadis|siti|zira|samantha|victoria|karen|moira|tessa|sari/i.test(v.name);
    if (female && femaleName) s += 12;
    if (!female && /male|pria|ardi|david|daniel|alex|fred/i.test(v.name)) s += 12;
    return s;
  };
  return list
    .filter((v) => (v.lang || "").toLowerCase().startsWith(base))
    .sort((a, b) => score(b) - score(a))[0] || list.find((v) => /^id/i.test(v.lang)) || null;
}

function speakBrowser(text, { rate, pitch, voice, lang, onEnd, onStart } = {}) {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Browser ini tidak punya Web Speech API. Coba mesin Google."));
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const sysVoice = pickSystemVoice(lang, voice);
    if (sysVoice) utter.voice = sysVoice;
    utter.lang = sysVoice?.lang || lang.bcp;
    utter.rate = clamp(rate, 0.1, 10);
    utter.pitch = clamp(pitch, 0, 2);
    utter.volume = state.volume;
    utter.onstart = () => onStart?.();
    utter.onend = () => { onEnd?.(); resolve(); };
    utter.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") resolve();
      else reject(new Error(`Mesin browser gagal (${e.error || "error"}).`));
    };
    synth.speak(utter);
  });
}

/* ---------------------------------------------------------
   8. MESIN 2 — GOOGLE TRANSLATE TTS
   --------------------------------------------------------- */
const GOOGLE_HOSTS = ["translate.google.com", "translate.googleapis.com"];

function googleUrl(text, lang, slow, host = GOOGLE_HOSTS[0]) {
  const tl = (lang.tr || "id").toLowerCase();
  return `https://${host}/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}` +
    `&ttsspeed=${slow ? "0.24" : "1"}&total=1&idx=0&textlen=${text.length}&q=${encodeURIComponent(text)}`;
}

/* Putar potongan-potongan audio berurutan (lewat elemen <audio>, jadi bebas CORS) */
function playGoogleChunks(chunks, lang, rate, onProgress, onEnd) {
  const players = [];
  let stopped = false;
  let index = 0;
  let totalDur = 0;

  const stopFn = {
    abort() {
      stopped = true;
      players.forEach((a) => { try { a.pause(); a.src = ""; } catch { /* noop */ } });
    },
    get duration() { return totalDur; },
  };

  const playAt = (i) => {
    if (stopped) return;
    if (i >= chunks.length) { onEnd?.(); return; }

    const chunk = chunks[i];
    const slow = rate <= 0.75;
    let hostIdx = 0;
    const audio = new Audio();
    audio.preservesPitch = false;
    audio.playbackRate = clamp(rate, 0.5, 2);
    audio.volume = state.volume;
    audio.preload = "auto";
    players.push(audio);
    index = i + 1;

    const fail = () => {
      if (stopped) return;
      if (hostIdx + 1 < GOOGLE_HOSTS.length) {
        hostIdx += 1;
        attempt();
        return;
      }
      stopFn.abort();
      onEnd?.(new Error("Mesin Google menolak permintaan suara. Coba mesin Browser atau suara AI-2."));
    };

    const attempt = () => {
      if (stopped) return;
      try {
        audio.src = googleUrl(chunk, lang, slow, GOOGLE_HOSTS[hostIdx]);
        audio.load?.();
      } catch {
        fail();
        return;
      }
      const p = audio.play();
      if (p && typeof p.catch === "function") p.catch(() => fail());
    };

    audio.addEventListener("loadedmetadata", () => {
      totalDur += Number.isFinite(audio.duration) ? audio.duration : chunk.length * 0.06;
    });
    audio.addEventListener("timeupdate", () => {
      onProgress?.({ index, total: chunks.length, current: audio.currentTime, duration: audio.duration });
    });
    audio.addEventListener("ended", () => playAt(i + 1));
    audio.addEventListener("error", fail);

    attempt();
  };

  playAt(0);
  return stopFn;
}

/* Ambil byte MP3 (untuk unduhan) — coba langsung, lalu lewat proxy CORS publik */
const CORS_PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

async function fetchBytes(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) return await res.arrayBuffer();
  } catch { /* coba proxy */ }
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url));
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 512) return buf;
      }
    } catch { /* lanjut */ }
  }
  throw new Error("MP3 tidak bisa diunduh langsung (CORS). Coba mesin Neural untuk unduhan penuh.");
}

async function fetchChunkBytes(chunk, lang, rate) {
  let lastError = null;
  for (const host of GOOGLE_HOSTS) {
    try {
      return await fetchBytes(googleUrl(chunk, lang, rate <= 0.75, host));
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("Gagal mengambil audio Google.");
}

async function fetchGoogleMp3(chunks, lang, rate, onProgress) {
  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    const buf = await fetchChunkBytes(chunks[i], lang, rate);
    parts.push(new Uint8Array(buf));
    onProgress?.(((i + 1) / chunks.length) * 100);
  }
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  parts.forEach((p) => { out.set(p, off); off += p.byteLength; });
  return new Blob([out], { type: "audio/mpeg" });
}

/* ---------------------------------------------------------
   9. MESIN 3 — PUTER (neural: Azure / Polly / Gemini / OpenAI)
   --------------------------------------------------------- */
let puterReady = null;
async function ensurePuter() {
  if (window.puter?.ai?.txt2speech) return window.puter;
  if (!puterReady) {
    puterReady = loadScript("https://js.puter.com/v2/").then(() => {
      if (!window.puter?.ai) throw new Error("Puter SDK tidak termuat.");
      return window.puter;
    }).catch((err) => { puterReady = null; throw err; });
  }
  return puterReady;
}

async function synthPuter(text, voice, lang) {
  const puter = await ensurePuter();
  const base = {
    provider: voice.puter?.provider || "gemini",
    voice: voice.puter?.voice || "Kore",
    language: lang.bcp,
  };
  const attempts = [base, { ...base, provider: "openai", model: "gpt-4o-mini-tts", voice: "nova" }];
  let lastError = null;
  for (const options of attempts) {
    try {
      const audio = await puter.ai.txt2speech(text, options);
      const src = audio?.src || audio?.getAttribute?.("src") || "";
      if (!src) throw new Error("Audio kosong dari Puter.");
      const res = await fetch(src);
      const buffer = await res.arrayBuffer();
      return { arrayBuffer: buffer, mime: res.headers.get("content-type") || "audio/mpeg" };
    } catch (error) {
      lastError = error;
      if (/auth|sign|login|permission/i.test(error?.message || "")) break;
    }
  }
  throw lastError || new Error("Puter gagal membuat suara.");
}

/* ---------------------------------------------------------
   10. PEMUTAR & WAVEFORM
   --------------------------------------------------------- */
const wave = {
  bars: [],
  playing: false,
  raf: null,
  seed(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const out = [];
    for (let i = 0; i < 64; i++) {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      const v = ((h >>> 8) & 0xff) / 255;
      out.push(0.12 + v * 0.88);
    }
    this.bars = out;
  },
  draw(progress = 0) {
    const canvas = els.wave;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 300;
    const h = 96;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    let levels = this.bars.length ? this.bars : new Array(64).fill(0.3);
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const n = 56;
      levels = Array.from({ length: n }, (_, i) => {
        const idx = Math.floor((i / n) * data.length * 0.7);
        return clamp((data[idx] || 0) / 190, 0.06, 1);
      });
    }

    const n = levels.length;
    const gap = 2;
    const bw = Math.max(2, (w - gap * (n - 1)) / n);
    levels.forEach((lv, i) => {
      const x = i * (bw + gap);
      const bh = Math.max(3, lv * (h - 22));
      const y = (h - bh) / 2;
      const played = progress > 0 && i / n <= progress;
      g.fillStyle = played ? "#a78bfa" : "rgba(167,139,250,.32)";
      const r = Math.min(bw / 2, 3);
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, bw, bh, r);
      else g.rect(x, y, bw, bh);
      g.fill();
    });
  },
  animate(getProgress) {
    cancelAnimationFrame(this.raf);
    const loop = () => {
      this.draw(getProgress());
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  },
  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
  },
};

/* ---- pemutar buffer (hasil decode: puter / download google) ---- */
let bufferPlay = null; // { source, startedAt, duration, buffer }

function stopBufferPlay() {
  if (bufferPlay?.timer) clearInterval(bufferPlay.timer);
  if (bufferPlay?.source) {
    try { bufferPlay.source.stop(); } catch { /* noop */ }
    bufferPlay.source.disconnect();
  }
  bufferPlay = null;
  analyser = null;
  els.playBtn.classList.remove("is-playing");
  wave.stop();
}

async function playBuffer(buffer, { rate = 1, offset = 0, onProgress } = {}) {
  const ctx = getCtx();
  stopBufferPlay();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = clamp(rate, 0.25, 4);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 128;
  src.connect(analyser);
  analyser.connect(ctx.destination);
  const dur = buffer.duration / clamp(rate, 0.25, 4);
  src.start(0, offset);
  bufferPlay = { source: src, startedAt: ctx.currentTime - offset, duration: dur, buffer, rate };
  els.playBtn.classList.add("is-playing");
  els.playBtn.disabled = false;
  els.curTime.textContent = fmtTime(offset);
  els.durTime.textContent = fmtTime(dur);

  const progress = () => clamp((ctx.currentTime - bufferPlay.startedAt) / dur, 0, 1);
  wave.animate(progress);

  const timer = setInterval(() => {
    if (!bufferPlay || bufferPlay.source !== src) { clearInterval(timer); return; }
    const elapsed = clamp(ctx.currentTime - bufferPlay.startedAt, 0, dur);
    els.curTime.textContent = fmtTime(elapsed);
    onProgress?.(progress());
  }, 180);
  bufferPlay.timer = timer;

  src.onended = () => {
    if (bufferPlay?.source !== src) return;
    clearInterval(timer);
    stopBufferPlay();
    els.curTime.textContent = fmtTime(dur);
    els.durTime.textContent = fmtTime(dur);
    wave.draw(1);
    onProgress?.(1);
  };
  return bufferPlay;
}

/* ---- pemutar generik (google streaming / browser speech) ---- */
let stopCurrent = null;

function stopAll() {
  if (stopCurrent) {
    try { stopCurrent(); } catch { /* noop */ }
    stopCurrent = null;
  }
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
  }
  stopBufferPlay();
  els.playBtn.classList.remove("is-playing");
}

/* ---- progress bar utama ---- */
function setProgress(pct, label) {
  const p = clamp(pct, 0, 100);
  els.bar.style.width = `${p}%`;
  els.progressLabel.textContent = `${label || "Siap dikonversi"} · ${Math.round(p)}%`;
}

/* ---------------------------------------------------------
   11. KONVERSI
   --------------------------------------------------------- */
function revealPlayerOnMobile() {
  if (typeof window.matchMedia !== "function") return;
  if (!window.matchMedia("(max-width: 1040px)").matches) return;
  document.getElementById("player")?.scrollIntoView({ behavior: "smooth", block: "center" });
}
async function convert({ previewOnly = false } = {}) {
  const text = (els.text.value || "").trim();
  const lang = currentLang();
  const voice = currentVoice();

  if (!text) {
    toast("Tulis dulu teks yang mau diubah jadi suara.", "warn");
    els.text.focus();
    return;
  }
  if (voice.locked) {
    toast("Suara Wavenet adalah versi premium. Pilih Ardi, Gadis, atau Standard.", "warn");
    return;
  }
  if (state.busy) return;

  stopAll();
  state.busy = true;
  els.convert.disabled = true;
  els.convert.classList.add("is-busy");
  els.convertLabel.textContent = "Menyiapkan suara…";
  setProgress(6, "Memproses");

  const rate = state.rate * (voice.rate || 1);
  const pitch = state.pitch * (voice.pitch || 1);
  const sampleText = previewOnly ? lang.demo : text;

  wave.seed(sampleText);
  wave.draw(0);
  els.playerBadge.textContent = "Memproses";
  els.playerTitle.textContent = sampleText.slice(0, 72) + (sampleText.length > 72 ? "…" : "");
  els.playerMeta.textContent = `${voice.name} · ${voice.id}`;

  if (state.music.on) startMusic().catch(() => {});
  if (!previewOnly) setTimeout(revealPlayerOnMobile, 320);

  try {
    if (voice.kind === "neural") {
      await convertPuter(sampleText, voice, lang, rate, previewOnly);
    } else if (state.engine === "google") {
      await convertGoogle(sampleText, voice, lang, rate, pitch, previewOnly);
    } else {
      await convertBrowser(sampleText, voice, lang, rate, pitch, previewOnly);
    }
  } catch (error) {
    console.warn(error);
    toast(error?.message || "Gagal membuat suara.", "error", 6000);
    setProgress(0, "Gagal");
    els.playerBadge.textContent = "Gagal";
    els.playerMeta.textContent = error?.message || "Terjadi kesalahan.";
    if (state.music.on) stopMusic();
  } finally {
    state.busy = false;
    els.convert.disabled = false;
    els.convert.classList.remove("is-busy");
    els.convertLabel.textContent = "Konversi sekarang";
  }
}

async function convertBrowser(text, voice, lang, rate, pitch, previewOnly) {
  els.playerEngine.textContent = "Web Speech API";
  state.last = { engine: "browser", voice, text, blob: null, buffer: null, duration: 0 };
  els.downloadBtn.disabled = true;
  els.shareBtn.disabled = false;
  els.playerHint.textContent = "Suara browser tidak bisa direkam/diunduh. Pilih mesin Google atau suara AI-2 untuk unduhan.";

  const chunks = chunkText(text, 180);
  const est = Math.max(1.2, text.length / 14);
  els.playBtn.classList.add("is-playing");

  try {
    for (let i = 0; i < chunks.length; i++) {
      const label = chunks.length > 1 ? `Membacakan ${i + 1}/${chunks.length}` : "Membacakan";
      setProgress(20 + ((i + 0.5) / chunks.length) * 78, label);
      els.playerBadge.textContent = "Memutar";
      els.curTime.textContent = fmtTime((i / chunks.length) * est);
      els.durTime.textContent = fmtTime(est);
      wave.animate(() => clamp(0.3 + Math.random() * 0.25, 0, 1));
      // eslint-disable-next-line no-await-in-loop
      await speakBrowser(chunks[i], { rate, pitch, voice, lang });
    }
    setProgress(100, "Selesai");
  } finally {
    els.playBtn.classList.remove("is-playing");
    wave.stop();
    wave.draw(1);
    els.curTime.textContent = fmtTime(est);
    els.playerBadge.textContent = "Selesai";
    if (state.music.on) stopMusic();
  }
  if (!previewOnly) addHistory(text, voice, "browser", null);
}

async function convertGoogle(text, voice, lang, rate, pitch, previewOnly) {
  els.playerEngine.textContent = "Google Translate TTS";
  const chunks = chunkText(text, 190);
  setProgress(20, "Memecah teks");

  state.last = { engine: "google", voice, text, blob: null, buffer: null, duration: 0, chunks };
  els.downloadBtn.disabled = false;
  els.shareBtn.disabled = false;
  els.playerHint.textContent = "Klik ⬇ Unduh MP3 — byte audio diambil lewat proxy CORS bila server menolak.";

  const controller = playGoogleChunks(
    chunks, lang, rate,
    ({ current, duration, index }) => {
      const base = (index - 1) / chunks.length;
      const inner = Number.isFinite(duration) && duration > 0 ? current / duration : 0;
      setProgress(30 + (base + inner / chunks.length) * 65, "Memutar");
      els.curTime.textContent = fmtTime(current);
      els.durTime.textContent = fmtTime(Number.isFinite(duration) ? duration : 0);
      els.playerBadge.textContent = "Memutar";
    },
    (err) => {
      if (err) {
        toast(`${err.message} Beralih ke suara browser.`, "warn", 6500);
        setProgress(0, "Gagal");
        speakBrowser(text, { rate, pitch, voice, lang }).catch(() => {});
      }
      else {
        setProgress(100, "Selesai");
        els.playerBadge.textContent = "Selesai";
        els.playBtn.classList.remove("is-playing");
        wave.draw(1);
      }
      if (state.music.on) stopMusic();
    },
  );

  stopCurrent = () => controller.abort();
  els.playBtn.classList.add("is-playing");
  els.playBtn.disabled = false;
  wave.animate(() => clamp(0.35 + Math.random() * 0.25, 0, 1));
  setProgress(30, "Memutar");

  if (!previewOnly) addHistory(text, voice, "google", null);
}

function mergeAudioBuffers(buffers, ctx, gapSeconds = 0.22) {
  const channels = Math.max(2, ...buffers.map((b) => b.numberOfChannels));
  const gap = Math.floor(ctx.sampleRate * gapSeconds);
  const total = buffers.reduce((n, b) => n + b.length + gap, 0);
  const out = ctx.createBuffer(channels, total, ctx.sampleRate);
  let offset = 0;
  buffers.forEach((buffer) => {
    for (let c = 0; c < channels; c++) {
      const src = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
      out.getChannelData(c).set(src, offset);
    }
    offset += buffer.length + gap;
  });
  return out;
}

async function convertPuter(text, voice, lang, rate, previewOnly) {
  els.playerEngine.textContent = "Puter AI (neural)";
  const parts = chunkText(text, 900);
  els.playerHint.textContent = "Suara neural butuh login gratis Puter sekali klik. Teks panjang diproses per bagian lalu digabung otomatis.";
  setProgress(20, parts.length > 1 ? `Menyiapkan ${parts.length} bagian` : "Menghubungi mesin neural");

  let raws = [];
  try {
    for (let i = 0; i < parts.length; i++) {
      setProgress(25 + (i / parts.length) * 55, parts.length > 1 ? `Bagian ${i + 1}/${parts.length}` : "Membuat suara");
      // eslint-disable-next-line no-await-in-loop
      raws.push(await synthPuter(parts[i], voice, lang));
    }
  } catch (error) {
    raws = [];
    toast("Neural belum bisa dipakai (login/popup diblokir). Beralih ke mesin Google.", "warn", 6000);
    els.playerEngine.textContent = "Google (fallback)";
    const chunks = chunkText(text, 190);
    const controller = playGoogleChunks(chunks, lang, rate, null, () => {
      els.playerBadge.textContent = "Selesai";
      setProgress(100, "Selesai");
      els.playBtn.classList.remove("is-playing");
      if (state.music.on) stopMusic();
    });
    stopCurrent = () => controller.abort();
    els.playBtn.classList.add("is-playing");
    wave.animate(() => clamp(0.35 + Math.random() * 0.25, 0, 1));
    setProgress(60, "Memutar");
    state.last = { engine: "google", voice, text, blob: null, buffer: null, duration: 0, chunks };
    els.downloadBtn.disabled = false;
    els.shareBtn.disabled = false;
    return;
  }

  setProgress(88, "Menggabungkan audio");
  const ctx = getCtx();
  const decoded = [];
  for (const raw of raws) {
    try {
      // eslint-disable-next-line no-await-in-loop
      decoded.push(await ctx.decodeAudioData(raw.arrayBuffer.slice(0)));
    } catch { /* bagian ini tidak bisa di-decode, dilewati */ }
  }

  let buffer = null;
  let blob;
  let ext;
  let mime;
  if (decoded.length === raws.length && decoded.length > 1) {
    buffer = mergeAudioBuffers(decoded, ctx);
    blob = encodeWav(buffer);
    ext = "wav";
    mime = "audio/wav";
  } else if (raws.length === 1) {
    mime = raws[0].mime || "audio/mpeg";
    blob = new Blob([raws[0].arrayBuffer], { type: mime });
    ext = /wav/.test(mime) ? "wav" : "mp3";
    buffer = decoded[0] || null;
  } else {
    // gabung byte apa adanya bila decode gagal (MP3 masih bisa diputar berurutan)
    mime = raws[0]?.mime || "audio/mpeg";
    blob = new Blob(raws.map((r) => r.arrayBuffer), { type: mime });
    ext = /wav/.test(mime) ? "wav" : "mp3";
    buffer = decoded[0] || null;
  }

  state.last = {
    engine: "puter", voice, text, blob, buffer, mime, ext,
    url: URL.createObjectURL(blob),
    duration: buffer?.duration || 0,
  };

  els.downloadBtn.disabled = false;
  els.shareBtn.disabled = false;
  els.playerBadge.textContent = "Siap diputar";

  if (buffer) {
    await playBuffer(buffer, { rate: 1 });
    els.playerBadge.textContent = "Memutar";
  } else {
    const audio = new Audio(state.last.url);
    audio.volume = state.volume;
    audio.play().catch(() => {});
    stopCurrent = () => { try { audio.pause(); } catch { /* noop */ } };
    els.playBtn.classList.add("is-playing");
    wave.animate(() => clamp(0.35 + Math.random() * 0.25, 0, 1));
  }
  setProgress(100, "Selesai");

  if (!previewOnly) addHistory(text, voice, "puter", state.last.url);
}

/* ---------------------------------------------------------
   12. UNDUHAN (+ mixing musik)
   --------------------------------------------------------- */
async function buildDownloadBlob() {
  const last = state.last;
  if (!last) return null;

  if (last.engine === "google") {
    setProgress(12, "Mengunduh audio");
    const blob = await fetchGoogleMp3(last.chunks, currentLang(), state.rate, (p) => {
      setProgress(12 + p * 0.7, "Mengunduh audio");
    });
    const withMusic = state.music.on && state.music.mix;
    if (!withMusic) { setProgress(100, "Selesai"); return { blob, ext: "mp3" }; }

    // campur musik: butuh decode (mp3 dari proxy sudah same-origin setelah blob)
    const ctx = getCtx();
    const voiceBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const mixed = await mixWithMusic(voiceBuffer);
    setProgress(100, "Selesai");
    return { blob: encodeWav(mixed), ext: "wav" };
  }

  if (last.engine === "puter" && last.blob) {
    const withMusic = state.music.on && state.music.mix;
    if (!withMusic || !last.buffer) return { blob: last.blob, ext: last.ext || "mp3" };
    const mixed = await mixWithMusic(last.buffer);
    return { blob: encodeWav(mixed), ext: "wav" };
  }

  return null;
}

async function mixWithMusic(voiceBuffer) {
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const sr = 44100;
  const pad = 0.45;
  const duration = voiceBuffer.duration + pad;
  const ctx = new Ctx(2, Math.ceil(duration * sr), sr);

  const voice = ctx.createBufferSource();
  voice.buffer = voiceBuffer;
  const vg = ctx.createGain();
  vg.gain.value = 1;
  voice.connect(vg).connect(ctx.destination);
  voice.start(0);

  const musicBuffer = await renderMusicBuffer(state.music.preset);
  const music = ctx.createBufferSource();
  music.buffer = musicBuffer;
  music.loop = true;
  const mg = ctx.createGain();
  mg.gain.value = state.music.volume;
  // fade out di akhir supaya tidak terpotong kasar
  const fadeAt = Math.max(0, duration - 1.2);
  mg.gain.setValueAtTime(state.music.volume, fadeAt);
  mg.gain.linearRampToValueAtTime(0.0001, duration);
  music.connect(mg).connect(ctx.destination);
  music.start(0);

  return ctx.startRendering();
}

async function onDownload() {
  if (!state.last) { toast("Belum ada audio. Konversi dulu, ya.", "warn"); return; }
  if (state.last.engine === "browser") {
    toast("Suara browser tidak bisa direkam. Pilih suara AI-2 (neural) atau mesin Google untuk unduhan.", "warn", 6000);
    return;
  }
  els.downloadBtn.disabled = true;
  const original = els.downloadBtn.textContent;
  els.downloadBtn.textContent = "Menyiapkan…";
  try {
    const out = await buildDownloadBlob();
    if (!out) throw new Error("Tidak ada audio untuk diunduh.");
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    downloadBlob(out.blob, `ttsfree-${state.last.voice.name.toLowerCase()}-${stamp}.${out.ext}`);
    toast(`Berkas ${out.ext.toUpperCase()} siap di folder unduhanmu.`, "ok");
  } catch (error) {
    toast(error?.message || "Unduhan gagal.", "error", 6500);
  } finally {
    els.downloadBtn.disabled = false;
    els.downloadBtn.textContent = original;
    setProgress(100, "Selesai");
  }
}

/* ---------------------------------------------------------
   13. RIWAYAT
   --------------------------------------------------------- */
function addHistory(text, voice, engine, url) {
  const item = {
    id: Date.now() + Math.random().toString(16).slice(2, 6),
    text, voice: voice.name, voiceId: voice.id, engine, url,
    time: Date.now(),
  };
  state.history.unshift(item);
  state.history = state.history.slice(0, 12);
  store.set("ttsfree.history", state.history.map(({ id, text, voice, engine, time }) => ({ id, text, voice, engine, time })));
  renderHistory();
}

function renderHistory() {
  if (!els.historyList) return;
  if (!state.history.length) {
    els.historyList.innerHTML = '<li class="empty">Belum ada riwayat.</li>';
    return;
  }
  els.historyList.innerHTML = state.history.map((h) => `
    <li class="hitem">
      <button type="button" data-hplay="${h.id}" aria-label="Putar ulang">▶</button>
      <span class="htxt" title="${escapeHtml(h.text)}">${escapeHtml(h.text.slice(0, 48))}</span>
      <span class="hmeta">${escapeHtml(h.voice)}</span>
    </li>
  `).join("");
}

/* ---------------------------------------------------------
   14. BINDING UI
   --------------------------------------------------------- */
function bind() {
  /* nav & header */
  const onScroll = () => $("#siteHeader").classList.toggle("is-stuck", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  els.burger.addEventListener("click", () => {
    const open = els.nav.classList.toggle("is-open");
    els.burger.setAttribute("aria-expanded", String(open));
  });
  els.nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      els.nav.classList.remove("is-open");
      els.burger.setAttribute("aria-expanded", "false");
    }
  });

  /* teks */
  els.text.addEventListener("input", updateCounter);

  /* bahasa */
  els.lang.addEventListener("change", () => {
    state.langId = els.lang.value;
    state.voiceKey = "neural-male";
    renderVoices();
    renderCatalog();
    toast(`Bahasa diganti ke ${currentLang().label.split(" - ")[0]}.`, "ok", 2200);
  });

  /* pilih suara */
  els.voiceGrid.addEventListener("click", (e) => {
    const preview = e.target.closest("[data-preview]");
    if (preview) {
      e.stopPropagation();
      state.voiceKey = preview.dataset.preview;
      renderVoices();
      convert({ previewOnly: true });
      return;
    }
    const card = e.target.closest("[data-voice]");
    if (!card) return;
    state.voiceKey = card.dataset.voice;
    renderVoices();
    const v = currentVoice();
    if (v.locked) toast("Suara Wavenet Premium — dikunci, sama seperti di situs aslinya.", "warn");
  });

  /* katalog */
  els.catalog.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preview]");
    if (!btn) return;
    state.voiceKey = btn.dataset.preview;
    renderVoices();
    convert({ previewOnly: true });
    document.getElementById("try-now").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* mesin standar */
  els.engineSeg.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-engine]");
    if (!btn) return;
    state.engine = btn.dataset.engine;
    store.set("ttsfree.engine", state.engine);
    syncEngineUI();
    toast(`Mesin AI-1: ${state.engine === "google" ? "Google Translate TTS" : "Browser (Web Speech)"}.`, "ok", 2400);
  });

  /* slider */
  els.rate.addEventListener("change", () => { state.rate = Number(els.rate.value); store.set("ttsfree.rate", state.rate); });
  els.pitch.addEventListener("change", () => { state.pitch = Number(els.pitch.value); store.set("ttsfree.pitch", state.pitch); });
  els.volume.addEventListener("input", () => {
    state.volume = Number(els.volume.value) / 100;
    els.volumeVal.textContent = `${els.volume.value}%`;
  });
  els.volume.addEventListener("change", () => store.set("ttsfree.volume", state.volume));

  /* musik */
  els.musicToggle.addEventListener("click", () => {
    const open = els.musicBody.hidden;
    els.musicBody.hidden = !open;
    els.musicToggle.setAttribute("aria-expanded", String(open));
  });
  $$(".mtab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".mtab").forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      $$(".mpanel").forEach((p) => { p.hidden = p.dataset.mpanel !== tab.dataset.mtab; });
    });
  });
  els.tracks.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-track]");
    if (!btn) return;
    state.music.preset = btn.dataset.track;
    renderTracks();
    setMusicOn(true);
    await startMusic().catch(() => toast("Musik tidak bisa diputar di browser ini.", "error"));
    toast(`Musik latar: ${MUSIC_PRESETS[state.music.preset].label}`, "ok", 2200);
  });
  els.musicPreviewBtn.addEventListener("click", async () => {
    state.music.url = els.trackId.value.trim();
    if (!state.music.url) { toast("Tempel dulu URL Soundcloud-nya.", "warn"); return; }
    setMusicOn(true);
    await startMusic().catch(() => {});
    toast("URL dipakai sebagai label; audio tetap dari library bebas royalti.", "ok", 4200);
  });
  els.musicVol.addEventListener("input", () => {
    state.music.volume = Number(els.musicVol.value) / 100;
    els.musicVolVal.textContent = `${els.musicVol.value}%`;
    if (musicGain) musicGain.gain.value = state.music.volume;
  });
  els.mixDownload.addEventListener("change", () => { state.music.mix = els.mixDownload.checked; });

  /* tombol utama */
  els.convert.addEventListener("click", () => convert());
  els.demoBtn.addEventListener("click", () => {
    if (!els.text.value.trim()) {
      els.text.value = currentLang().demo;
      updateCounter();
    }
    document.getElementById("try-now").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => convert({ previewOnly: true }), 320);
  });

  /* pemutar */
  els.playBtn.addEventListener("click", () => {
    if (bufferPlay) {
      stopBufferPlay();
      wave.draw(0);
      els.curTime.textContent = "0:00";
      return;
    }
    if (state.last?.buffer) {
      playBuffer(state.last.buffer, { rate: state.last.engine === "puter" ? 1 : state.rate });
      els.playerBadge.textContent = "Memutar";
      setProgress(100, "Memutar");
      return;
    }
    if (state.last?.url) {
      const audio = new Audio(state.last.url);
      audio.volume = state.volume;
      audio.play().catch(() => toast("Audio tidak bisa diputar ulang.", "warn"));
      els.playBtn.classList.add("is-playing");
      stopCurrent = () => audio.pause();
      wave.animate(() => 0.4);
      return;
    }
    if (state.last?.chunks) {
      convert();
      return;
    }
    toast("Belum ada audio. Klik Konversi sekarang dulu.", "warn");
  });

  els.downloadBtn.addEventListener("click", onDownload);
  els.shareBtn.addEventListener("click", async () => {
    const text = els.text.value.trim() || currentLang().demo;
    try {
      if (navigator.share) {
        await navigator.share({ title: "TTSFree.clone", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast("Teks disalin ke clipboard.", "ok");
      }
    } catch { /* dibatalkan pengguna */ }
  });

  /* riwayat */
  els.clearHistory.addEventListener("click", () => {
    state.history = [];
    store.set("ttsfree.history", []);
    renderHistory();
    toast("Riwayat dihapus.", "ok", 2000);
  });
  els.historyList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-hplay]");
    if (!btn) return;
    const item = state.history.find((h) => h.id === btn.dataset.hplay);
    if (!item) return;
    els.text.value = item.text;
    updateCounter();
    if (state.last?.url && item.url === state.last.url) {
      const audio = new Audio(state.last.url);
      audio.volume = state.volume;
      audio.play().catch(() => {});
    } else {
      convert();
    }
  });

  /* login modal */
  const openLogin = () => { els.loginModal.hidden = false; setTimeout(() => els.loginName?.focus(), 60); };
  els.loginBtn.addEventListener("click", openLogin);

  els.pasteBtn.addEventListener("click", async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) { toast("Clipboard kosong.", "warn"); return; }
      els.text.value = clip;
      updateCounter();
      toast(`${clip.length.toLocaleString("id-ID")} karakter ditempel.`, "ok", 2400);
    } catch {
      toast("Browser tidak memberi izin baca clipboard. Tempel manual dengan Ctrl/Cmd + V.", "warn", 5000);
      els.text.focus();
    }
  });

  els.clearText.addEventListener("click", () => {
    els.text.value = "";
    updateCounter();
    els.text.focus();
  });
  els.loginClose.addEventListener("click", () => { els.loginModal.hidden = true; });
  els.loginModal.addEventListener("click", (e) => { if (e.target === els.loginModal) els.loginModal.hidden = true; });
  els.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = els.loginName.value.trim() || "Sahabat";
    state.loggedIn = true;
    store.set("ttsfree.login", { name });
    els.loginStatus.textContent = `Halo ${name}! Semua fitur & batas karakter sudah terbuka sejak awal.`;
    els.loginBtn.textContent = name;
    setTimeout(() => { els.loginModal.hidden = true; }, 900);
    toast(`Halo ${name}! Tidak ada batas karakter di sini.`, "ok");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") els.loginModal.hidden = true;
  });

  window.addEventListener("resize", () => wave.draw(0));
}

/* ---------------------------------------------------------
   15. RESTORE & INIT
   --------------------------------------------------------- */
function restore() {
  state.engine = store.get("ttsfree.engine", "browser");
  state.rate = store.get("ttsfree.rate", 1);
  state.pitch = store.get("ttsfree.pitch", 1);
  state.volume = store.get("ttsfree.volume", 1);
  const login = store.get("ttsfree.login", null);
  if (login?.name) {
    state.loggedIn = true;
    els.loginBtn.textContent = login.name;
  }
  state.history = (store.get("ttsfree.history", []) || []).map((h) => ({ ...h }));

  els.rate.value = String(state.rate);
  els.pitch.value = String(state.pitch);
  els.volume.value = String(Math.round(state.volume * 100));
  els.volumeVal.textContent = `${Math.round(state.volume * 100)}%`;
  els.musicVol.value = String(Math.round(state.music.volume * 100));
  els.musicVolVal.textContent = `${Math.round(state.music.volume * 100)}%`;
}

function cacheEls() {
  els.lang = $("#lang");
  els.text = $("#text");
  els.count = $("#count");
  els.counter = $(".counter");
  els.pasteBtn = $("#pasteBtn");
  els.clearText = $("#clearText");
  els.voiceGrid = $("#voiceGrid");
  els.catalog = $("#catalog");
  els.engineSeg = $("#engineSeg");
  els.engineHint = $("#engineHint");
  els.rate = $("#rate");
  els.pitch = $("#pitch");
  els.volume = $("#volume");
  els.volumeVal = $("#volumeVal");
  els.musicToggle = $("#musicToggle");
  els.musicBody = $("#musicBody");
  els.tracks = $("#tracks");
  els.musicVol = $("#musicVol");
  els.musicVolVal = $("#musicVolVal");
  els.mixDownload = $("#mixDownload");
  els.trackId = $("#trackId");
  els.musicPreviewBtn = $("#musicPreviewBtn");
  els.convert = $("#convert");
  els.convertLabel = $("#convertLabel");
  els.bar = $("#bar");
  els.progressLabel = $("#progressLabel");
  els.playBtn = $("#playBtn");
  els.wave = $("#wave");
  els.curTime = $("#curTime");
  els.durTime = $("#durTime");
  els.playerBadge = $("#playerBadge");
  els.playerEngine = $("#playerEngine");
  els.playerTitle = $("#playerTitle");
  els.playerMeta = $("#playerMeta");
  els.playerHint = $("#playerHint");
  els.downloadBtn = $("#downloadBtn");
  els.shareBtn = $("#shareBtn");
  els.historyList = $("#historyList");
  els.clearHistory = $("#clearHistory");
  els.demoBtn = $("#demoBtn");
  els.burger = $("#burger");
  els.nav = $("#mainNav");
  els.loginBtn = $("#loginBtn");
  els.loginModal = $("#loginModal");
  els.loginClose = $("#loginClose");
  els.loginForm = $("#loginForm");
  els.loginName = $("#loginName");
  els.loginStatus = $("#loginStatus");
}

function setMusicOn(on) {
  state.music.on = on;
  const sw = $(".switch", els.musicToggle);
  if (sw) sw.dataset.on = String(on);
  if (!on) stopMusic();
}

function init() {
  cacheEls();
  renderLangs();
  renderVoices();
  renderCatalog();
  renderTracks();
  restore();
  bind();
  updateCounter();
  renderHistory();
  wave.seed("TTSFree clone text to speech bahasa indonesia");
  wave.draw(0);
  $("#year").textContent = String(new Date().getFullYear());

  if (!els.text.value) {
    els.text.value = "Selamat datang di TTSFree.clone! Tulis apa saja di sini, pilih suara favoritmu, lalu unduh hasilnya sebagai MP3.";
    updateCounter();
  }
  setProgress(0, "Siap dikonversi");

  if (!("speechSynthesis" in window)) {
    state.engine = "google";
    toast("Browser ini tidak punya Web Speech API — mesin Google dipakai otomatis.", "warn", 5000);
  }
  syncEngineUI();
}

/* toggle musik: klik pada switch di dalam tombol accordion */
document.addEventListener("click", (e) => {
  if (e.target.closest("#musicToggle") && e.target.closest(".switch")) {
    e.preventDefault();
    e.stopPropagation();
    setMusicOn(!state.music.on);
    els.musicBody.hidden = !state.music.on;
    els.musicToggle.setAttribute("aria-expanded", String(state.music.on));
    if (state.music.on) {
      startMusic().catch(() => toast("AudioContext diblokir browser. Klik sekali di halaman lalu coba lagi.", "error"));
    }
  }
}, true);

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
