/* =========================================================
   config.js — konfigurasi statis: persona, gaya, suara, dll.
   ========================================================= */

export const APP_INFO = {
  name: "ModManga AI",
  version: "1.1.0",
  repo: "https://github.com/arumirawan358-hash/modmanga",
};

export const POLLINATIONS = {
  textBase: "https://text.pollinations.ai",
  imageBase: "https://image.pollinations.ai/prompt/",
  textCooldown: 30_000,
  imageCooldown: 45_000,
  referral: "modmanga-ai",
};

export const PUTER_SDK = "https://js.puter.com/v2/";

/* ---------- Persona chat ---------- */
const STYLE_RULE =
  "Gunakan Markdown yang rapi bila membantu (daftar, tebal, blok kode). Jawab dengan bahasa yang dipakai pengguna; jika ragu, pakai Bahasa Indonesia yang santai dan jelas. Jangan mengarang fakta — akui bila tidak tahu.";

export const PERSONAS = [
  {
    id: "umum",
    label: "Asisten Umum",
    system: `Kamu adalah ModManga AI, asisten yang ramah, cepat, dan praktis. ${STYLE_RULE}`,
  },
  {
    id: "mangaka",
    label: "Penulis Manga",
    system: `Kamu seorang mangaka senior dan editor cerita. Bantu pengguna membuat premis, karakter, konflik, panel, dan dialog bergaya manga/manhwa. Tawarkan ide yang spesifik dan dramatis, sertakan contoh dialog. ${STYLE_RULE}`,
  },
  {
    id: "koder",
    label: "Partner Ngoding",
    system: `Kamu software engineer senior. Beri solusi yang benar, aman, dan bisa langsung dipakai. Sertakan potongan kode singkat dengan penjelasan padat, sebutkan jebakan atau edge case. ${STYLE_RULE}`,
  },
  {
    id: "guru",
    label: "Guru Sabar",
    system: `Kamu guru yang sabar. Jelaskan konsep rumit dengan analogi sederhana, bertahap, dan beri contoh nyata. Akhiri dengan satu pertanyaan singkat untuk memastikan pemahaman. ${STYLE_RULE}`,
  },
  {
    id: "ringkas",
    label: "Perangkum Rapi",
    system: `Kamu editor yang sangat efisien. Ringkas materi menjadi poin-poin padat, soroti keputusan penting, dan jangan bertele-tele. ${STYLE_RULE}`,
  },
  {
    id: "penerjemah",
    label: "Penerjemah",
    system: `Kamu penerjemah profesional Indonesia ↔ Inggris (dan bahasa lain bila diminta). Pertahankan nuansa, idiom, dan nada asli. Sajikan hasil terjemahan saja, lalu catatan singkat bila ada istilah sulit. ${STYLE_RULE}`,
  },
  {
    id: "ide",
    label: "Pemberi Ide",
    system: `Kamu partner brainstorming yang spontan. Beri banyak ide berani, variasikan sudut pandang, lalu tandai 3 ide terbaik beserta alasannya. ${STYLE_RULE}`,
  },
];

export const SUGGESTIONS = [
  { label: "Ide cerita manga 1 halaman", prompt: "Beri aku 5 ide cerita manga pendek satu halaman dengan twist di panel terakhir. Pilih satu yang paling kuat dan jelaskan kenapa." },
  { label: "Bantu debug JavaScript", prompt: "Aku punya error 'Cannot read properties of undefined (reading map)' di React. Jelaskan penyebab umumnya dan cara menemukannya langkah demi langkah." },
  { label: "Rangkum artikel panjang", prompt: "Aku akan menempel artikel. Tolong ringkas jadi 5 poin, lalu buat versi 3 kalimat untuk dibagikan di media sosial." },
  { label: "Resep dari isi kulkas", prompt: "Isi kulkas: telur, tahu, bayam, bawang merah, cabai, nasi sisa. Buat resep makan malam 20 menit dengan langkah sederhana." },
  { label: "Latihan bahasa Inggris", prompt: "Ajak aku percakapan bahasa Inggris level B1 tentang rencana liburan. Koreksi salahku dengan lembut setelah tiap balasan." },
];

