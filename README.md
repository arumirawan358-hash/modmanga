# ModManga AI

**Studio AI gratis di browser: chat AI, gambar AI, dan text-to-speech neural — tanpa API key, tanpa server, tanpa biaya.**

> Tanpa login. Saat pertama dibuka, aplikasi hanya menanyakan **namamu** (disimpan lokal) — itu saja.
> Ingin fitur **Hanzal AI** (model kelas atas + suara neural)? Klik **Login ke Puter**, sekali saja.

Aplikasi web statis (HTML + CSS + JavaScript murni) yang dideploy otomatis ke GitHub Pages. Semua data pengguna (percakapan, galeri, pengaturan) disimpan di perangkat masing-masing.

🔗 **Demo:** https://arumirawan358-hash.github.io/modmanga/

---

## ✨ Fitur

### 💬 Chat AI
- Streaming jawaban (token muncul bertahap), bisa dihentikan di tengah jalan
- Markdown lengkap: heading, list, tabel, kutipan, blok kode dengan tombol salin
- Riwayat percakapan tersimpan lokal, bisa ganti/rencana/hapus
- 7 persona siap pakai (asisten umum, penulis manga, partner ngoding, guru, perangkum, penerjemah, pemberi ide)
- Tombol **Bacakan** untuk mendengarkan jawaban AI dengan suara perangkat
- Salin pesan, ulangi jawaban, saran prompt sekali klik
- Hitungan mundur otomatis saat kuota gratis penyedia sedang jeda

### 🖼️ Gambar AI
- **Tanpa jeda**: klik berulang langsung diproses, permintaan berikutnya masuk antrean
- **Retry otomatis** di latar belakang saat penyedia ramai (429/402/5xx) — tanpa menyuruhmu menunggu hitungan detik
- Prompt + 10 preset gaya (anime, manga ink, cyberpunk, cat air, pixel art, dll.)
- 5 rasio (1:1, 3:4, 4:3, 16:9, 9:16), seed yang bisa dikunci untuk hasil konsisten
- Galeri lokal permanen (IndexedDB) lengkap dengan prompt, seed, dan tombol unduh
- Lightbox pratinjau, salin prompt, dan "pakai lagi"
- Penyempurnaan prompt otomatis & filter konten opsional

### 🔊 Teks ke Suara
- **Tanpa batas karakter** — naskah sepanjang apa pun; browser membacakan per bagian, mesin neural memecah per ±1.200 karakter lalu menggabungkannya jadi satu berkas WAV
- **Browser Neural** — memakai mesin suara bawaan perangkat (instan, gratis, bisa offline)
- **Puter Neural** — Gemini TTS, OpenAI TTS, ElevenLabs, atau AWS Polly; hasil bisa diunduh
- Pilih karakter suara, atur kecepatan & nada, atau tulis instruksi gaya bicara
- Riwayat sesi, pemutar dengan animasi gelombang, contoh naskah siap pakai

### ⚙️ Lainnya
- **Splash loading** animasi + onboarding nama sekali saja (tanpa akun/login)
- Sapaan personal ("Hai, Rani") di sidebar, nama bisa diubah di Pengaturan → Profil
- Tema **Malam Ink** (gelap) dan **Kertas Manga** (terang)
- PWA: bisa di-install ke layar utama, shell tetap terbuka saat offline
- Responsif penuh (mobile bottom-nav, desktop sidebar)
- Semua pengaturan tersimpan lokal; tidak ada akun, tidak ada pelacakan

---

## 🆓 Kenapa bisa gratis dan tanpa API key?

