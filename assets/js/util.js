/* =========================================================
   util.js — helper kecil yang dipakai di seluruh aplikasi
   ========================================================= */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ---------- Escape & Markdown ---------- */
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function escapeAttr(value = "") {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

export function safeUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  if (/^(https?:|mailto:)/i.test(url)) return escapeAttr(url);
  if (url.startsWith("#") || url.startsWith("./") || url.startsWith("../")) return escapeAttr(url);
  return "";
}

function inlineFormat(raw = "") {
  let text = escapeHtml(raw);
  const codes = [];

  text = text.replace(/`([^`\n]+)`/g, (_m, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_m, label, url) => {
    const href = safeUrl(url.replace(/&amp;/g, "&"));
    return href ? `<a href="${href}" target="_blank" rel="noopener nofollow">${label}</a>` : label;
  });

  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)\u0000]+)/g, (_m, pre, url) => {
    const href = safeUrl(url);
    return href ? `${pre}<a href="${href}" target="_blank" rel="noopener nofollow">${url}</a>` : `${pre}${url}`;
  });

  text = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
  text = text.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");

  return text.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<code>${codes[Number(i)] ?? ""}</code>`);
}

function codeBlockHtml(lang, code) {
  const title = lang ? escapeHtml(lang) : "code";
  return `<div class="code-block"><div class="code-head"><span>${title}</span><button type="button" class="code-copy">Salin</button></div><pre><code>${escapeHtml(code)}</code></pre></div>`;
}

const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const RE_UL = /^\s{0,3}[-*+]\s+(.*)$/;
const RE_OL = /^\s{0,3}(\d{1,2})[.)]\s+(.*)$/;
const RE_QUOTE = /^\s{0,3}>\s?(.*)$/;
const RE_TASK = /^\[( |x|X)\]\s+(.*)$/;
const RE_TABLE_SEP = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

function isTableStart(lines, i) {
  return (
    lines[i]?.includes("|") &&
    RE_TABLE_SEP.test(lines[i + 1] || "") &&
    (lines[i + 1] || "").includes("-")
  );
}

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((c) => c.trim());
}

function renderBlocks(chunk = "") {
  const lines = chunk.split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    const heading = line.match(RE_HEADING);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      html += `<h${level}>${inlineFormat(heading[2])}</h${level}>`;
      i++;
      continue;
    }

    if (RE_HR.test(line)) { html += "<hr>"; i++; continue; }

    if (RE_QUOTE.test(line)) {
      const buf = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        buf.push(lines[i].replace(RE_QUOTE, "$1"));
        i++;
      }
      html += `<blockquote>${inlineFormat(buf.join("\n")).replace(/\n/g, "<br>")}</blockquote>`;
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = splitRow(lines[i]);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        body.push(splitRow(lines[i]));
        i++;
      }
      html += '<div class="table-wrap"><table><thead><tr>';
      html += head.map((c) => `<th>${inlineFormat(c)}</th>`).join("");
      html += "</tr></thead><tbody>";
      html += body
        .map((row) => `<tr>${row.map((c) => `<td>${inlineFormat(c)}</td>`).join("")}</tr>`)
        .join("");
      html += "</tbody></table></div>";
      continue;
    }

    if (RE_UL.test(line) || RE_OL.test(line)) {
      const ordered = RE_OL.test(line) && !RE_UL.test(line);
      const items = [];
      const re = ordered ? RE_OL : RE_UL;
      while (i < lines.length && re.test(lines[i])) {
        let content = lines[i].replace(re, ordered ? "$2" : "$1");
        let cls = "";
        const task = content.match(RE_TASK);
        if (task) {
          const checked = task[1].toLowerCase() === "x";
          cls = ' class="task"';
          content = `<span class="task-box">${checked ? "✔" : ""}</span> ${task[2]}`;
        }
        items.push(`<li${cls}>${inlineFormat(content)}</li>`);
        i++;
        // lanjutan baris tanpa penanda, tetap satu item
        while (i < lines.length && lines[i].trim() && !re.test(lines[i]) && /^\s{2,}/.test(lines[i])) {
          items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, `<br>${inlineFormat(lines[i].trim())}</li>`);
          i++;
        }
      }
      html += ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`;
      continue;
    }

    // paragraf
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !RE_HEADING.test(lines[i]) &&
      !RE_HR.test(lines[i]) &&
      !RE_QUOTE.test(lines[i]) &&
      !RE_UL.test(lines[i]) &&
      !RE_OL.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      buf.push(lines[i]);
      i++;
    }
    html += `<p>${inlineFormat(buf.join("\n")).replace(/\n/g, "<br>")}</p>`;
  }

  return html;
}

export function renderMarkdown(source = "") {
  const text = String(source).replace(/\r\n?/g, "\n");
  const parts = text.split("```");
  let html = "";

  parts.forEach((chunk, index) => {
    if (index % 2 === 1) {
      const nl = chunk.indexOf("\n");
      const lang = nl === -1 ? "" : chunk.slice(0, nl).trim();
      const code = (nl === -1 ? chunk : chunk.slice(nl + 1)).replace(/\n$/, "");
      html += codeBlockHtml(lang, code);
    } else {
      html += renderBlocks(chunk);
    }
  });

  return html || "";
}

/* ---------- Storage ---------- */
const PREFIX = "mm:";

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
  },
  keys() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) out.push(key.slice(PREFIX.length));
    }
    return out;
  },
  clearAll() {
    this.keys().forEach((key) => this.remove(key));
  },
};

/* ---------- Cooldown penyedia gratis ---------- */
export const cooldown = {
  storageKey(key) { return `cd:${key}`; },
  until(key) { return Number(store.get(this.storageKey(key), 0)) || 0; },
  remaining(key) { return Math.max(0, this.until(key) - Date.now()); },
  start(key, ms) { store.set(this.storageKey(key), Date.now() + ms); },
  clear(key) { store.remove(this.storageKey(key)); },
};

/* ---------- Toast ---------- */
const TOAST_ICONS = {
  info: "i-info",
  ok: "i-check",
  error: "i-alert",
  warn: "i-clock",
};

export function toast(message, { type = "info", timeout = 4600 } = {}) {
  const root = $("#toasts");
  if (!root) return;

  const el = document.createElement("div");
  el.className = `toast is-${type}`;
  el.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#${TOAST_ICONS[type] || "i-info"}"></use></svg><span>${escapeHtml(message)}</span>`;
  root.appendChild(el);

  const remove = () => {
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 260);
  };
  const timer = setTimeout(remove, timeout);
  el.addEventListener("click", () => { clearTimeout(timer); remove(); });
}

/* ---------- Clipboard & download ---------- */
export async function copyText(text) {
  const value = String(text ?? "");
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadUrl(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ---------- Waktu ---------- */
export function timeLabel(ts) {
  try {
    return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function relTime(ts) {
  const diff = Date.now() - Number(ts || 0);
  if (!Number.isFinite(diff) || diff < 0) return "baru";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

export function slugify(text = "modmanga") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "modmanga";
}

/* ---------- Lain-lain ---------- */
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Gagal memuat ${src}`)));
      if (existing.dataset.loaded === "1") resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Gagal memuat ${src}`)));
    document.head.appendChild(script);
  });
}

export function autoGrow(textarea, maxHeight = 190) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
}
