/* =========================================================
   chat.js — layar Chat AI
   ========================================================= */

import {
  $, uid, renderMarkdown, escapeHtml, toast, copyText, store,
  cooldown, timeLabel, autoGrow,
} from "./util.js";
import { PERSONAS, SUGGESTIONS, POLLINATIONS } from "./config.js";
import { getPrefs, setPrefs, onPrefs } from "./prefs.js";
import {
  pollinationsChat, puterChat, customChat, customReady, getCustomConfig,
  listPuterModels, connectPuter, AiError,
} from "./api.js";
import { speakQuick } from "./tts.js";

const CHAT_KEY = "chats";
const MAX_CONVS = 20;
const MAX_MSGS = 60;
const MAX_CONTENT = 4000;
const ENGINE_LABEL = { pollinations: "Pollinations", puter: "Puter", custom: "API" };

const state = { convs: [], activeId: null };
let els = {};
let generating = false;
let controller = null;
let stream = null;
let ticker = null;
let modelsRequested = false;

/* ---------------- data ---------------- */
function load() {
  const saved = store.get(CHAT_KEY, null);
  if (saved && Array.isArray(saved.convs)) {
    state.convs = saved.convs.filter((conv) => conv && Array.isArray(conv.messages));
    state.activeId = saved.activeId || null;
  }
  if (!state.convs.some((conv) => conv.id === state.activeId)) state.activeId = state.convs[0]?.id || null;
}

function trimConv(conv) {
  const messages = conv.messages
    .filter((msg) => {
      if (msg.role === "assistant" && !msg.content?.trim() && !msg.error) return false;
      return true;
    })
    .slice(-MAX_MSGS)
    .map(({ streaming, ...rest }) => ({
      ...rest,
      content: String(rest.content || "").slice(0, MAX_CONTENT),
    }));
  return { ...conv, messages, streaming: undefined, title: String(conv.title || "").slice(0, 90) };
}

function save() {
  state.convs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  state.convs = state.convs.slice(0, MAX_CONVS);
  const ok = store.set(CHAT_KEY, { convs: state.convs.map(trimConv), activeId: state.activeId });
  if (!ok && !save.warned) {
    save.warned = true;
    toast("Penyimpanan browser penuh. Hapus beberapa percakapan lama agar riwayat tetap tersimpan.", { type: "warn", timeout: 7000 });
  }
  return ok;
}

function getActive() {
  return state.convs.find((conv) => conv.id === state.activeId) || null;
}

