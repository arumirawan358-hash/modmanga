/* =========================================================
   api.js — lapisan penyedia AI (semua tanpa API key developer)
   1. Pollinations Classic : gratis, tanpa login, ada jeda per IP
   2. Puter.js             : akun gratis pengguna (User-Pays)
   3. API sendiri          : endpoint OpenAI-compatible (opsional)
   ========================================================= */

import { POLLINATIONS, PUTER_SDK, PUTER_FALLBACK_MODELS } from "./config.js";
import { loadScript, store } from "./util.js";

export class AiError extends Error {
  constructor(message, { code = "error", provider = "", retryAfter = 0, cause = null } = {}) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.provider = provider;
    this.retryAfter = retryAfter;
    this.cause = cause;
  }
}

function parseRetryAfter(res, fallbackMs) {
  const header = res?.headers?.get?.("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 600_000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(1000, date - Date.now());
  }
  return fallbackMs;
}

function extractCompletion(raw = "") {
  const text = String(raw).trim();
  if (!text) return "";
  try {
    const json = JSON.parse(text);
    const choice = json?.choices?.[0];
    return (
      choice?.message?.content ??
      choice?.delta?.content ??
      choice?.text ??
      json?.message?.content ??
      json?.text ??
      (typeof json === "string" ? json : "")
    ) || "";
  } catch {
    return text;
  }
}

async function* readSse(res, signal) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          const data = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta =
              json?.choices?.[0]?.delta?.content ??
              json?.choices?.[0]?.message?.content ??
              json?.choices?.[0]?.text ??
              json?.delta ??
              "";
            if (delta) yield delta;
          } catch {
            /* keep-alive atau potongan non-JSON: abaikan */
          }
        }
      }
    }
    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        const data = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
        if (!data || data === "[DONE]") continue;
        const text = extractCompletion(data);
        if (text && text !== "[DONE]") yield text;
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}

/* =========================================================
   POLLINATIONS
   ========================================================= */
function pollinationsMessages(messages, system) {
  const list = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 6000) }));
  if (system) list.unshift({ role: "system", content: system });
  return list;
}

async function pollinationsGet({ messages, system, signal }) {
  const lastUser = [...messages].reverse().find((m) => m?.role === "user")?.content || "";
  const params = new URLSearchParams({ model: "openai" });
  if (system) params.set("system", system.slice(0, 3000));

  const url = `${POLLINATIONS.textBase}/${encodeURIComponent(String(lastUser).slice(0, 900))}?${params}`;
  const res = await fetch(url, { signal, headers: { Accept: "text/plain" } });

  if (res.status === 402 || res.status === 429) {
    throw new AiError("Kuota gratis Pollinations sedang jeda. Tunggu sebentar atau pakai mesin lain.", {
      code: "rate_limit",
      provider: "pollinations",
      retryAfter: parseRetryAfter(res, POLLINATIONS.textCooldown),
    });
  }
  if (!res.ok) {
    throw new AiError(`Pollinations menolak permintaan (HTTP ${res.status}).`, {
      code: "http",
      provider: "pollinations",
    });
  }
  const text = (await res.text()).trim();
  if (!text) {
    throw new AiError("Pollinations mengirim jawaban kosong. Coba lagi.", {
      code: "empty",
      provider: "pollinations",
    });
  }
  return text;
}

/**
 * Stream jawaban dari Pollinations Classic (tanpa login).
 * @returns {AsyncGenerator<string>}
 */