| Fitur | Penyedia | Kunci? | Catatan |
| --- | --- | --- | --- |
| Chat | [Pollinations Classic](https://pollinations.ai) (GPT-OSS 20B) | ❌ tidak perlu | Gratis per IP, **1 pesan / 30 detik** |
| Gambar | [Pollinations](https://pollinations.ai) (Flux) | ❌ tidak perlu | Gratis, maks 768 px, **tanpa jeda buatan** (antrean + retry otomatis), ada logo kecil |
| Suara | Web Speech API (bawaan browser) | ❌ tidak perlu | Instan, tergantung suara terpasang di perangkat |
| **Hanzal AI** (chat, gambar, suara premium — opsional) | [Puter.js](https://developer.puter.com) | ❌ tanpa API key | Butuh **login akun Puter gratis** (model User-Pays) |
| Chat via API sendiri (opsional) | Groq / OpenRouter / Ollama / dll. | 🔑 milikmu | Hanya jika kamu mau tanpa batas |

Aplikasi ini **tidak menyimpan API key developer** karena memang tidak membutuhkannya. Kalau kamu punya endpoint OpenAI-compatible gratis, tempelkan di **Pengaturan → API sendiri**; kuncinya hanya tinggal di localStorage browser.

### Batas kuota & saran
- **Gambar**: tidak ada jeda buatan. Setiap klik diproses, klik berikutnya masuk antrean, dan bila penyedia membalas 429/402 permintaan diulang otomatis (maks 4 percobaan, jeda antar-percobaan ≤4,5 detik) sambil menampilkan status "coba ulang otomatis".
- **Chat**: masih mengikuti batas penyedia (±30 detik per pesan) sehingga tombol kirim menampilkan hitungan mundur.
- Ingin chat tanpa jeda juga? Aktifkan **Hanzal AI** dengan login akun Puter gratis (klik **Login ke Puter** di Pengaturan atau pada kartu error) — dapat akses GPT, Claude, Gemini, Grok, DeepSeek, Qwen, Llama, dan suara neural.
- Hanzal AI memakai model *User-Pays* di Puter: tiap pengguna menanggung pemakaian akunnya sendiri, developer tidak bayar apa pun.

---

## 🚀 Menjalankan secara lokal

Tidak butuh build step. Cukup server statis apa pun (modul ES butuh HTTP, bukan `file://`):

```bash
# Python
python3 -m http.server 8080

# atau Node
npx serve .
```

Buka `http://localhost:8080`.

> Catatan: service worker hanya aktif di `localhost` atau HTTPS.

---

## 📦 Deploy ke GitHub Pages

Workflow `.github/workflows/pages.yml` sudah disiapkan:

1. Buka **Settings → Pages** di repo.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Push ke branch `main`. Workflow akan menyalin file statis ke `_site`, mengunggahnya, lalu menerbitkan situs.
4. URL muncul di tab Actions dan Settings → Pages.

Karena ini situs proyek, semua path memakai **path relatif** (`./assets/...`), jadi aman diletakkan di subfolder seperti `/modmanga/`.

---

## 🗂️ Struktur

```
├── index.html                  # seluruh markup (4 layar + dialog)
├── 404.html                    # fallback redirect
├── manifest.webmanifest        # PWA
├── sw.js                       # service worker (network-first + cache shell)
├── assets/
│   ├── css/app.css             # tema, komponen, responsif
│   ├── js/
│   │   ├── app.js              # boot, routing hash, tema, status
│   │   ├── api.js              # Pollinations, Puter, API sendiri
│   │   ├── chat.js             # layar chat + streaming
│   │   ├── image.js            # generator gambar + galeri
│   │   ├── tts.js              # suara browser & Puter
│   │   ├── settings.js         # pengaturan, tema, data
│   │   ├── prefs.js            # preferensi + event
│   │   ├── db.js               # IndexedDB untuk galeri
│   │   ├── config.js           # persona, gaya, rasio, suara
│   │   └── util.js             # markdown, storage, toast, dsb.
│   ├── mascot.jpg, og.jpg      # aset ilustrasi
│   └── icon.svg, icon-*.png    # ikon aplikasi
└── .github/workflows/pages.yml # deploy otomatis
```

---

## 🔒 Privasi

- Tidak ada backend milik proyek ini. Tidak ada analitik.
- Percakapan & pengaturan → `localStorage`; galeri gambar → `IndexedDB`. Semua lokal, bisa dihapus dari **Pengaturan → Data & privasi**.
- Saat meminta jawaban/gambar/suara, hanya teks/prompt yang kamu kirim ke penyedia AI terkait (Pollinations/Puter) — sama seperti memakai situs mereka langsung.
- API key (jika kamu mengisi API sendiri) hanya tersimpan di browser dan dikirim langsung ke endpoint pilihanmu.

---

## ⚠️ Catatan

- Layanan gratis bersifat *best effort*: model, kuota, dan perilaku bisa berubah kapan saja.
- Hasil AI bisa salah atau kurang tepat. Periksa ulang informasi penting.
- Untuk penggunaan gambar/suara, ikuti ketentuan penyedia masing-masing.

---

## 🙏 Kredit

- [Pollinations.AI](https://pollinations.ai) — API teks & gambar gratis tanpa kunci
- [Puter](https://developer.puter.com) — AI keyless (User-Pays) untuk model & suara premium
- [Web Speech API](https://developer.mozilla.org/docs/Web/API/Web_Speech_API) — suara bawaan browser
- Ilustrasi maskot dibuat dengan AI generatif

## 📄 Lisensi

MIT — bebas dipakai, diubah, dan dibagikan.
