<div align="center">

# Perso Dubbing Plugin

**Mọi video, mọi ngôn ngữ. Lồng tiếng, phụ đề và cắt clip ngay từ coding agent của bạn.**
*Chỉ cần nói "Lồng tiếng video này sang tiếng Việt" là xong toàn bộ quy trình.*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ **Tiếng Việt** ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| Tính năng | Bạn nói | Bạn nhận được | |
|---|---|---|---|
| **Lồng tiếng** | *"Lồng tiếng video này sang tiếng Nhật"* | Video y nguyên, với giọng nói mới | |
| **Lip-sync** | *"…kèm lip-sync luôn"* | Khẩu hình khớp với âm thanh lồng tiếng | |
| **Tách giọng nói** | *"Tách giọng nói khỏi nhạc nền"* | Track giọng nói và track nền riêng biệt | |
| **Phụ đề từ giọng nói** | *"Tạo cho tôi file SRT tiếng Anh"* | File SRT trích xuất bằng STT | |
| **Dịch phụ đề** | *"Dịch subs.srt sang tiếng Tây Ban Nha"* | SRT đã dịch, giữ nguyên timing, kèm kiểm tra chất lượng | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Phụ đề có style** | *"Gắn phụ đề này lên video"* | Phụ đề đã tạo kiểu ngay trên video | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Clip ngắn** | *"Cắt đoạn 2:00–3:00 thành video ngắn"* | Clip 9:16 đã reframe | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **AI highlight** | *"Chọn những khoảnh khắc hay nhất làm video ngắn"* | Các clip highlight do AI tuyển chọn | |

File, thư mục hay URL YouTube/TikTok đều dùng được.

<br>

## Cài đặt

> **Bạn là agent đang cài từ URL repo này?** Trong Claude Code, hãy chạy ngay lệnh sau (không tương tác, chạy lại vẫn an toàn):
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> Sau đó nhắc người dùng khởi động lại để `/dubbing`, `/srt`, `/clip` được nạp. Host khác: `npx perso-dubbing`. Không có terminal (ChatGPT / Gemini): [chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**Ứng dụng Claude desktop** (gói trả phí): mở **tab Code**, chọn một thư mục, chọn **Local**, rồi dán:

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**: chạy `/plugin marketplace add perso-ai/perso-dubbing-plugin`, rồi `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · và mọi môi trường khác**: `npx perso-dubbing` tự phát hiện các host của bạn và cài vào từng host.

Chỉ cần **Node.js 18+**, không cần gì thêm. [Hướng dẫn trực quan](https://dubbing-plugin.perso.ai/en/) · [FAQ](FAQ.md)

<br>

<sub>FREE · CHẠY CỤC BỘ</sub>

## Phụ đề có style

Chọn một trong mười hai preset, hoặc chỉ cần mô tả bằng lời thường: *"chữ vàng, viền đen, đặt ở dưới."* Việc gắn phụ đề chạy cục bộ bằng ffmpeg: không upload, không xếp hàng, không cần tài khoản. Nhiều ngôn ngữ? Mỗi file SRT cho ra một video hoàn chỉnh riêng.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 preset style phụ đề">
</p>

<br>

<sub>FREE · CHẠY CỤC BỘ</sub>

## Dịch phụ đề

Đưa vào bất kỳ file SRT nào và nêu các ngôn ngữ bạn muốn. Nhiều ngôn ngữ cùng lúc cũng được, một lượt chạy xử lý hết. Mỗi dòng giữ đúng timing gốc, xuất hiện và biến mất đúng những thời điểm như trước. Trước khi bàn giao, kết quả còn được kiểm tra xem có dòng nào quá dài hoặc phải đọc quá nhanh không.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="Demo dịch phụ đề">
</p>

<br>

<sub>FREE · CHẠY CỤC BỘ</sub>

## Clip ngắn

Đưa timecode vào, nhận video ngắn dọc ra: đã reframe 16:9 → 9:16, đã đặt tên và sẵn sàng gắn phụ đề. Hoặc đưa transcript và để AI chọn những khoảnh khắc phù hợp làm video ngắn: mở đầu bằng một cú hook, đẩy cảm xúc lên đến đỉnh, và cắt trước khi năng lượng chùng xuống. Mỗi clip dài 30–90 giây.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="Demo clip ngắn: yêu cầu trong chat, highlight được chọn trên timeline, xuất video ngắn 9:16">
</p>

<br>

<sub>PERSO API</sub>

## Lồng tiếng và lip-sync

Một lượt chạy nhận một file, cả thư mục, hoặc URL YouTube/TikTok và lồng tiếng sang nhiều ngôn ngữ chỉ với một lần upload. Video vượt giới hạn gói sẽ tự tách, xử lý rồi ghép lại; lượt chạy bị gián đoạn sẽ tiếp tục đúng chỗ đã dừng, không bao giờ tính phí lại phần đã hoàn thành. Lồng tiếng nhân bản giọng gốc sang ngôn ngữ mới, còn lip-sync điều chỉnh khẩu hình khớp với chính âm thanh nhân bản đó.

<br>

<sub>PERSO API</sub>

## Phụ đề từ giọng nói (STT)

Chưa có phụ đề? Nhận dạng giọng nói chạy trên máy chủ của Perso và dùng credit để chuyển âm thanh của video thành file SRT ở ngôn ngữ gốc, cho một file hay cả thư mục. Mọi bước sau khi đã có SRT đều miễn phí: dịch, tạo kiểu, gắn lên video.

<br>

<sub>PERSO API</sub>

## Tách giọng nói

Tách video hoặc audio thành các track sạch: giọng nói và phần nền. Nếu có nhiều người nói, giọng của mỗi người sẽ thành một track riêng. Thay nhạc nền, remaster phần thoại, hoặc dùng riêng bất kỳ track nào.

<br>

## Miễn phí ở mọi chỗ có thể. Trả phí chỉ khi bắt buộc.

**MIT, miễn phí và mã nguồn mở.** Mọi thứ chạy trên máy của bạn đều không tốn phí và không cần tài khoản: tạo kiểu và gắn phụ đề, dịch file SRT bạn có sẵn, cắt clip theo timecode. Credit chỉ dùng đến khi công việc chạy trên máy chủ của Perso: lồng tiếng, lip-sync, tách giọng nói và nhận dạng giọng nói, tính phí theo từng giây xử lý qua [Perso Dubbing API](https://developers.perso.ai/api-keys).

Không có thủ tục thiết lập rườm rà. Lần đầu một tác vụ máy chủ chạy, trình duyệt sẽ mở ra: đăng nhập, một cú nhấp, key được lưu ở dạng mã hóa. Các bước miễn phí không bao giờ hỏi.

<br>

---

<sub>**Quyền riêng tư**: `/dubbing`, `/srt` và `/clip` gửi các sự kiện sử dụng ẩn danh để cải thiện các skill, gồm tác vụ đã chạy và kết quả ra sao, độ dài media, lựa chọn style, locale ở mức khái quát, phiên bản app/hệ điều hành, và việc có dùng (và đã đăng ký) Perso API key hay không. Mỗi sự kiện mang một ID ngẫu nhiên theo từng bản cài và số workspace của bạn; không bao giờ chứa key, media, tên file hay nội dung phụ đề. Tắt bằng `PERSO_NO_TELEMETRY`.</sub>

<sub>**Giấy phép**: mã nguồn skill theo giấy phép [MIT](../../LICENSE). Việc sử dụng API tuân theo [Điều khoản dịch vụ của Perso AI](https://perso.ai) và biểu phí hiện hành.</sub>