function ensureConversation() {
  let conv = getActive();
  if (!conv) {
    conv = {
      id: uid("c"),
      title: "Percakapan baru",
      persona: getPrefs().persona,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.convs.unshift(conv);
    state.activeId = conv.id;
  }
  return conv;
}

function titleFrom(text) {
  const clean = String(text).replace(/[#*`>_~]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > 46 ? `${clean.slice(0, 46)}…` : clean || "Percakapan baru";
}

/* ---------------- render ---------------- */
export function initChat() {
  els = {
    convList: $("#convList"),
    messages: $("#messages"),
    empty: $("#chatEmpty"),
    scroll: $("#chatScroll"),
    input: $("#chatInput"),
    form: $("#composer"),
    send: $("#sendBtn"),
    stop: $("#stopBtn"),
    hint: $("#chatHint"),
    engineSel: $("#chatEngine"),
    modelWrap: $("#chatModelWrap"),
    modelSel: $("#chatModel"),
    personaSel: $("#chatPersona"),
    cooldown: $("#chatCooldown"),
    cooldownVal: $("#chatCooldownValue"),
    scrollBottom: $("#scrollBottom"),
    suggestionChips: $("#suggestionChips"),
    clearBtn: $("#clearChatBtn"),
  };

  load();
  renderSuggestions();
  renderPersonas();
  bind();
  syncEngineUI();
  renderAll();
  ticker = setInterval(updateCooldown, 500);

  onPrefs(() => {
    if (els.engineSel && els.engineSel.value !== getPrefs().chatEngine) syncEngineUI();
    updateCooldown();
    updateHint();
  });
}

function renderSuggestions() {
  if (!els.suggestionChips) return;
  els.suggestionChips.innerHTML = SUGGESTIONS.map(
    (item) => `<button type="button" class="chip" data-prompt="${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</button>`,
  ).join("");
}

function renderPersonas() {
  if (!els.personaSel) return;
  els.personaSel.innerHTML = PERSONAS.map(
    (persona) => `<option value="${persona.id}">${escapeHtml(persona.label)}</option>`,
  ).join("");
  els.personaSel.value = getPrefs().persona;
}

function renderAll() {
  renderConversations();
  renderMessages();
  updateHint();
  updateCooldown();
  renderSendState();
}

function renderConversations() {
  if (!els.convList) return;
  if (!state.convs.length) {
    els.convList.innerHTML = '<p class="conv-empty">Belum ada percakapan. Mulai dari kotak di bawah.</p>';
    return;
  }
  els.convList.innerHTML = state.convs
    .map((conv) => {
      const active = conv.id === state.activeId;
      return `<div class="conv-item${active ? " is-active" : ""}" data-cid="${conv.id}" role="button" tabindex="0" aria-current="${active}">
        <span class="conv-title">${escapeHtml(conv.title || "Percakapan baru")}</span>
        <button class="conv-del" data-del="${conv.id}" type="button" title="Hapus percakapan" aria-label="Hapus ${escapeHtml(conv.title || "percakapan")}">
          <svg class="ico" aria-hidden="true"><use href="#i-trash"></use></svg>
        </button>
      </div>`;
    })
    .join("");
}

function messageActions(msg) {
  if (msg.role !== "assistant") {
    return `<button type="button" data-act="copy" data-mid="${msg.id}">
      <svg class="ico" aria-hidden="true"><use href="#i-copy"></use></svg> Salin</button>`;
  }
  const connect = msg.errorCode === "auth" || (msg.errorCode === "rate_limit" && !getPrefs().puterConnected);
  return `
    <button type="button" data-act="copy" data-mid="${msg.id}"><svg class="ico" aria-hidden="true"><use href="#i-copy"></use></svg> Salin</button>
    <button type="button" data-act="speak" data-mid="${msg.id}"><svg class="ico" aria-hidden="true"><use href="#i-audio"></use></svg> Bacakan</button>
    <button type="button" data-act="retry" data-mid="${msg.id}"><svg class="ico" aria-hidden="true"><use href="#i-refresh"></use></svg> Ulangi</button>
    ${connect ? `<button type="button" data-act="connect"><svg class="ico" aria-hidden="true"><use href="#i-key"></use></svg> Hubungkan Puter</button>` : ""}`;
}

function buildMessage(msg) {
  const isUser = msg.role === "user";
  const article = document.createElement("article");
  article.className = `msg ${isUser ? "msg-user" : "msg-ai"}${msg.error ? " msg-error" : ""}`;
  article.dataset.mid = msg.id;
  article.setAttribute("role", "group");

  const engineTag =
    !isUser && msg.engine
      ? `<span class="engine-tag">${escapeHtml(ENGINE_LABEL[msg.engine] || msg.engine)}${msg.model ? ` · ${escapeHtml(String(msg.model).split("/").pop())}` : ""}</span>`
      : "";

  const body = isUser
    ? `<div class="md">${escapeHtml(msg.content).replace(/\n/g, "<br>")}</div>`
    : msg.streaming && !msg.content
      ? `<span class="typing-dots" aria-label="AI sedang menulis"><span></span><span></span><span></span></span>`
      : `<div class="md">${renderMarkdown(msg.content)}</div>`;

  article.innerHTML = `
    <div class="msg-avatar" aria-hidden="true"><svg class="ico"><use href="#${isUser ? "i-user" : "i-bot"}"></use></svg></div>
    <div class="msg-body">
      <div class="msg-meta">
        <b>${isUser ? "Kamu" : "ModManga AI"}</b>
        ${engineTag}
        <time>${timeLabel(msg.ts)}</time>
      </div>
      <div class="bubble">${body}</div>
      <div class="msg-actions">${messageActions(msg)}</div>
    </div>`;
  return article;
}

function renderMessages({ keepScroll = false } = {}) {
  const conv = getActive();
  const hasMessages = Boolean(conv && conv.messages.length);
  if (els.empty) els.empty.hidden = hasMessages;
  if (!els.messages) return;

  els.messages.innerHTML = "";
  if (!hasMessages) return;

  const fragment = document.createDocumentFragment();
  conv.messages.forEach((msg) => fragment.appendChild(buildMessage(msg)));
  els.messages.appendChild(fragment);

  if (stream) attachStreamingEl();
  if (!keepScroll) scrollToBottom(true);
}

function attachStreamingEl() {
  if (!stream) return;
  const article = els.messages?.querySelector(`[data-mid="${stream.mid}"]`);
  if (!article) return;
  stream.el = article;
  stream.bubble = article.querySelector(".bubble");
  stream.mdEl = article.querySelector(".md");
}

/* ---------------- scroll ---------------- */
function isNearBottom() {
  if (!els.scroll) return true;
  return els.scroll.scrollHeight - els.scroll.scrollTop - els.scroll.clientHeight < 140;
}

function scrollToBottom(smooth = false) {
  if (!els.scroll) return;
  els.scroll.scrollTo({ top: els.scroll.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

function onScroll() {
  if (!els.scrollBottom || !els.scroll) return;
  const far = els.scroll.scrollHeight - els.scroll.scrollTop - els.scroll.clientHeight > 260;
  els.scrollBottom.hidden = !far;
}

/* ---------------- streaming ---------------- */
let paintScheduled = false;
function paintStream() {
  if (!stream?.mdEl) return;
  if (paintScheduled) return;
  paintScheduled = true;
  requestAnimationFrame(() => {
    paintScheduled = false;
    if (!stream?.mdEl) return;
    stream.mdEl.innerHTML = `${renderMarkdown(stream.text)}<span class="caret" aria-hidden="true"></span>`;
    if (isNearBottom()) els.scroll.scrollTop = els.scroll.scrollHeight;
  });
}

function appendDelta(delta) {
  if (!stream) return;
  stream.text += delta;
  if (stream.message) stream.message.content = stream.text;

  if (!stream.mdEl) {
    const bubble = els.messages?.querySelector(`[data-mid="${stream.mid}"] .bubble`);
    if (bubble) {
      bubble.innerHTML = `<div class="md"><span class="caret" aria-hidden="true"></span></div>`;
    }
    attachStreamingEl();
  }
  paintStream();
}

function findMessage(id) {
  const conv = getActive();
  return conv?.messages.find((msg) => msg.id === id) || null;
}

/* ---------------- engine ---------------- */
function resolveEngine(pref) {
  const prefs = getPrefs();
  if (pref === "puter") return "puter";
  if (pref === "custom") return customReady() ? "custom" : "pollinations";
  if (pref === "pollinations") return "pollinations";
  // auto
  if (prefs.puterConnected) return "puter";
  if (customReady()) return "custom";
  return "pollinations";
}

function syncEngineUI() {
  const prefs = getPrefs();
  if (els.engineSel) els.engineSel.value = prefs.chatEngine;
  const engine = resolveEngine(prefs.chatEngine);
  const showModel = engine === "puter" || engine === "custom";
  if (els.modelWrap) els.modelWrap.hidden = !showModel;

  if (!els.modelSel) return;

  if (engine === "custom") {
    const custom = getCustomConfig();
    els.modelSel.innerHTML = `<option>${escapeHtml(custom.model || "belum diatur")}</option>`;
    els.modelSel.disabled = true;
    return;
  }

  if (engine === "puter") {
    els.modelSel.disabled = false;
    const prefs2 = getPrefs();
    els.modelSel.innerHTML = `<option value="${escapeHtml(prefs2.puterModel)}">${escapeHtml(prefs2.puterModel)}</option>`;
    els.modelSel.value = prefs2.puterModel;
    if (!modelsRequested) {
      modelsRequested = true;
      listPuterModels().then((models) => {
        if (!models?.length) return;
        const current = getPrefs().puterModel;
        els.modelSel.innerHTML = models
          .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label)}</option>`)
          .join("");
        if (!models.some((model) => model.id === current)) {
          setPrefs({ puterModel: models[0].id });
        }
        els.modelSel.value = getPrefs().puterModel;
      }).catch(() => { /* offline: biarkan daftar cadangan */ });
    }
    return;
  }

  els.modelSel.innerHTML = '<option value="">GPT-OSS 20B</option>';
  els.modelSel.disabled = true;
}

function updateHint() {
  if (!els.hint) return;
  const engine = resolveEngine(getPrefs().chatEngine);
  const remaining = cooldown.remaining("pollinations-text");

  if (engine === "puter") {
    els.hint.textContent = getPrefs().puterConnected
      ? `Puter AI · ${getPrefs().puterModel} · akunmu menanggung biaya pemakaian`
      : "Puter belum terhubung · klik Hubungkan di Pengaturan";
    return;
  }
  if (engine === "custom") {
    els.hint.textContent = `API sendiri · ${getCustomConfig().model}`;
    return;
  }
  els.hint.textContent = remaining > 0
    ? `Jeda gratis ${Math.ceil(remaining / 1000)} detik · pindah ke Puter AI untuk lanjut sekarang`
    : "Tanpa login · tanpa API key · penyedia gratis membatasi 1 pesan / 30 detik";
}

function updateCooldown() {
  if (!els.cooldown) return;
  const engine = resolveEngine(getPrefs().chatEngine);
  const remaining = engine === "pollinations" ? cooldown.remaining("pollinations-text") : 0;
  const active = remaining > 0;
  els.cooldown.hidden = !active;
  if (active) els.cooldownVal.textContent = `${Math.ceil(remaining / 1000)}s`;
  renderSendState();
  if (!generating) updateHint();
}

function renderSendState() {
  if (!els.send) return;
  const engine = resolveEngine(getPrefs().chatEngine);
  const blocked = engine === "pollinations" && cooldown.remaining("pollinations-text") > 0;
  els.send.disabled = generating || blocked;
  els.send.setAttribute("aria-disabled", String(els.send.disabled));
  if (els.stop) els.stop.hidden = !generating;
  els.send.hidden = generating;
}

function setGenerating(value) {
  generating = value;
  renderSendState();
  if (els.input) els.input.disabled = false;
}

/* ---------------- kirim ---------------- */
function buildSystem(persona) {
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${persona.system}\n\nHari ini: ${today}.`;
}

function historyMessages(conv) {
  return conv.messages
    .filter((msg) => msg && !msg.error && (msg.role === "user" || msg.role === "assistant"))
    .filter((msg) => msg.content?.trim())
    .slice(-24)
    .map((msg) => ({ role: msg.role, content: msg.content }));
}

async function sendMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text || generating) return;

  const engine = resolveEngine(getPrefs().chatEngine);
  if (engine === "pollinations") {
    const remaining = cooldown.remaining("pollinations-text");
    if (remaining > 0) {
      toast(`Tunggu ${Math.ceil(remaining / 1000)} detik lagi, atau pindah ke Puter AI.`, { type: "warn" });
      return;
    }
  }

  const conv = ensureConversation();
  conv.messages.push({ id: uid("m"), role: "user", content: text, ts: Date.now() });
  conv.updatedAt = Date.now();
  if (!conv.title || conv.title === "Percakapan baru") conv.title = titleFrom(text);
  conv.persona = conv.persona || getPrefs().persona;

  if (els.input) {
    els.input.value = "";
    autoGrow(els.input);
  }
  save();
  renderAll();
  await respond(conv);
}

async function respond(conv) {
  if (generating) return;

  const prefs = getPrefs();
  const engine = resolveEngine(prefs.chatEngine);
  const model = engine === "puter" ? prefs.puterModel : engine === "custom" ? getCustomConfig().model : "";
  const persona = PERSONAS.find((item) => item.id === (conv.persona || prefs.persona)) || PERSONAS[0];

  if (engine === "custom" && !customReady()) {
    toast("API sendiri belum diatur. Buka Pengaturan untuk mengisinya.", { type: "warn" });
    return;
  }
  if (engine === "puter" && !prefs.puterConnected) {
    const message = {
      id: uid("m"),
      role: "assistant",
      content: "Mesin **Puter AI** butuh akun Puter gratis (bukan API key). Tekan **Hubungkan Puter** di bawah atau di halaman Pengaturan, lalu ulangi pesanmu.",
      ts: Date.now(),
      engine: "puter",
      error: true,
      errorCode: "auth",
    };
    conv.messages.push(message);
    conv.updatedAt = Date.now();
    save();
    renderAll();
    return;
  }

  const placeholder = {
    id: uid("m"),
    role: "assistant",
    content: "",
    ts: Date.now(),
    engine,
    model,
    streaming: true,
  };
  conv.messages.push(placeholder);
  conv.engine = engine;
  conv.updatedAt = Date.now();
  save();

  controller = new AbortController();
  stream = { mid: placeholder.id, message: placeholder, text: "", mdEl: null };
  setGenerating(true);
  renderMessages({ keepScroll: false });
  attachStreamingEl();

  let failure = null;
  let firstChunk = false;

  try {
    const system = buildSystem(persona);
    const messages = historyMessages(conv);
    const generator =
      engine === "puter"
        ? puterChat({ messages, system, model, signal: controller.signal })
        : engine === "custom"
          ? customChat({ messages, system, custom: getCustomConfig(), signal: controller.signal })
          : pollinationsChat({ messages, system, signal: controller.signal });

    for await (const delta of generator) {
      if (controller.signal.aborted) break;
      if (!firstChunk) {
        firstChunk = true;
        if (engine === "pollinations") cooldown.start("pollinations-text", POLLINATIONS.textCooldown);
      }
      appendDelta(delta);
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      failure = error instanceof AiError ? error : new AiError(error?.message || "Terjadi kesalahan tak terduga.");
    }
  } finally {
    const message = placeholder;
    if (message) {
      message.streaming = false;
      message.content = stream?.text || message.content || "";
      if (failure) {
        message.error = true;
        message.errorCode = failure.code;
        const advice = failure.code === "rate_limit"
          ? "\n\n> Kuota gratis penyedia sedang jeda. Tunggu sebentar, pindah ke **Puter AI**, atau pakai API sendiri."
          : failure.code === "auth"
            ? "\n\n> Hubungkan akun Puter gratis lebih dulu, lalu ulangi."
            : "";
        message.content = message.content.trim()
          ? `${message.content}${advice}`
          : `${failure.message}${advice}`;
        if (failure.code === "rate_limit") {
          cooldown.start("pollinations-text", failure.retryAfter || POLLINATIONS.textCooldown);
          toast("Kuota gratis Pollinations sedang jeda. Coba Puter AI untuk lanjut sekarang.", { type: "warn" });
        } else if (failure.code === "auth") {
          toast("Akun Puter belum terhubung.", { type: "warn" });
        } else {
          toast(failure.message, { type: "error" });
        }
      }
      if (!message.content.trim()) message.content = "Tidak ada jawaban. Coba ulangi pertanyaannya.";
    }

    stream = null;
    controller = null;
    generating = false;
    if (conv) conv.updatedAt = Date.now();
    save();
    renderAll();
    renderSendState();
  }
}

/* ---------------- actions ---------------- */
function deleteConversation(id) {
  const conv = state.convs.find((item) => item.id === id);
  if (!conv) return;
  if (!confirm(`Hapus percakapan "${conv.title || "Percakapan baru"}"?`)) return;
  state.convs = state.convs.filter((item) => item.id !== id);
  if (state.activeId === id) state.activeId = state.convs[0]?.id || null;
  save();
  renderAll();
  toast("Percakapan dihapus.", { type: "info" });
}

function newConversation() {
  if (generating) stopGeneration();
  state.activeId = null;
  save();
  renderAll();
  els.input?.focus();
}

function clearConversation() {
  const conv = getActive();
  if (!conv) return;
  if (!confirm("Hapus semua pesan di percakapan ini?")) return;
  conv.messages = [];
  conv.title = "Percakapan baru";
  conv.updatedAt = Date.now();
  save();
  renderAll();
}

function stopGeneration() {
  if (!generating) return;
  controller?.abort();
  toast("Dihentikan.", { type: "info", timeout: 2200 });
}

function regenerate() {
  if (generating) return;
  const conv = getActive();
  if (!conv) return;
  let lastAssistant = -1;
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    if (conv.messages[i].role === "assistant") { lastAssistant = i; break; }
  }
  if (lastAssistant === -1) return;
  conv.messages.splice(lastAssistant, 1);
  conv.updatedAt = Date.now();
  save();
  renderAll();
  respond(conv);
}

async function connectFromChat(button) {
  if (button) button.disabled = true;
  try {
    const user = await connectPuter();
    setPrefs({ puterConnected: true });
    toast(`Terhubung sebagai ${user.username}. Ulangi pesanmu.`, { type: "ok" });
    renderAll();
  } catch (error) {
    toast(error?.message || "Gagal menghubungkan Puter.", { type: "error" });
  } finally {
    if (button) button.disabled = false;
  }
}

async function handleMessageClick(event) {
  const codeCopy = event.target.closest(".code-copy");
  if (codeCopy) {
    const code = codeCopy.closest(".code-block")?.querySelector("pre")?.textContent || "";
    const ok = await copyText(code);
    toast(ok ? "Kode disalin." : "Gagal menyalin.", { type: ok ? "ok" : "error", timeout: 2400 });
    return;
  }

  const action = event.target.closest("[data-act]");
  if (!action) return;
  const act = action.dataset.act;
  const id = action.dataset.mid;
  const message = id ? findMessage(id) : null;

  if (act === "copy" && message) {
    const ok = await copyText(message.content);
    toast(ok ? "Pesan disalin." : "Gagal menyalin.", { type: ok ? "ok" : "error", timeout: 2400 });
  } else if (act === "speak" && message) {
    speakQuick(message.content);
  } else if (act === "retry") {
    regenerate();
  } else if (act === "connect") {
    connectFromChat(action);
  }
}

/* ---------------- bind ---------------- */
function bind() {
  els.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(els.input?.value || "");
  });

  els.input?.addEventListener("input", () => autoGrow(els.input));
  els.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      els.form?.requestSubmit();
    }
  });

  els.stop?.addEventListener("click", stopGeneration);
  els.messages?.addEventListener("click", handleMessageClick);

  els.scroll?.addEventListener("scroll", onScroll, { passive: true });
  els.scrollBottom?.addEventListener("click", () => scrollToBottom(true));

  els.suggestionChips?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-prompt]");
    if (!chip) return;
    if (els.input) els.input.value = chip.dataset.prompt;
    els.form?.requestSubmit();
  });

  els.engineSel?.addEventListener("change", () => {
    setPrefs({ chatEngine: els.engineSel.value });
    modelsRequested = false;
    syncEngineUI();
    renderAll();
  });

  els.modelSel?.addEventListener("change", () => {
    if (resolveEngine(getPrefs().chatEngine) === "puter") setPrefs({ puterModel: els.modelSel.value });
  });

  els.personaSel?.addEventListener("change", () => {
    setPrefs({ persona: els.personaSel.value });
    const conv = getActive();
    if (conv) {
      conv.persona = els.personaSel.value;
      save();
    }
  });

  els.clearBtn?.addEventListener("click", clearConversation);

  els.convList?.addEventListener("click", (event) => {
    const del = event.target.closest("[data-del]");
    if (del) {
      event.stopPropagation();
      deleteConversation(del.dataset.del);
      return;
    }
    const item = event.target.closest("[data-cid]");
    if (!item) return;
    if (generating) stopGeneration();
    state.activeId = item.dataset.cid;
    const conv = getActive();
    if (conv?.persona) els.personaSel.value = conv.persona;
    save();
    renderAll();
  });

  els.convList?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest("[data-cid]");
    if (!item) return;
    event.preventDefault();
    item.click();
  });

  $("#newChatBtn")?.addEventListener("click", newConversation);
  $("#newChatTop")?.addEventListener("click", newConversation);

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      location.hash = "#chat";
      els.input?.focus();
    }
  });
}

export function focusChat() {
  els.input?.focus();
}