/* ---------- Gambar ---------- */
export const IMAGE_STYLES = [
  { id: "none", label: "Tanpa gaya", suffix: "" },
  { id: "anime", label: "Anime", suffix: "anime key visual, cel shading, vibrant colors, detailed eyes, studio quality" },
  { id: "manga", label: "Manga ink", suffix: "black and white manga illustration, screentone shading, bold ink lines, dynamic composition" },
  { id: "cyberpunk", label: "Cyberpunk", suffix: "cyberpunk neon city, volumetric fog, magenta and cyan lighting, cinematic, 35mm" },
  { id: "realis", label: "Realistis", suffix: "photorealistic, natural lighting, shallow depth of field, highly detailed, 50mm lens" },
  { id: "3d", label: "3D render", suffix: "stylized 3d render, octane, soft studio lighting, subsurface scattering, high detail" },
  { id: "catair", label: "Cat air", suffix: "watercolor painting, soft washes, textured paper, delicate linework, artistic" },
  { id: "pixel", label: "Pixel art", suffix: "16-bit pixel art, limited palette, crisp pixels, isometric game asset" },
  { id: "fantasi", label: "Fantasi gelap", suffix: "dark fantasy concept art, dramatic chiaroscuro, gothic atmosphere, epic scale, trending on artstation" },
  { id: "poster", label: "Poster komik", suffix: "comic book cover art, halftone dots, bold typography space, inked outlines, retro print texture" },
];

export const RATIOS = [
  { id: "1:1", label: "1:1", w: 768, h: 768 },
  { id: "3:4", label: "3:4", w: 576, h: 768 },
  { id: "4:3", label: "4:3", w: 768, h: 576 },
  { id: "16:9", label: "16:9", w: 768, h: 432 },
  { id: "9:16", label: "9:16", w: 432, h: 768 },
];

export const IMAGE_SURPRISES = [
  "gadis berjaket bomber berdiri di gang Tokyo saat hujan neon, angle rendah, sinematik",
  "kucing samurai di atas atap kuil saat senja, awan dramatis, gaya poster manga",
  "warung kopi kecil di pinggir sawah, cahaya pagi keemasan, cat air lembut",
  "robot kurir membawa paket di kota terapung, langit ungu, detail tinggi",
  "penjelajah muda menemukan pintu batu di tengah hutan berkabut, fantasi gelap",
  "suasana kelas SMA saat jam istirahat, bayangan jendela, gaya anime slice of life",
  "penari tradisional Indonesia dengan kostrum modern, latar batik geometris, poster komik",
  "astronot duduk di tepi kawah bulan sambil memandang bumi, realistis sinematik",
];

/* Model gambar lewat Puter (opsional). Kosong = model default akun. */
export const PUTER_IMAGE_MODELS = [
  { id: "", label: "Standar (default akun)" },
  { id: "replicate:black-forest-labs/flux-1.1-pro", label: "FLUX 1.1 Pro" },
  { id: "replicate:black-forest-labs/flux-schnell", label: "FLUX Schnell (cepat)" },
  { id: "gpt-image-2.6-flare", label: "GPT Image" },
];

