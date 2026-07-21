# 🎬 /dubbing — Terjemahan Video Perso Dubbing

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ **Bahasa Indonesia** ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Skill agen coding yang menghadirkan dubbing AI dari [Perso Dubbing](https://perso.ai/dubbing) ke agen Anda. Instal sekali, lalu cukup katakan *"dubbing video ini ke bahasa Inggris"*.

- **Dubbing** ke bahasa lain — satu file, seluruh folder, atau sebuah URL
- **Lip-sync** pada video hasil dubbing agar gerakan mulut sesuai dengan audio barunya
- **Pisahkan** suara dari audio latar
- **Subtitle** (`/srt`) — ekstrak SRT melalui speech-to-text, lalu agen Anda menerjemahkannya
- Media yang berukuran terlalu besar dan sangat panjang otomatis dipecah, diproses, dan digabungkan kembali

Berjalan di atas **Node.js 18+** dan membutuhkan **kunci API Perso Dubbing**. Dibangun di atas standar Agent Skills (`SKILL.md`), sehingga berperilaku sama persis di Claude, Codex, Cursor, dan Antigravity.

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## Instalasi

> 📖 **[Panduan visual →](https://dubbing-plugin.perso.ai/en/)** — pilih agen Anda dan salin perintahnya.

### Aplikasi desktop Claude — paling mudah, tanpa terminal (sekitar 3 menit)

Di <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">aplikasi desktop Claude</a> (paket berbayar):

1. Buka **tab Code** (di tengah atas), pilih folder apa pun, lalu pilih lingkungan **Local** — plugin tidak berfungsi dalam sesi cloud.
2. Tempelkan setiap perintah ke kotak prompt dan tekan Enter, satu per satu:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Lebih suka mengeklik? Setelah perintah pertama: tombol **+** → **Plugins** → **Add plugin** → **perso-dubbing**.*
3. Minta dubbing — *"Dubbing video ini ke bahasa Inggris — C:\videos\clip.mp4"*. URL YouTube atau sebuah folder juga bisa. Hasilnya disimpan di sebelah video sumber kecuali Anda menyertakan `--out`.

**Claude Code CLI:** gunakan `/plugin marketplace add perso-ai/perso-dubbing-plugin` dan `/plugin install perso-dubbing@perso-ai` sebagai gantinya.

### Host lainnya

```bash
npx perso-dubbing
```

Mendeteksi host mana yang Anda miliki dan menginstal kedua skill ke masing-masing host, sambil menampilkan lokasi pemasangannya. Tambahkan `--claude` / `--codex` / `--cursor` / `--antigravity` untuk satu host, `--all` untuk semua host, atau `--project` hanya untuk proyek saat ini. Sudah meng-clone repositorinya? `node scripts/install.mjs` dari root repositori melakukan hal yang sama, tanpa jaringan.

> **🤖 Untuk agen:** jika Anda hanya diberi URL repositori ini:
>
> - **Claude Code (aplikasi desktop atau CLI)** — **jangan** jalankan npx, meskipun pengguna berkata "instal ini". Tunjukkan kepada mereka kedua perintah `claude …` di atas dan minta mereka mengetikkannya sendiri satu per satu (perintah tersebut adalah slash command yang diketik pengguna dan tidak bisa Anda jalankan), beserta jalur kliknya: tombol **+** → **Plugins** → **Add plugin**. Gunakan npx hanya jika setelah itu mereka tetap ingin Anda yang menanganinya.
> - **Codex · Cursor · Antigravity, atau pengguna mendelegasikan instalasinya** — jalankan `npx perso-dubbing` (atau `node scripts/install.mjs` jika repositorinya sudah di-clone).

### Eksekusi pertama — kunci API Anda

Sebuah halaman browser akan terbuka: masuk dan klik sekali, lalu kunci Anda diterbitkan dan disimpan terenkripsi di komputer ini. Tidak ada yang perlu disalin. Jika tidak ada browser yang bisa dibuka, sebuah file kunci akan terbuka sebagai gantinya — tempelkan kunci di sana lalu simpan, dan file tersebut dienkripsi kemudian dihapus.

**Jangan pernah menempelkan kunci API Anda ke dalam chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Dapatkan kunci API</a> · periksa kapan saja dengan `npm run key:check`

---

## Penggunaan

Cukup beri tahu agen Anda apa yang Anda inginkan:

> "Dubbing video ini ke bahasa Inggris — C:\videos\clip.mp4"
>
> "Dubbing setiap video di folder ini ke bahasa Jepang dan Spanyol"
>
> "Dubbing tautan YouTube ini ke bahasa Inggris, dengan lip-sync"
>
> "Pisahkan suara dan musik latar dari klip ini"
>
> "Buatkan saya SRT bahasa Inggris untuk video ini"

Atau ketik **`/dubbing`** / **`/srt`** untuk memulai. Untuk daftar lengkap opsi CLI, tanyakan cara penggunaannya kepada agen Anda atau jalankan `npm run dub -- --help`.

---

## Pemecahan masalah

Punya pertanyaan lain? Lihat **[FAQ](FAQ.md)**.

| Gejala | Solusi |
|---|---|
| `node` tidak ditemukan | Instal versi LTS dari <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (atau minta agen Anda *"instalkan Node.js untuk saya"*), lalu coba lagi. |
| Aplikasi desktop Claude meminta Git (Windows) | Tab Code membutuhkan <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> saat pertama kali digunakan. Instal, lalu mulai ulang aplikasi. |
| Perintah `claude` atau menu Plugins tidak merespons | Anda berada dalam **sesi cloud** — plugin membutuhkan sesi **Local** (atau SSH). |
| Kunci ditolak atau tidak ada | Daftarkan ulang: `node skills/dubbing/scripts/connect.mjs`. Periksa kunci yang tersimpan dengan `npm run key:check`. |
| Error terkait ffmpeg | ffmpeg biasanya terinstal otomatis; jika gagal, jalankan `npm run doctor`. |
| Berhenti di tengah jalan (kredit habis, crash, proses dihentikan) | Progres disimpan terus-menerus. Jalankan perintah **`--resume "<state-file>"`** yang ditampilkan pada notifikasi — bagian yang sudah selesai dilewati dan tidak pernah ditagih ulang. |

---

## Privasi & Telemetri

`/dubbing` dan `/srt` mengirimkan event penggunaan untuk meningkatkan kualitas kedua skill ini — misalnya, aksi apa yang dijalankan, apakah berhasil, durasi media, versi aplikasi, dan OS. Setiap event membawa ID acak per instalasi dan nomor workspace Anda. Kunci API dan media Anda tidak pernah disertakan. Nonaktifkan kapan saja melalui `PERSO_NO_TELEMETRY`.

---

## Struktur repositori

```text
.claude-plugin/    Plugin Claude Code + manifest marketplace
.codex-plugin/     Manifest plugin Codex
.cursor-plugin/    Manifest plugin Cursor
docs/              Landing GitHub Pages + README terjemahan · FAQ (12 bahasa)
skills/dubbing/    Skill dubbing (SKILL.md · lib/ · scripts/) — mandiri
skills/srt/        Skill subtitle SRT (SKILL.md · scripts/) — memakai lib/ dari skill dubbing
scripts/           Installer tingkat repositori (install.mjs)
```

## Lisensi

Kode skill ini didistribusikan di bawah **[Lisensi MIT](../../LICENSE)**. Proses dubbing itu sendiri berjalan melalui API Perso Dubbing, sehingga penggunaan API tunduk pada [Ketentuan Layanan Perso AI](https://perso.ai) dan kebijakan harganya.
