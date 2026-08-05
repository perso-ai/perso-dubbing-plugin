<div align="center">

# Perso Dubbing Plugin

**Setiap video, setiap bahasa. Dubbing, subtitle, dan klip langsung dari coding agent Anda.**
*"Dubbing video ini ke bahasa Indonesia", dan itulah seluruh alurnya.*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ **Bahasa Indonesia** ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| Fitur | Anda bilang | Anda dapatkan | |
|---|---|---|---|
| **Dubbing** | *"Dubbing video ini ke bahasa Jepang"* | Video yang sama, dengan suara baru | |
| **Lip-sync** | *"…sekalian dengan lip-sync"* | Gerakan bibir menyesuaikan audio dubbing | |
| **Pemisahan suara** | *"Pisahkan suara dari musiknya"* | Trek suara dan trek latar | |
| **Subtitle dari ucapan** | *"Buatkan saya SRT bahasa Inggris"* | SRT hasil ekstraksi STT | |
| **Terjemahan subtitle** | *"Terjemahkan subs.srt ke bahasa Spanyol"* | SRT terjemahan, timing tetap utuh, sudah termasuk QA | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Subtitle bergaya** | *"Bakar subtitle ini ke videonya"* | Subtitle bergaya menempel di video | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Klip pendek** | *"Potong 2:00–3:00 jadi short"* | Klip 9:16 yang sudah di-reframe | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Highlight AI** | *"Pilihkan momen terbaik sebagai shorts"* | Klip highlight pilihan AI | |

File, folder, dan URL YouTube/TikTok semuanya bisa langsung dipakai.

<br>

## Instalasi

> **Agen yang menginstal dari URL repo ini?** Di Claude Code, jalankan ini sekarang (non-interaktif, aman dijalankan ulang):
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> Minta pengguna melakukan restart agar `/dubbing`, `/srt`, `/clip` termuat. Host lain: `npx perso-dubbing`. Tanpa terminal (ChatGPT / Gemini): [chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**Aplikasi desktop Claude** (paket berbayar): buka **tab Code**, pilih folder, pilih **Local**, lalu tempel:

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**: `/plugin marketplace add perso-ai/perso-dubbing-plugin`, lalu `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · lainnya**: `npx perso-dubbing` mendeteksi host Anda dan menginstal ke masing-masing.

Hanya butuh **Node.js 18+**, tidak ada yang lain. [Panduan visual](https://dubbing-plugin.perso.ai/en/) · [FAQ](FAQ.md)

<br>

<sub>FREE · BERJALAN LOKAL</sub>

## Subtitle bergaya

Pilih salah satu dari dua belas preset, atau cukup jelaskan tampilannya dengan kata-kata biasa: *"teks kuning, garis tepi hitam, di bagian bawah."* Proses burn berjalan lokal dengan ffmpeg: tanpa unggah, tanpa antrean, tanpa akun. Beberapa bahasa sekaligus? Setiap SRT menghasilkan video jadinya sendiri.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 preset gaya subtitle">
</p>

<br>

<sub>FREE · BERJALAN LOKAL</sub>

## Terjemahkan subtitle

Serahkan SRT apa pun dan sebutkan bahasa yang Anda inginkan. Beberapa bahasa sekaligus pun tidak masalah, satu kali proses mencakup semuanya. Setiap baris mempertahankan timing aslinya persis, muncul dan menghilang di momen yang sama seperti sebelumnya. Sebelum diserahkan, hasilnya diperiksa untuk baris yang terlalu panjang atau terlalu cepat untuk dibaca.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="Demo terjemahan subtitle">
</p>

<br>

<sub>FREE · BERJALAN LOKAL</sub>

## Klip pendek

Masukkan timecode, keluar shorts vertikal: di-reframe dari 16:9 ke 9:16, sudah dinamai, dan siap diberi subtitle. Atau serahkan transkripnya dan AI memilih momen yang cocok jadi shorts: dibuka dengan hook, mengikuti reaksi sampai puncaknya, dipotong sebelum energinya turun. Masing-masing 30–90 detik.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="Demo klip pendek: minta lewat chat, highlight dipilih di timeline, shorts 9:16 keluar">
</p>

<br>

<sub>PERSO API</sub>

## Dubbing dan lip-sync

Satu kali jalan menerima satu file, satu folder penuh, atau URL YouTube/TikTok, lalu men-dubbing-nya ke beberapa bahasa dari satu kali unggah. Video yang melebihi batas paket akan terbagi, diproses, dan digabung kembali dengan sendirinya; proses yang terputus dilanjutkan tepat dari titik berhentinya, tanpa pernah menagih ulang bagian yang sudah selesai. Dubbing mengkloning suara asli ke bahasa baru, dan lip-sync menggerakkan bibir agar sesuai dengan audio hasil kloning itu.

<br>

<sub>PERSO API</sub>

## Subtitle dari ucapan (STT)

Belum punya subtitle? Speech-to-text berjalan di server Perso dan menggunakan kredit untuk mengubah audio video menjadi SRT dalam bahasa aslinya, untuk satu file atau satu folder penuh. Setiap langkah setelah SRT tersedia sepenuhnya gratis: menerjemahkan, memberi gaya, mem-burn.

<br>

<sub>PERSO API</sub>

## Pemisahan suara

Memisahkan video atau audio menjadi trek yang bersih: suara dan latar belakang. Jika ada beberapa pembicara, suara tiap orang keluar sebagai trek tersendiri. Ganti soundtrack-nya, remaster dialognya, atau pakai trek mana pun secara terpisah.

<br>

## Gratis di mana bisa. Berbayar di mana harus.

**MIT, gratis dan open-source.** Semua yang berjalan di komputer Anda tidak berbiaya dan tidak butuh akun: memberi gaya dan mem-burn subtitle, menerjemahkan SRT yang sudah Anda punya, memotong klip di timecode. Kredit hanya terpakai saat pekerjaan berjalan di server Perso: dubbing, lip-sync, pemisahan suara, dan speech-to-text, ditagih per detik yang diproses lewat [Perso Dubbing API](https://developers.perso.ai/api-keys).

Tanpa ritual persiapan. Saat pekerjaan server pertama kali berjalan, browser terbuka: masuk, satu klik, kunci tersimpan terenkripsi. Langkah gratis tidak pernah bertanya.

<br>

---

<sub>**Privasi**: `/dubbing`, `/srt`, dan `/clip` mengirim event penggunaan anonim untuk menyempurnakan skill, mencakup apa yang dijalankan dan bagaimana hasilnya, durasi media, pilihan gaya, lokal secara garis besar, versi aplikasi/OS, serta apakah kunci Perso API digunakan (dan terdaftar). Setiap event memuat ID acak per instalasi dan nomor workspace Anda; tidak pernah kunci, media, nama file, atau teks subtitle Anda. Nonaktifkan dengan `PERSO_NO_TELEMETRY`.</sub>

<sub>**Lisensi**: kode skill berlisensi [MIT](../../LICENSE). Penggunaan API tunduk pada [Ketentuan Layanan Perso AI](https://perso.ai) beserta tarifnya.</sub>
