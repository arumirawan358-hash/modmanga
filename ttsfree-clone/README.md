# Bedah TTSFree.com + Replika Halaman Indonesian TTS

Replika halaman **https://ttsfree.com/text-to-speech/indonesian** yang berfungsi penuh:
tampilan, alur, daftar suara, dan fitur-fiturnya dibuat semirip mungkin, tetapi mesin suaranya
memakai jalur **gratis** yang benar-benar bisa dipakai dari browser.

```
ttsfree-clone/
├── index.html        # struktur halaman (hero, konverter, katalog suara, FAQ, footer)
├── assets/style.css  # desain: putih–indigo, kartu lembut, responsif, dark-friendly
├── assets/app.js     # 3 mesin TTS + pemutar + musik latar + mixing + riwayat
└── README.md         # dokumen ini (hasil bedah + cara pakai)
```

Buka `index.html` lewat web server (bukan `file://`), contoh:

```bash
python3 -m http.server 8080 --directory ttsfree-clone --bind 0.0.0.0
# lalu buka http://localhost:8080
```

---

## 1. Hasil bedah halaman aslinya

### Struktur halaman (urut dari atas)

| # | Blok | Isi |
|---|------|-----|
| 1 | Header | logo `TTSFree.com`, menu (Home, Text to Speech, Languages, Blog), tombol Login/Register |
| 2 | Hero | H1 "Text to Speech Indonesian online free", subjudul, 4 checklist (700+ suara, 140+ bahasa, MP3, komersial), CTA "Try Free Now" |
| 3 | **Konverter** | textarea + penghitung `0 / 500 characters` + tautan "Login untuk lebih banyak karakter" (di klon: **tanpa batas**) |
| 4 | Pemilih bahasa | dropdown berisi `69. Indonesian (Indonesia) - ID` dengan ikon bendera |
| 5 | **Voice list** | tab `AI-1` / `AI-2`, grid kartu suara: ikon pria/wanita, nama, label mesin, ikon 🔒 + "Premium" untuk Wavenet |
| 6 | Kontrol suara | `Voice Speed` dan `Speech Pitch` (default), slider, pratinjau tiap suara |
| 7 | Musik latar | accordion "🎵 Add background music", tab *From Library* / *From Soundcloud*, input Track ID, tombol Preview, kredit FreeMusicBG |
| 8 | Tombol aksi | "Konversi sekarang" + progress bar "Ready to convert 0%" |
| 9 | How-to | 3 langkah bernomor (Enter text → Choose voice → Generate & download) |
| 10 | Katalog suara | 14 voice Indonesia lengkap dengan `voiceID` dan demo play |
| 11 | Usecases | 4 kartu: E-Learning, Content Creation, Accessibility, Marketing |
| 12 | About | paragraf penjelasan layanan |
| 13 | FAQ | accordion 6 pertanyaan |
| 14 | Footer | tautan + info |

### Yang sebenarnya dipakai di balik layar

- **Batas gratis:** 500 karakter per konversi (lebih butuh akun/plan). Hasil berupa MP3.
- **Suara Indonesia yang gratis (AI-2):**
  - `id-ID-ArdiNeural` — pria
  - `id-ID-GadisNeural` — wanita
  - Pola nama `-Neural` + kode bahasa `id-ID` ini adalah penamaan **Microsoft Azure Cognitive Services Speech**.
- **Suara premium (terkunci):** `id-ID-Wavenet-A` … `id-ID-Wavenet-D` — penamaan **Google Cloud Text-to-Speech** (Wavenet). Di daftar suara diberi label "Premium" dan ikon gembok.
- **Suara Standard-A … Standard-D:** varian standard (non-neural) dari mesin yang sama, ditampilkan sebagai AI-1.
- **Klaim pemasaran:** 700+ suara, 140+ bahasa, boleh komersial, teks tidak disimpan permanen, file dihapus dalam 24 jam.
- **Musik latar:** kerja sama dengan **FreeMusicBG**; track dipilih lewat Track ID atau URL Soundcloud.
- **Bahasa halaman:** instruksi konverter berbahasa Indonesia, sisanya Inggris (SEO per bahasa).

### Pemetaan ke mesin gratis di replika ini

| Di situs asli | Di replika | Catatan |
|---|---|---|
| Azure Neural `ArdiNeural` / `GadisNeural` (AI-2) | **Puter AI** (`puter.ai.txt2speech`) — Gemini TTS / OpenAI TTS / Amazon Polly | perlu login gratis Puter sekali klik (popup), hasil MP3/WAV bisa diunduh; jika popup diblokir otomatis fallback ke Google |
| Google Wavenet A–D (premium) | tetap **terkunci** + toast "Premium", agar mirip aslinya | slot bisa diaktifkan kalau kamu punya API key Google |
| Standard-A…D (AI-1) | **Google Translate TTS** (`translate.google.com/translate_tts?tl=id`) | suara wanita Indonesia Google, natural, tanpa key, MP3 bisa diambil |
| Pratinjau instan / offline | **Web Speech API** (`speechSynthesis`, `lang=id-ID`) | tanpa jaringan, tapi tidak bisa direkam → tidak bisa diunduh |
| Musik latar FreeMusicBG | **musik prosedural Web Audio API** (4 preset, bebas royalti) | tidak ada file eksternal, jadi bebas CORS dan bebas lisensi |
| Login untuk 3.000 karakter | modal login **opsional** (isi nama saja) | di klon tidak ada batas, login hanya menyimpan nama |
| Progress "Ready to convert 0%" | progress bar sungguhan (memproses → memutar → selesai) | |