export async function* pollinationsChat({ messages, system = "", signal } = {}) {
  const payload = {
    model: "openai",
    messages: pollinationsMessages(messages, system),
    stream: true,
    referrer: POLLINATIONS.referral,
  };

  let res;
  try {
    res = await fetch(`${POLLINATIONS.textBase}/openai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new AiError("Tidak bisa menghubungi Pollinations. Periksa koneksi internetmu.", {
      code: "network",
      provider: "pollinations",
      cause: error,
    });
  }

  if (res.status === 402 || res.status === 429) {
    throw new AiError("Kuota gratis Pollinations sedang jeda. Tunggu hitungan mundur, atau pindah ke Hanzal AI.", {
      code: "rate_limit",
      provider: "pollinations",
      retryAfter: parseRetryAfter(res, POLLINATIONS.textCooldown),
    });
  }

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    // endpoint OpenAI-compatible bisa ditolak; coba endpoint GET sederhana
    try {
      const text = await pollinationsGet({ messages, system, signal });
      yield text;
      return;
    } catch (fallbackError) {
      if (fallbackError instanceof AiError) throw fallbackError;
      throw new AiError(`Pollinations sedang bermasalah (HTTP ${res.status}). Coba mesin lain.`, {
        code: "http",
        provider: "pollinations",
        cause: fallbackError,
      });
    }
  }

  if (!res.body || !contentType.includes("event-stream")) {
    const text = extractCompletion(await res.text());
    if (!text) {
      throw new AiError("Pollinations mengirim jawaban kosong. Coba lagi.", {
        code: "empty",
        provider: "pollinations",
      });
    }
    yield text;
    return;
  }

  let received = false;
  for await (const delta of readSse(res, signal)) {
    received = true;
    yield delta;
  }

  if (!received) {
    const text = await pollinationsGet({ messages, system, signal });
    yield text;
  }
}

export function buildPollinationsImageUrl({ prompt, width, height, seed, safe = false }) {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: "flux",
  });
  if (safe) params.set("safe", "true");
  return `${POLLINATIONS.imageBase}${encodeURIComponent(prompt)}?${params.toString()}`;
}

/* Jeda yang bisa dibatalkan — dipakai untuk retry otomatis */
function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

/**
 * Ambil gambar dari Pollinations. Kalau penyedia membatasi (429/402) atau
 * jaringan tersendat, permintaan diulang otomatis di latar belakang — pengguna
 * tidak perlu menunggu hitungan detik lalu klik ulang.
 */
export async function fetchPollinationsImage(url, { signal, attempts = 4, onRetry } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    // sertakan penanda percobaan agar CDN tidak mengembalikan respons 429 yang tersimpan
    const attemptUrl = attempt === 1 ? url : `${url}&_r=${attempt}`;
    let res;

    try {
      res = await fetch(attemptUrl, { signal, headers: { Accept: "image/*" } });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      lastError = new AiError("Koneksi ke Pollinations terputus.", {
        code: "network",
        provider: "pollinations",
        cause: error,
      });
      if (attempt >= attempts) throw lastError;
      const waitMs = Math.min(900 * attempt, 3000);
      onRetry?.({ attempt, attempts, waitMs, reason: "network" });
      await pause(waitMs, signal);
      continue;
    }

    if (res.status === 402 || res.status === 429) {
      const suggested = parseRetryAfter(res, 1200 * attempt);
      const waitMs = Math.min(suggested, 4500); // jangan pernah menyuruh menunggu 45 detik
      lastError = new AiError(
        "Kuota gambar gratis sedang ramai. Sudah dicoba otomatis beberapa kali — coba lagi atau pakai Hanzal AI.",
        { code: "rate_limit", provider: "pollinations", retryAfter: waitMs },
      );
      if (attempt >= attempts) throw lastError;
      onRetry?.({ attempt, attempts, waitMs, reason: "rate_limit" });
      await pause(waitMs, signal);
      continue;
    }

    if (!res.ok) {
      if (res.status >= 500 && attempt < attempts) {
        const waitMs = Math.min(800 * attempt, 2500);
        onRetry?.({ attempt, attempts, waitMs, reason: `http_${res.status}` });
        await pause(waitMs, signal);
        continue;
      }
      throw new AiError(`Pollinations menolak permintaan gambar (HTTP ${res.status}).`, {
        code: "http",
        provider: "pollinations",
      });
    }

    const type = res.headers.get("content-type") || "";
    if (type && !type.startsWith("image/")) {
      const raw = await res.text().catch(() => "");
      const notice = extractCompletion(raw).slice(0, 220);
      throw new AiError(
        notice || "Prompt ini ditolak oleh penyedia gambar. Ubah sedikit kata-katanya, lalu coba lagi.",
        { code: "refused", provider: "pollinations" },
      );
    }

    const blob = await res.blob();
    if (!blob.size) {
      lastError = new AiError("Gambar kosong diterima. Coba lagi.", { code: "empty", provider: "pollinations" });
      if (attempt >= attempts) throw lastError;
      onRetry?.({ attempt, attempts, waitMs: 800, reason: "empty" });
      await pause(800, signal);
      continue;
    }
    return blob;
  }

  throw lastError || new AiError("Gambar gagal diambil.", { code: "error", provider: "pollinations" });
}

/* =========================================================
   PUTER.JS
   ========================================================= */
let puterLoading = null;
let signedInCache = null;
let modelsCache = null;

export function puterGlobal() {
  return typeof window !== "undefined" ? window.puter : undefined;
}

export async function ensurePuter() {
  if (puterGlobal()) return puterGlobal();
  if (!puterLoading) {
    puterLoading = loadScript(PUTER_SDK)
      .then(() => {
        if (!puterGlobal()) throw new Error("Puter.js tidak tersedia setelah dimuat.");
        return puterGlobal();
      })
      .catch((error) => {
        puterLoading = null;
        throw new AiError(
          "Gagal memuat Puter.js. Mungkin diblokir pemblokir iklan atau koneksi sedang bermasalah.",
          { code: "sdk", provider: "puter", cause: error },
        );
      });
  }
  return puterLoading;
}

export async function isPuterSignedIn({ force = false } = {}) {
  if (signedInCache !== null && !force) return signedInCache;
  try {
    const puter = await ensurePuter();
    const auth = puter?.auth;
    if (typeof auth?.isSignedIn === "function") {
      signedInCache = Boolean(await auth.isSignedIn());
    } else {
      const user = await auth?.getUser?.();
      signedInCache = Boolean(user?.username);
    }
  } catch {
    signedInCache = false;
  }
  return signedInCache;
}

export async function connectPuter() {
  const puter = await ensurePuter();
  const signIn = puter?.auth?.signIn;
  if (typeof signIn !== "function") {
    throw new AiError("Fungsi login Puter tidak tersedia.", { code: "sdk", provider: "puter" });
  }
  try {
    const result = await signIn();
    signedInCache = true;
    modelsCache = null;
    const user = result?.username ? result : await puter.auth.getUser().catch(() => null);
    return { username: user?.username || "pengguna puter", raw: user };
  } catch (error) {
    signedInCache = null;
    throw new AiError("Login Puter dibatalkan atau gagal. Coba lagi ya.", {
      code: "auth",
      provider: "puter",
      cause: error,
    });
  }
}

export async function disconnectPuter() {
  try {
    const puter = await ensurePuter();
    await puter.auth?.signOut?.();
  } catch {
    /* abaikan */
  }
  signedInCache = false;
  modelsCache = null;
}

export async function getPuterUser() {
  try {
    const puter = await ensurePuter();
    const user = await puter.auth?.getUser?.();
    return user || null;
  } catch {
    return null;
  }
}

export async function listPuterModels() {
  if (modelsCache) return modelsCache;
  try {
    const puter = await ensurePuter();
    const raw = await puter.ai?.listModels?.();
    const list = Array.isArray(raw) ? raw : raw?.models || [];
    const normalized = list
      .map((entry) => {
        const id = typeof entry === "string" ? entry : entry?.id || entry?.model || entry?.name;
        if (!id) return null;
        return { id, label: typeof entry === "object" ? entry.name || entry.label || id : id };
      })
      .filter(Boolean);
    if (normalized.length) {
      const seen = new Set();
      modelsCache = normalized.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));
      return modelsCache;
    }
  } catch {
    /* pakai daftar cadangan */
  }
  return PUTER_FALLBACK_MODELS;
}

function mapPuterError(error) {
  if (error instanceof AiError) return error;
  const code = error?.errorCode || error?.code || error?.error?.code || "";
  const message = error?.message || error?.error?.message || String(error || "Kesalahan Hanzal AI");
  const haystack = `${code} ${message}`.toLowerCase();

  if (/auth|sign ?in|login|not_?logged|permission|401|403/.test(haystack)) {
    return new AiError("Perlu login Puter dulu untuk memakai Hanzal AI. Buka Pengaturan → Login ke Puter.", {
      code: "auth",
      provider: "puter",
      cause: error,
    });
  }
  if (/insufficient|fund|credit|quota|balance|402/.test(haystack)) {
    return new AiError("Saldo/kuota akun Puter tidak cukup untuk permintaan ini. Coba model yang lebih murah.", {
      code: "quota",
      provider: "puter",
      cause: error,
    });
  }
  if (/test_mode|moderation|flagged/.test(haystack)) {
    return new AiError("Permintaan ditolak filter konten. Ubah prompt-nya, lalu coba lagi.", {
      code: "refused",
      provider: "puter",
      cause: error,
    });
  }
  if (/network|fetch|failed to fetch|timeout/.test(haystack)) {
    return new AiError("Koneksi ke Hanzal AI (Puter) gagal. Periksa internetmu lalu coba lagi.", {
      code: "network",
      provider: "puter",
      cause: error,
    });
  }
  return new AiError(message.slice(0, 240), { code: "error", provider: "puter", cause: error });
}

export function puterTextOf(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  if (typeof response.text === "string") return response.text;
  const content = response?.message?.content ?? response?.content ?? response?.parts;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("");
  }
  return "";
}

export async function* puterChat({ messages, system = "", model, signal } = {}) {
  const puter = await ensurePuter();
  const signedIn = await isPuterSignedIn();
  if (!signedIn) {
    throw new AiError("Hanzal AI butuh login Puter (gratis). Klik “Login ke Puter”, lalu coba lagi.", {
      code: "auth",
      provider: "puter",
    });
  }

  const list = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content) }));
  if (system) list.unshift({ role: "system", content: system });

  const options = { model: model || undefined, stream: true };

  let response;
  try {
    response = await puter.ai.chat(list, options);
  } catch (error) {
    throw mapPuterError(error);
  }

  if (response && typeof response[Symbol.asyncIterator] === "function") {
    try {
      for await (const part of response) {
        if (signal?.aborted) break;
        const text = puterTextOf(part);
        if (text) yield text;
      }
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      throw mapPuterError(error);
    }
    return;
  }

  const text = puterTextOf(response);
  if (!text) throw new AiError("Hanzal AI mengirim jawaban kosong. Coba model lain.", { code: "empty", provider: "puter" });
  yield text;
}

export async function puterImage({ prompt, model, aspectRatio, signal } = {}) {
  const puter = await ensurePuter();
  const signedIn = await isPuterSignedIn();
  if (!signedIn) {
    throw new AiError("Hanzal AI butuh login Puter (gratis). Klik “Login ke Puter”, lalu coba lagi.", {
      code: "auth",
      provider: "puter",
    });
  }

  const options = {};
  if (model) options.model = model;
  if (aspectRatio) options.aspect_ratio = aspectRatio;

  let image;
  try {
    image = await puter.ai.txt2img(prompt, options);
  } catch (error) {
    throw mapPuterError(error);
  }

  const src = typeof image === "string" ? image : image?.src;
  if (!src) throw new AiError("Hanzal AI tidak mengembalikan gambar.", { code: "empty", provider: "puter" });

  let res;
  try {
    res = await fetch(src, { signal });
  } catch {
    // URL hasil bisa saja menolak CORS; tetap tampilkan lewat <img> langsung.
    return { remoteUrl: src };
  }
  if (!res.ok) return { remoteUrl: src };
  return res.blob();
}

export async function puterSpeech({ text, provider, voice, model, instructions, language, signal } = {}) {
  const puter = await ensurePuter();
  const signedIn = await isPuterSignedIn();
  if (!signedIn) {
    throw new AiError("Hanzal AI butuh login Puter (gratis). Klik “Login ke Puter”, lalu coba lagi.", {
      code: "auth",
      provider: "puter",
    });
  }

  const options = {};
  if (provider) options.provider = provider;
  if (voice) options.voice = voice;
  if (model) options.model = model;
  if (instructions) options.instructions = instructions;
  if (language) options.language = language;

  try {
    const audio = await puter.ai.txt2speech(text, options);
    if (!audio) throw new Error("Audio kosong");
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return audio;
  } catch (error) {
    throw mapPuterError(error);
  }
}

/* =========================================================
   API SENDIRI (OpenAI-compatible)
   ========================================================= */
export function getCustomConfig() {
  const prefs = store.get("prefs", {}) || {};
  return prefs.custom || { baseUrl: "", apiKey: "", model: "" };
}

export function customReady(custom = getCustomConfig()) {
  return Boolean(custom?.baseUrl && custom?.model);
}

function customEndpoint(baseUrl) {
  const base = String(baseUrl).trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(base)) return base;
  return `${base}/chat/completions`;
}

export async function* customChat({ messages, system = "", custom = getCustomConfig(), signal } = {}) {
  const list = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content) }));
  if (system) list.unshift({ role: "system", content: system });

  let res;
  try {
    res = await fetch(customEndpoint(custom.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(custom.apiKey ? { Authorization: `Bearer ${custom.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: custom.model, messages: list, stream: true }),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new AiError("Tidak bisa menghubungi API milikmu. Periksa Base URL dan koneksi.", {
      code: "network",
      provider: "custom",
      cause: error,
    });
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new AiError(`API milikmu menolak permintaan (HTTP ${res.status}). ${extractCompletion(raw).slice(0, 160)}`, {
      code: "http",
      provider: "custom",
    });
  }

  const type = res.headers.get("content-type") || "";
  if (!res.body || !type.includes("event-stream")) {
    const text = extractCompletion(await res.text());
    if (!text) throw new AiError("API milikmu mengirim jawaban kosong.", { code: "empty", provider: "custom" });
    yield text;
    return;
  }

  for await (const delta of readSse(res, signal)) yield delta;
}

export async function testCustom(custom) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(customEndpoint(custom.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(custom.apiKey ? { Authorization: `Bearer ${custom.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: custom.model,
        messages: [{ role: "user", content: "Balas dengan satu kata: siap" }],
        max_tokens: 12,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${extractCompletion(raw).slice(0, 140)}`);
    }
    const text = extractCompletion(await res.text());
    return text || "(tersambung, balasan kosong)";
  } finally {
    clearTimeout(timer);
  }
}
