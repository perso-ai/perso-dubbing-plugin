# 🎬 /dubbing — Dubbing Otomatis Video Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ **Bahasa Indonesia** ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Skill agen coding yang menghadirkan **Dubbing (dubbing AI)** dari [Perso AI](https://perso.ai) ke agen Anda. Skill ini **men-dubbing otomatis** video ke bahasa lain — satu file atau seluruh folder — dan bahkan media yang berukuran terlalu besar atau sangat panjang pun otomatis dipecah, diproses, dan digabungkan kembali. Skill ini juga dapat **menyinkronkan gerakan bibir (lip-sync)** pada video hasil dubbing dan **memisahkan suara dari audio latar**.

Di balik layar, skill ini memanggil API Dubbing Perso, sehingga **diperlukan kunci API Perso Dubbing.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Dapatkan kunci API</a>

Karena setiap host menggunakan standar **Agent Skills** yang sama (`SKILL.md`), skill ini bekerja dengan cara yang sama di mana pun Anda menginstalnya — cukup jalankan `/dubbing` atau katakan *"dubbing video ini untuk saya."*

---

## 🖥️ Cara termudah — aplikasi desktop Claude (sekitar 3 menit)

> 📖 **Lebih suka panduan visual?** Ikuti **[tutorial instalasi →](https://dubbing-plugin.perso.ai/?lang=en)** — pilih agen Anda dan salin perintahnya.

Tidak perlu terminal. Di <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">aplikasi desktop Claude</a> (paket berbayar):

1. **Buka tab Code** (di tengah atas) dan pilih folder apa pun — pilih lingkungan **Local** (plugin tidak tersedia dalam sesi cloud).
2. **Tempelkan setiap perintah** ke kotak prompt dan tekan Enter, satu per satu:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Lebih suka mengeklik? Setelah perintah pertama, tekan tombol **+** di samping kotak prompt → **Plugins** → **Add plugin** → instal **perso-dubbing**.*
3. **Minta dubbing** — misalnya *"Dubbing video ini ke bahasa Inggris — C:\videos\clip.mp4"* (URL YouTube atau seluruh folder juga bisa). Pada eksekusi pertama, sebuah file kunci akan terbuka untuk <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">kunci API Perso</a> Anda — tempelkan kunci tersebut ke dalam file itu, **bukan ke dalam chat**. Kecuali Anda menyertakan `--out`, hasilnya disimpan di sebelah video sumber.

> 💡 Skill ini berjalan di atas **Node.js 18+**. Jika PC Anda belum memilikinya, agen akan mengatakan `node` tidak ditemukan — cukup balas *"instalkan Node.js untuk saya"* (atau unduh versi LTS dari <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>), lalu coba lagi.

Di **Claude Code CLI**, gunakan `/plugin marketplace add perso-ai/perso-dubbing-plugin` dan `/plugin install perso-dubbing@perso-ai` sebagai gantinya.

---

## Instal di host lain

Cara tercepat yang berlaku di mana saja: tempelkan URL repositori ini ke agen Anda dan katakan *"instal ini."*

> **🤖 Untuk agen:** Jika Anda hanya diberi URL repositori ini, pilih jalur sesuai host Anda:
>
> - **Claude Code (aplikasi desktop atau CLI):** **jangan** langsung menjalankan npx — meskipun pengguna berkata "instal ini". Tunjukkan kepada pengguna kedua perintah dari bagian *aplikasi desktop Claude* di atas dan minta mereka mengetikkan perintah tersebut sendiri, satu per pesan (perintah tersebut adalah slash command yang diketik pengguna dan tidak bisa Anda jalankan). Sebutkan juga jalur klik di aplikasi desktop: setelah perintah pertama, **tombol + → Plugins → Add plugin**. Jika Anda perlu menyesuaikan kata-katanya, `CLAUDE_CODE_ENTRYPOINT=cli` pada environment shell Anda mengindikasikan sesi terminal (sinyal tidak terdokumentasi — jika ragu, tampilkan kedua jalur). Gunakan npx hanya jika pengguna, setelah melihat opsi tersebut, tetap ingin Anda yang menangani instalasinya.
> - **Codex · Cursor · Antigravity, atau pengguna mendelegasikan instalasi kepada Anda:** jalankan satu perintah ini — perintah ini mengambil paket, mendeteksi otomatis setiap host yang terinstal, dan menginstal skill ke masing-masing host:
>
> ```bash
> npx perso-dubbing
> ```
>
> Jika repositori sudah di-clone, jalankan `node scripts/install.mjs` dari root repositori (tidak perlu jaringan).

<details>
<summary><b>Codex</b></summary>

Codex membaca skill dari folder Agent Skills bersama. Jalankan `npx perso-dubbing --codex`, atau salin secara manual:

```text
~/.agents/skills/dubbing/        # personal (semua repo) — Codex saat ini
~/.codex/skills/dubbing/         # versi Codex lama (installer menulis keduanya)
<repo>/.agents/skills/dubbing/   # hanya repositori ini
```

Repositori ini juga menyertakan manifes plugin Codex (`.codex-plugin/plugin.json`) untuk instalasi berbasis marketplace.

</details>

<details>
<summary><b>Cursor</b></summary>

Jalankan `npx perso-dubbing --cursor`, atau salin ke:

```text
~/.cursor/skills/dubbing/        # global
.cursor/skills/dubbing/          # hanya proyek ini
```

Repositori ini menyertakan manifes plugin Cursor (`.cursor-plugin/plugin.json`) untuk marketplace plugin Cursor.

</details>

<details>
<summary><b>Antigravity</b></summary>

Jalankan `npx perso-dubbing --antigravity`, atau salin ke salah satu lokasi berikut:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (folder Agent Skills bersama)
```

</details>

<details>
<summary><b>⚡ Installer satu baris (host apa pun)</b></summary>

Mendeteksi host mana yang Anda gunakan dan menginstal ke semuanya — tidak perlu clone:

```bash
npx perso-dubbing
```

- Hanya host tertentu: `--claude` / `--antigravity` / `--codex` / `--cursor` · semua: `--all`
- Hanya proyek saat ini (`./.claude`, `./.agents`, …): `--project`

Repositorinya sudah ter-clone? `node scripts/install.mjs` dari root repositori melakukan hal yang sama tanpa jaringan.

</details>

<details>
<summary><b>🔧 Instalasi manual</b></summary>

Salin folder skill ke direktori skills host Anda dengan nama **`dubbing`**. Dari root repositori:

```bash
# macOS / Linux
mkdir -p <skills_folder>/dubbing && cp -r skills/dubbing/* <skills_folder>/dubbing/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>\dubbing; Copy-Item .\skills\dubbing\* <skills_folder>\dubbing\ -Recurse`

</details>

Setelah instalasi, ketik **`/dubbing`** di agen Anda atau cukup katakan **"dubbing video ini untuk saya"** untuk menjalankannya.

---

## Contoh

Cara termudah — cukup beri tahu agen Anda:

> "Dubbing video ini ke bahasa Inggris — C:\videos\clip.mp4"

Anda juga dapat menjalankan CLI langsung dari root repositori:

```bash
# Satu video (deteksi otomatis bahasa sumber → bahasa Inggris)
npm run dub -- "clip.mp4" --target en --out result.mp4

# Beberapa bahasa sekaligus (diunggah/dipecah sekali, digunakan ulang per bahasa)
npm run dub -- "clip.mp4" --target en,ja,zh

# Beberapa input sekaligus (URL, file, dan folder bisa dicampur)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# Dubbing + lip-sync (mulut disesuaikan dengan audio hasil dubbing; kredit tambahan)
npm run dub -- "clip.mp4" --target en --lipsync

# Pisahkan trek suara / audio latar (tanpa dubbing)
npm run dub -- "clip.mp4" --separate
```

*(Panggilan langsung yang setara: `node skills/dubbing/scripts/dubbing.mjs …` — atau `node scripts/dubbing.mjs …` dari dalam folder skill yang terinstal.)*

---

## Pemecahan masalah

Punya pertanyaan lain? Lihat **[FAQ](FAQ.md)**.

| Gejala | Solusi |
|---|---|
| Aplikasi desktop Claude meminta Git (Windows) | Tab Code membutuhkan <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> saat pertama kali digunakan. Instal, lalu mulai ulang aplikasi. |
| Perintah `claude` atau menu Plugins tidak merespons | Anda berada dalam **sesi cloud** — plugin hanya berfungsi di sesi **Local** (dan SSH). Ubah environment ke Local lalu coba lagi. |
| `node` tidak ditemukan / instalasi atau eksekusi gagal | Skill ini berjalan di atas **Node.js 18+** — periksa dengan `node -v`. Jika belum ada, instal versi LTS dari <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>, atau cukup minta Claude dalam sesi tersebut untuk menginstalnya, lalu mulai ulang aplikasi. |
| Belum punya kunci API | Cukup jalankan perintah dubbing apa pun — file kunci akan terbuka otomatis; tempelkan kunci Anda dan simpan (file tersebut dienkripsi lalu dihapus). Pemeriksaan manual: `npm run key:check`. **Jangan tempelkan kunci ke dalam chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Dapatkan kunci API</a> |
| Error terkait ffmpeg | ffmpeg biasanya terinstal otomatis. Jika gagal, jalankan `npm run doctor`. |
| Berhenti di tengah jalan (kredit habis, crash, proses dihentikan) | Progres disimpan ke file status `*.dubresume.json` sepanjang proses berjalan. Jalankan perintah **`--resume "<state-file>"`** yang ditampilkan pada notifikasi untuk menyelesaikan hanya bagian yang tersisa (bagian yang sudah selesai otomatis dilewati). |

---

## Privasi & Telemetri

`/dubbing` mengirimkan event penggunaan **anonim** untuk meningkatkan kualitas skill ini — misalnya, aksi apa yang dijalankan (dubbing / lip-sync / pemisahan), apakah berhasil, pasangan bahasa, versi aplikasi, dan OS. Data ini hanya ditandai dengan ID acak per instalasi dan tidak pernah menyertakan kunci API, nama file atau konten media, akun/email, maupun ID workspace Anda.

---

## Struktur repositori

```text
.claude-plugin/    Manifes plugin Claude Code + marketplace
.codex-plugin/     Manifes plugin Codex
.cursor-plugin/    Manifes plugin Cursor
docs/              Landing GitHub Pages + README dan FAQ terjemahan (12 bahasa)
skills/dubbing/    Skill itu sendiri (SKILL.md · lib/ · scripts/) — mandiri
scripts/           Installer tingkat repositori (install.mjs)
```

## Lisensi

Kode skill ini didistribusikan di bawah **[Lisensi MIT](../../LICENSE)**. Proses dubbing yang sebenarnya dilakukan melalui API Perso Dubbing, sehingga penggunaan API itu sendiri tunduk pada [Ketentuan Layanan Perso AI](https://perso.ai) dan kebijakan harganya.