/* ---------- Suara ---------- */
export const TTS_PROVIDERS = {
  gemini: {
    label: "Google Gemini TTS",
    note: "Paling natural untuk Bahasa Indonesia. Hasil WAV.",
    defaultVoice: "Kore",
    supportsInstructions: true,
    voices: [
      { id: "Kore", label: "Kore — hangat, tenang (wanita)" },
      { id: "Puck", label: "Puck — ceria, energik (pria)" },
      { id: "Charon", label: "Charon — dalam, Berwibawa (pria)" },
      { id: "Aoede", label: "Aoede — ringan, ramah (wanita)" },
      { id: "Fenrir", label: "Fenrir — tegas, bertenaga (pria)" },
      { id: "Leda", label: "Leda — muda, bersemangat (wanita)" },
      { id: "Orus", label: "Orus — profesional (pria)" },
      { id: "Callirrhoe", label: "Callirrhoe — santai (wanita)" },
      { id: "Enceladus", label: "Enceladus — berbisik (pria)" },
      { id: "Iapetus", label: "Iapetus — jelas, formal (pria)" },
      { id: "Sulafat", label: "Sulafat — hangat, ramah (wanita)" },
      { id: "Zephyr", label: "Zephyr — cerah (wanita)" },
    ],
  },
  openai: {
    label: "OpenAI TTS",
    note: "Cepat dan konsisten, mendukung instruksi gaya.",
    defaultVoice: "nova",
    supportsInstructions: true,
    models: [
      { id: "gpt-4o-mini-tts", label: "gpt-4o-mini-tts" },
      { id: "tts-1-hd", label: "tts-1-hd" },
      { id: "tts-1", label: "tts-1" },
    ],
    defaultModel: "gpt-4o-mini-tts",
    voices: [
      { id: "nova", label: "Nova — ramah, cerah (wanita)" },
      { id: "alloy", label: "Alloy — netral (wanita/pria)" },
      { id: "shimmer", label: "Shimmer — lembut (wanita)" },
      { id: "coral", label: "Coral — hangat (wanita)" },
      { id: "sage", label: "Sage — tenang (wanita)" },
      { id: "marin", label: "Marin — natural (wanita)" },
      { id: "ballad", label: "Ballad — dramatis (pria)" },
      { id: "ash", label: "Ash — mantap (pria)" },
      { id: "echo", label: "Echo — jernih (pria)" },
      { id: "fable", label: "Fable — bercerita (pria)" },
      { id: "onyx", label: "Onyx — dalam (pria)" },
      { id: "verse", label: "Verse — ekspresif (pria)" },
      { id: "cedar", label: "Cedar — dewasa (pria)" },
    ],
  },
  elevenlabs: {
    label: "ElevenLabs",
    note: "Voice design sinematik, multibahasa.",
    defaultVoice: "Bella",
    supportsInstructions: false,
    models: [
      { id: "eleven_multilingual_v2", label: "eleven_multilingual_v2" },
      { id: "eleven_v3", label: "eleven_v3" },
      { id: "eleven_flash_v2_5", label: "eleven_flash_v2_5" },
    ],
    defaultModel: "eleven_multilingual_v2",
    voices: [
      { id: "Bella", label: "Bella — hangat, profesional" },
      { id: "Rachel", label: "Rachel — tenang, jelas" },
      { id: "Sarah", label: "Sarah — lembut" },
      { id: "Charlotte", label: "Charlotte — elegan" },
      { id: "Grace", label: "Grace — ramah" },
      { id: "Adam", label: "Adam — dalam, mantap" },
      { id: "Antoni", label: "Antoni — hangat" },
      { id: "Josh", label: "Josh — muda" },
      { id: "Sam", label: "Sam — bercerita" },
      { id: "Daniel", label: "Daniel — berita" },
      { id: "George", label: "George — klasik" },
      { id: "Brian", label: "Brian — percaya diri" },
    ],
  },
  "aws-polly": {
    label: "AWS Polly",
    note: "Stabil dan cepat, banyak bahasa.",
    defaultVoice: "Putri",
    supportsInstructions: false,
    voices: [
      { id: "Putri", label: "Putri — Bahasa Indonesia (wanita)", language: "id-ID" },
      { id: "Joanna", label: "Joanna — Inggris US (wanita)", language: "en-US" },
      { id: "Matthew", label: "Matthew — Inggris US (pria)", language: "en-US" },
      { id: "Amy", label: "Amy — Inggris UK (wanita)", language: "en-GB" },
      { id: "Brian", label: "Brian — Inggris UK (pria)", language: "en-GB" },
      { id: "Vicki", label: "Vicki — Jerman (wanita)", language: "de-DE" },
      { id: "Conchita", label: "Conchita — Spanyol (wanita)", language: "es-ES" },
      { id: "Léa", label: "Léa — Prancis (wanita)", language: "fr-FR" },
      { id: "Takumi", label: "Takumi — Jepang (pria)", language: "ja-JP" },
      { id: "Seoyeon", label: "Seoyeon — Korea (wanita)", language: "ko-KR" },
    ],
  },
};

export const TTS_SAMPLES = [
  { label: "Narasi manga", text: "Hujan turun di atas kota yang tidak pernah tidur. Di gang sempit itu, seorang gadis berdiri diam, menatap lampu neon yang berkedip seperti jantung yang lelah." },
  { label: "Pengumuman", text: "Perhatian seluruh siswa, upacara bendera akan dimulai dalam lima menit. Mohon berbaris dengan rapi di lapangan utama." },
  { label: "Iklan singkat", text: "ModManga AI. Ngobrol, bikin gambar, dan ubah tulisan jadi suara. Gratis, tanpa API key. Coba sekarang di browser kamu." },
  { label: "Latihan Inggris", text: "Hello! This is a quick voice test. Adjust the speed and pitch until it sounds just right for your project." },
];

export const VOICES_PREF = {
  engine: "browser",
  browserVoice: "",
  rate: 1,
  pitch: 1,
  provider: "gemini",
  voice: "Kore",
  instructions: "Bicara dalam Bahasa Indonesia yang natural, hangat, dan jelas.",
};

export const DEFAULT_PREFS = {
  theme: "dark",
  profile: { name: "" },
  chatEngine: "auto",
  imageEngine: "pollinations",
  puterModel: "google/gemini-3.8-flash",
  persona: "umum",
  imageStyle: "anime",
  imageRatio: "1:1",
  tts: VOICES_PREF,
  custom: { baseUrl: "", apiKey: "", model: "" },
  puterConnected: false,
};

export const PUTER_FALLBACK_MODELS = [
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash — cepat & hemat" },
  { id: "openai/gpt-5.5", label: "GPT-5.5" },
  { id: "anthropic/claude-opus-5-5", label: "Claude Opus 5.5" },
  { id: "x-ai/grok-4.7", label: "Grok 4.7" },
  { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  { id: "qwen/qwen3.8-max", label: "Qwen 3.8 Max" },
  { id: "z-ai/glm-5.3", label: "GLM 5.3" },
  { id: "mistralai/mistral-small-2603", label: "Mistral Small 4" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
  { id: "microsoft/phi-4", label: "Phi-4" },
];
