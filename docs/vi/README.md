# 🎬 /dubbing — Dịch video với Perso Dubbing

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ **Tiếng Việt** ｜ [Français](../fr/README.md)

Một skill dành cho agent lập trình, mang tính năng lồng tiếng AI của [Perso Dubbing](https://perso.ai/dubbing) đến agent của bạn. Chỉ cần cài đặt một lần, rồi nói *"lồng tiếng video này sang tiếng Anh"*.

- **Lồng tiếng** sang ngôn ngữ khác — một tệp đơn lẻ, cả một thư mục, hoặc một URL
- **Đồng bộ khẩu hình (lip-sync)** cho video đã lồng tiếng để khẩu hình khớp với âm thanh mới
- **Tách** giọng nói khỏi âm thanh nền
- **Phụ đề** (`/srt`) — trích xuất SRT bằng speech-to-text, rồi agent của bạn sẽ dịch
- Media quá lớn hoặc quá dài sẽ được tự động chia nhỏ, xử lý, rồi ghép lại

Chạy trên **Node.js 18+** và cần **API key của Perso Dubbing**. Được xây dựng trên chuẩn Agent Skills (`SKILL.md`), nên skill hoạt động giống hệt nhau trên Claude, Codex, và Antigravity.

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## Cài đặt

> 📖 **[Hướng dẫn trực quan →](https://dubbing-plugin.perso.ai/en/)** — chọn agent của bạn và sao chép lệnh.

### Ứng dụng desktop Claude — dễ nhất, không cần terminal (khoảng 3 phút)

Trong <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">ứng dụng desktop Claude</a> (gói trả phí):

1. Mở **tab Code** (ở giữa phía trên), chọn một thư mục bất kỳ, và chọn môi trường **Local** — plugin không hoạt động trong phiên cloud.
2. Dán từng lệnh vào ô nhập lệnh rồi nhấn Enter, từng lệnh một:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

3. Yêu cầu lồng tiếng — *"Lồng tiếng video này sang tiếng Anh — C:\videos\clip.mp4"*. URL YouTube hoặc cả một thư mục cũng dùng được. Kết quả được lưu cạnh video gốc, trừ khi bạn dùng `--out`.

**Claude Code CLI:** hãy dùng `/plugin marketplace add perso-ai/perso-dubbing-plugin` và `/plugin install perso-dubbing@perso-ai` thay thế.

### Mọi host khác

```bash
npx perso-dubbing
```

Tự động phát hiện các host bạn đang có và cài cả hai skill vào từng host, đồng thời in ra vị trí cài đặt của mỗi skill. Thêm `--claude` / `--codex` / `--antigravity` cho một host, `--all` cho mọi host, hoặc `--project` chỉ cho dự án hiện tại. Đã clone sẵn repo? `node scripts/install.mjs` từ thư mục gốc của repo cũng làm điều tương tự, không cần mạng.

<details>
<summary><b>🤖 Gửi agent</b> — nếu bạn chỉ được cung cấp URL của repository này</summary>

- **Claude Code (desktop hoặc CLI)** — hãy tự chạy một dòng lệnh cài đặt sau (không tương tác và idempotent, chạy lại vẫn an toàn):

  ```bash
  claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
  ```

  Khi cả hai thành công, hãy bảo người dùng bắt đầu phiên mới (hoặc khởi động lại Claude Code) — `/dubbing` và `/srt` được nạp từ phiên tiếp theo. Chỉ khi CLI `claude` không khả dụng trong shell của bạn, mới quay lại cách hiển thị lệnh ở trên để người dùng tự gõ.
- **Codex · Antigravity, hoặc người dùng đã giao việc cài đặt cho bạn** — chạy `npx perso-dubbing` (hoặc `node scripts/install.mjs` nếu repo đã được clone sẵn).
- **ChatGPT (web/ứng dụng — không có terminal trên máy người dùng)** — đọc https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/chatgpt-setup.md và làm theo: trước hết cài **Codex** trên máy người dùng — việc cài đặt tiếp tục ở đó. (Đã ở trong Codex có terminal? Dùng mục phía trên.)
- **Gemini (web/ứng dụng — không có terminal trên máy người dùng)** — đọc https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/gemini-setup.md và làm theo: trước hết cài **Antigravity** — việc cài đặt tiếp tục ở đó. (Đã ở trong Antigravity? Dùng mục phía trên.)

</details>

### Lần chạy đầu tiên — API key của bạn

Một trang trình duyệt sẽ mở ra: đăng nhập và nhấn một lần, key của bạn sẽ được cấp và lưu trên máy này ở dạng mã hóa. Không cần sao chép gì cả. Nếu không mở được trình duyệt, một tệp key sẽ mở ra thay thế — dán key vào đó rồi lưu, tệp sẽ được mã hóa và xóa đi.

<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Lấy API key</a> · kiểm tra bất cứ lúc nào bằng `npm run key:check`

---

## Cách dùng

Chỉ cần nói với agent của bạn điều bạn muốn:

> "Lồng tiếng video này sang tiếng Anh — C:\videos\clip.mp4"
>
> "Lồng tiếng mọi video trong thư mục này sang tiếng Nhật và tiếng Tây Ban Nha"
>
> "Lồng tiếng link YouTube này sang tiếng Anh, kèm đồng bộ khẩu hình"
>
> "Tách giọng nói và nhạc nền ra khỏi clip này"
>
> "Tạo cho tôi một tệp SRT tiếng Anh cho video này"

Hoặc gõ **`/dubbing`** / **`/srt`** để bắt đầu. Để xem danh sách đầy đủ các tùy chọn CLI, hãy hỏi agent của bạn về cách dùng hoặc chạy `npm run dub -- --help`.

---

## Khắc phục sự cố

Còn thắc mắc khác? Xem **[FAQ](FAQ.md)**.

| Triệu chứng | Cách khắc phục |
|---|---|
| Không tìm thấy `node` | Cài bản LTS từ <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (hoặc nhờ agent *"cài Node.js giúp tôi"*), rồi thử lại. |
| Ứng dụng desktop Claude yêu cầu Git (Windows) | Tab Code cần <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> ở lần dùng đầu tiên. Cài đặt nó rồi khởi động lại ứng dụng. |
| Lệnh `claude` hoặc menu Plugins không có phản hồi | Bạn đang ở trong **phiên cloud** — plugin cần phiên **Local** (hoặc SSH). |
| Key bị từ chối hoặc chưa có | Hãy đăng ký lại: `node skills/dubbing/scripts/connect.mjs`. Kiểm tra key đã lưu bằng `npm run key:check`. |
| Lỗi ffmpeg | ffmpeg thường tự cài đặt; nếu thất bại, hãy chạy `npm run doctor`. |
| Dừng giữa chừng (hết credit, gặp lỗi, tiến trình bị kill) | Tiến trình được lưu liên tục. Chạy lệnh **`--resume "<state-file>"`** được hiển thị trong thông báo — các phần đã xong sẽ được bỏ qua và không bao giờ bị tính phí lại. |

---

## Quyền riêng tư & Telemetry

`/dubbing` và `/srt` gửi các sự kiện sử dụng để cải thiện skill — ví dụ như hành động nào đã chạy, có thành công hay không, thời lượng media, phiên bản ứng dụng, và hệ điều hành. Mỗi sự kiện mang một ID ngẫu nhiên theo từng lượt cài đặt và số workspace của bạn. API key và nội dung media của bạn không bao giờ được đưa vào. Bạn có thể tắt bất cứ lúc nào bằng `PERSO_NO_TELEMETRY`.

---

## Cấu trúc repository

```text
.claude-plugin/    Plugin Claude Code + manifest marketplace
.codex-plugin/     Manifest plugin Codex
docs/              Trang landing GitHub Pages + README đã dịch · FAQ (12 ngôn ngữ)
skills/dubbing/    Skill lồng tiếng (SKILL.md · lib/ · scripts/) — độc lập
skills/srt/        Skill phụ đề SRT (SKILL.md · scripts/) — dùng lib/ của skill lồng tiếng
scripts/           Trình cài đặt cấp repository (install.mjs)
```

## Giấy phép

Mã nguồn của skill là **[MIT](../../LICENSE)**. Việc lồng tiếng thực tế chạy qua Perso Dubbing API, vì vậy việc sử dụng API tuân theo [Điều khoản dịch vụ của Perso AI](https://perso.ai) và biểu phí của Perso AI.
