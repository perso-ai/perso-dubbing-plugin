# /dubbing — Tanya Jawab Umum (FAQ)

[English](../../FAQ.md) ｜ [한국어](../ko/FAQ.md) ｜ [Español](../es/FAQ.md) ｜ [Português](../pt/FAQ.md) ｜ [Русский](../ru/FAQ.md) ｜ **Bahasa Indonesia** ｜ [Deutsch](../de/FAQ.md) ｜ [ไทย](../th/FAQ.md) ｜ [日本語](../ja/FAQ.md) ｜ [繁體中文](../zh-TW/FAQ.md) ｜ [简体中文](../zh-CN/FAQ.md) ｜ [Tiếng Việt](../vi/FAQ.md) ｜ [Français](../fr/FAQ.md)

Pertanyaan umum seputar skill `/dubbing` dan `/srt`. Untuk pemasangan dan penggunaan, lihat [README](README.md).

### Apa yang saya butuhkan untuk menggunakannya?

Node.js 18+ dan kunci API Perso Dubbing. Instal skill-nya, lalu cukup katakan *"dubbing video ini untuk saya."* → [Dapatkan kunci API](https://developers.perso.ai/api-keys)

### Bagaimana cara mendaftarkan kunci API saya?

Pada eksekusi pertama, sebuah file kunci akan terbuka secara otomatis — tempelkan **hanya kunci API Anda** ke dalam file tersebut lalu simpan (file itu dienkripsi kemudian dihapus). **Jangan pernah menempelkan kunci ke dalam chat.** Pemeriksaan manual: `npm run key:check`.

### Apakah ini berbayar?

Kode skill ini gratis (MIT), tetapi proses dubbing berjalan melalui API Perso yang membebankan kredit: dubbing ≈ 1 kredit/detik, lip-sync ≈ ×2, pemisahan audio ≈ ×0,5. Sumber 4K dikenakan ×3 pada paket pro/business/enterprise. Perhitungan tagihan di server bersifat final.

### Apa saja yang bisa saya masukkan?

File lokal, seluruh folder (batch), atau URL — termasuk YouTube, TikTok, Google Drive, dan Vimeo. Video yang berukuran terlalu besar atau sangat panjang akan otomatis dipecah, diproses, dan digabungkan kembali.

### Bisakah skill ini men-dubbing ke beberapa bahasa, atau memproses banyak file sekaligus?

Bisa. Masukkan beberapa bahasa dalam satu perintah (`--target en,ja,zh`) — sumbernya diunggah dan dipecah satu kali, lalu digunakan ulang untuk tiap bahasa. Anda juga bisa mencampur beberapa file, folder, dan URL dalam satu kali eksekusi.

### Di mana hasilnya disimpan?

Secara default di sebelah video sumber, atau di folder yang Anda tentukan dengan `--out`. Setiap eksekusi juga menjadi sebuah proyek di portal Perso Anda (<https://portal.perso.ai>), tempat Anda bisa mengunduhnya kembali atau mendapatkan format lain.

### Apa itu lip-sync?

Fitur ini menyesuaikan gerakan mulut dengan audio hasil dubbing. Prosesnya berjalan setelah dubbing, hanya berlaku untuk video, memakan waktu jauh lebih lama, dan membutuhkan kredit tambahan. Tambahkan `--lipsync`.

### Apa itu pemisahan audio?

Fitur ini memecah sumber menjadi trek suara / latar / sub-latar — tanpa proses dubbing. Tambahkan `--separate`.

### Bisakah skill ini membuat subtitle (SRT), alih-alih dubbing?

Bisa — paket ini juga menginstal skill **`/srt`**. Skill ini mengekstrak subtitle bahasa asli dari video/audio/URL melalui speech-to-text Perso, lalu agen Anda menerjemahkannya ke bahasa yang Anda minta (disimpan sebagai `<name>_<lang>_Subtitle.srt` di sebelah file aslinya). Hanya ingin transkripnya saja? Cukup sampaikan itu, dan skill akan berjalan dengan `--transcribe-only` — tanpa terjemahan. Setiap ekstraksi subtitle menghabiskan kredit sebanding dengan durasi media (per bahasa).

### Prosesnya berhenti di tengah jalan (kredit habis, crash, atau shell dihentikan). Sekarang bagaimana?

Progres disimpan ke file status sepanjang proses berjalan (`*.dubresume.json` untuk `/dubbing`, `*.srtresume.json` untuk `/srt`). Jalankan kembali perintah `--resume "<state-file>"` yang ditampilkan untuk menyelesaikan hanya bagian yang tersisa — bagian yang sudah selesai akan dilewati dan tidak pernah ditagih ulang.

### Kredit saya habis. Bagaimana cara mengisi ulang?

Skill ini dapat membuat tautan pembayaran Stripe (berlangganan, mengubah paket, atau membeli kredit, tergantung paket Anda). Anda sendiri yang membuka tautan tersebut dan melakukan pembayaran — agen tidak pernah membayar atas nama Anda. Setelah mengisi ulang, lanjutkan dengan perintah `--resume` yang ditampilkan.

### Bisakah saya melakukan dubbing tanpa menyimpan file lokal?

Bisa, untuk video tunggal (yang tidak dipecah): tambahkan `--no-save`. Hasilnya tetap berada di workspace Perso Anda dan tidak diunduh. Video yang dipecah tetap disimpan seperti biasa, karena file hasil penggabungan membutuhkan unduhan lokal.

### `node` tidak ditemukan — apa yang harus saya lakukan?

Skill ini membutuhkan Node.js 18+. Periksa dengan `node -v`; instal versi LTS dari <https://nodejs.org>, atau cukup minta agen untuk menginstalnya untuk Anda, lalu coba lagi.

### Bagaimana cara memperbarui skill ini?

`npx perso-dubbing@latest`, atau di plugin Claude Code: `/plugin update perso-dubbing`.

### Data apa yang dikumpulkan oleh skill ini?

Hanya event penggunaan anonim — aksi apa yang dijalankan, apakah berhasil, jumlah kasar, versi aplikasi, dan OS — yang ditandai dengan ID acak per instalasi. Data ini tidak pernah menyertakan kunci API, nama file atau konten media, akun/email, maupun ID workspace Anda.