---

## 2. Fitur yang sudah berfungsi di replika

- **3 mesin suara** dan bisa diganti kapan saja (Browser / Google / Neural otomatis untuk AI-2).
- **10 suara per bahasa**, sama komposisinya: 2 neural (pria + wanita), 4 standard, 4 premium terkunci.
- **10 bahasa** dengan bendera & nomor urut seperti daftar bahasa di situs asli (ID, EN-US, EN-GB, MS, JA, KO, AR, ES, HI, ZH).
- **Tanpa batas karakter** — 500/3.000 di situs asli tidak dipakai di sini; teks panjang otomatis dipecah per bagian lalu digabung (10.000+ karakter sudah diuji).
- **Kecepatan & nada** bicara, volume, pratinjau per suara, demo dari hero.
- **Musik latar** 4 preset (Lo-fi, Ambient, Hujan, Epik) + volume musik + opsi "sertakan musik pada unduhan".
- **Pemutar** dengan waveform canvas, tombol putar/jeda, durasi, unduh, bagikan.
- **Unduhan:**
  - neural → MP3/WAV asli,
  - Google → MP3 (byte diambil langsung; kalau server menolak CORS dipakai proxy publik, lalu digabung),
  - dengan musik latar → hasil mixing **WAV** via `OfflineAudioContext` (fade-out halus di akhir).
- **Riwayat sesi** 12 item di localStorage + tombol hapus.
- **UI mobile yang dirapikan**: target sentuh ≥46px, font input 16px (anti-zoom iOS), tombol konversi menempel di bawah, pemutar otomatis digulir ke layar, grid suara 2 kolom, area aman `env(safe-area-inset-*)`.
- **UI responsif** (menu hamburger di mobile), aksesibilitas dasar (role, aria, focus ring), hormati `prefers-reduced-motion`.

---

## 3. Batasan yang perlu kamu tahu

1. **Mesin Google Translate TTS tidak resmi.** Endpoint `translate_tts` dipakai banyak proyek gratis, tapi bukan API publik resmi dan bisa berubah/diblokir kapan saja; ada juga batas ±200 karakter per potongan (replika ini otomatis memecah teks per kalimat). Untuk produk sungguhan, pakai penyedia berlisensi.
2. **Unduhan MP3 dari mesin Google** bergantung pada CORS. Kalau gagal, pesannya jelas dan kamu bisa beralih ke suara AI-2 (neural) yang unduhannya selalu aman.
3. **Puter butuh login gratis** (popup). Kalau popup diblokir (mis. di iframe preview), replika otomatis pindah ke mesin Google.
4. **Suara browser berbeda tiap perangkat.** Chrome biasanya punya "Google Bahasa Indonesia"; Firefox/Safari memakai suara sistem yang mungkin lebih datar.
5. **Nada (pitch)** hanya berlaku untuk mesin Browser; Google Translate tidak punya parameter pitch, jadi hanya kecepatan yang dipakai.
6. **Teks sangat panjang** dengan mesin neural diproses per ±900 karakter (satu permintaan per bagian), jadi waktunya sebanding panjang teks — tapi batasnya tidak ada.

---

## 4. Kalau mau "sama persis" secara lisensi

Replika ini **tidak** menyalin aset, logo, atau teks pemasaran TTSFree.com — struktur & alur dibuat ulang,
seluruh teks ditulis sendiri, dan semua aset visual memakai emoji/CSS. Untuk mendapatkan suara yang *identik*
dengan aslinya, ganti dua mesin gratis di atas dengan:

- `id-ID-ArdiNeural`, `id-ID-GadisNeural` → **Azure Speech** (REST `https://<region>.tts.speech.microsoft.com/cognitiveservices/v1`, header `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3`).
- `id-ID-Wavenet-A…D` → **Google Cloud TTS** (`POST https://texttospeech.googleapis.com/v1/text:synthesize`, `voice.name: "id-ID-Wavenet-A"`).

Keduanya berbayar per karakter (ada kuota gratis bulanan), butuh API key, dan CORS-nya perlu proxy
kecil di server — bukan sesuatu yang bisa dijalankan murni di browser seperti versi ini.

---

## 5. Struktur kode singkat

| Bagian di `app.js` | Isi |
|---|---|
| `LANGS`, `voicesFor()` | data bahasa, nama suara, `voiceID`, pemetaan ke Puter |
| `chunkText()` | memecah teks per kalimat (±190 karakter) untuk Google TTS |
| `speakBrowser()` | Web Speech API + pemilihan suara sistem terbaik (`id-ID`, prioritas "Google") |
| `playGoogleChunks()` / `fetchGoogleMp3()` | streaming potongan audio + pengambilan byte MP3 |
| `synthPuter()` | `puter.ai.txt2speech` dengan fallback provider |
| `scheduleMusic()` / `renderMusicBuffer()` | sintesis musik prosedural di `OfflineAudioContext` |
| `mixWithMusic()` / `encodeWav()` | mixing suara + musik → WAV 16-bit |
| `wave` (canvas) | waveform asli dari `AnalyserNode` (neural) atau hasil seed teks (browser/Google) |
| `convert()`, `onDownload()`, `addHistory()` | alur utama |

Selamat mencoba — dan kalau ada bagian yang mau dibuat lebih mirip (misal grid 14 suara persis,
halaman daftar bahasa, atau halaman premium), tinggal bilang.
