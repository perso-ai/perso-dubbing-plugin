# 🎬 /dubbing — Tự động lồng tiếng video với Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ **Tiếng Việt** ｜ [Français](../fr/README.md)

Một skill dành cho agent lập trình, mang tính năng **Dubbing (lồng tiếng AI)** của [Perso AI](https://perso.ai) đến agent của bạn. Skill này **tự động lồng tiếng** video sang ngôn ngữ khác — một tệp đơn lẻ hoặc cả một thư mục, và ngay cả những tệp media quá lớn hoặc quá dài cũng được tự động chia nhỏ, xử lý rồi ghép lại. Skill cũng có thể **đồng bộ khẩu hình (lip-sync)** cho video đã lồng tiếng và **tách giọng nói khỏi âm thanh nền**.

Bên dưới, skill gọi Perso Dubbing API, vì vậy **cần có API key của Perso Dubbing.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Lấy API key</a>

Vì mọi host đều sử dụng chung **chuẩn Agent Skills** (`SKILL.md`), skill này hoạt động giống hệt nhau dù bạn cài đặt ở đâu — chỉ cần chạy `/dubbing` hoặc nói *"lồng tiếng video này giúp tôi."*

---

## 🖥️ Cách dễ nhất — ứng dụng desktop Claude (khoảng 3 phút)

Không cần terminal. Trong <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">ứng dụng desktop Claude</a> (gói trả phí):

1. **Mở tab Code** (ở giữa phía trên) và chọn một thư mục bất kỳ — chọn môi trường **Local** (plugin không khả dụng trong phiên cloud).
2. **Dán từng lệnh** vào ô nhập lệnh rồi nhấn Enter, từng lệnh một:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Thích thao tác bằng chuột hơn? Sau lệnh đầu tiên, nhấn nút **+** cạnh ô nhập lệnh → **Plugins** → **Add plugin** → cài đặt **perso-dubbing**.*
3. **Yêu cầu lồng tiếng** — ví dụ *"Lồng tiếng video này sang tiếng Anh — C:\videos\clip.mp4"* (URL YouTube hoặc cả một thư mục cũng dùng được). Ở lần chạy đầu tiên, một tệp key sẽ mở ra để bạn nhập <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Perso API key</a> — dán key vào tệp đó, **không dán vào khung chat**. Trừ khi bạn dùng `--out`, kết quả sẽ được lưu cạnh video gốc.

> 💡 Bản thân skill chạy trên **Node.js 18+**. Nếu máy bạn chưa có, agent sẽ báo không tìm thấy `node` — chỉ cần trả lời *"cài Node.js giúp tôi"* (hoặc tải bản LTS từ <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>), rồi thử lại.

Trong **Claude Code CLI**, hãy dùng `/plugin marketplace add perso-ai/perso-dubbing-plugin` và `/plugin install perso-dubbing@perso-ai` thay thế.

---

## Cài đặt trên các host khác

Cách nhanh nhất hoạt động ở mọi nơi: dán URL của repository này vào agent của bạn và nói *"cài cái này."*

> **🤖 Gửi agent:** Nếu bạn chỉ được cung cấp URL của repository này, hãy chọn đường dẫn phù hợp với host của bạn:
>
> - **Claude Code (ứng dụng desktop hoặc CLI):** **không** chạy npx ngay lập tức — kể cả khi người dùng nói "cài cái này". Hãy hiển thị cho người dùng hai lệnh trong mục *ứng dụng desktop Claude* ở trên và yêu cầu họ tự gõ các lệnh đó, mỗi lệnh một tin nhắn (đây là các lệnh slash do người dùng gõ mà bạn không thể tự thực thi). Cũng nên nhắc đến cách thao tác bằng chuột trong ứng dụng desktop: sau lệnh đầu tiên, **nút + → Plugins → Add plugin**. Nếu cần điều chỉnh cách diễn đạt, biến `CLAUDE_CODE_ENTRYPOINT=cli` trong môi trường shell gợi ý đây là phiên terminal (tín hiệu không chính thức — khi không chắc chắn, hãy trình bày cả hai cách). Chỉ dùng npx nếu sau khi xem qua, người dùng vẫn muốn bạn tự xử lý việc cài đặt.
> - **Codex · Cursor · Antigravity, hoặc người dùng đã giao việc cài đặt cho bạn:** chạy một lệnh duy nhất này — nó sẽ tải gói, tự động phát hiện mọi host đã cài đặt, và cài skill vào từng host:
>
> ```bash
> npx perso-dubbing
> ```
>
> Nếu repo đã được clone sẵn, hãy chạy `node scripts/install.mjs` từ thư mục gốc của repo thay thế (không cần mạng).

<details>
<summary><b>Codex</b></summary>

Codex đọc skill từ thư mục Agent Skills dùng chung. Chạy `npx perso-dubbing --codex`, hoặc sao chép thủ công:

```text
~/.agents/skills/dubbing/        # cá nhân (mọi repo) — Codex hiện tại
~/.codex/skills/dubbing/         # các phiên bản Codex cũ hơn (trình cài đặt ghi vào cả hai)
<repo>/.agents/skills/dubbing/   # chỉ repository này
```

Repo cũng đi kèm một manifest plugin Codex (`.codex-plugin/plugin.json`) dùng cho cài đặt qua marketplace.

</details>

<details>
<summary><b>Cursor</b></summary>

Chạy `npx perso-dubbing --cursor`, hoặc sao chép vào:

```text
~/.cursor/skills/dubbing/        # toàn cục
.cursor/skills/dubbing/          # chỉ dự án này
```

Repo đi kèm một manifest plugin Cursor (`.cursor-plugin/plugin.json`) dùng cho marketplace plugin của Cursor.

</details>

<details>
<summary><b>Antigravity</b></summary>

Chạy `npx perso-dubbing --antigravity`, hoặc sao chép vào một trong hai vị trí sau:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (thư mục Agent Skills dùng chung)
```

</details>

<details>
<summary><b>⚡ Trình cài đặt một dòng lệnh (mọi host)</b></summary>

Tự động phát hiện các host bạn đang dùng và cài đặt vào tất cả — không cần clone:

```bash
npx perso-dubbing
```

- Chỉ một host cụ thể: `--claude` / `--antigravity` / `--codex` / `--cursor` · tất cả: `--all`
- Chỉ dự án hiện tại (`./.claude`, `./.agents`, …): `--project`

Đã clone sẵn repo? `node scripts/install.mjs` từ thư mục gốc của repo cũng làm điều tương tự mà không cần mạng.

</details>

<details>
<summary><b>🔧 Cài đặt thủ công</b></summary>

Sao chép thư mục skill vào thư mục skills của host với tên **`dubbing`**. Từ thư mục gốc của repo:

```bash
# macOS / Linux
mkdir -p <skills_folder>/dubbing && cp -r skills/dubbing/* <skills_folder>/dubbing/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>\dubbing; Copy-Item .\skills\dubbing\* <skills_folder>\dubbing\ -Recurse`

</details>

Sau khi cài đặt, gõ **`/dubbing`** trong agent của bạn hoặc chỉ cần nói **"lồng tiếng video này giúp tôi"** để chạy.

---

## Ví dụ

Cách dễ nhất — chỉ cần nói với agent của bạn:

> "Lồng tiếng video này sang tiếng Anh — C:\videos\clip.mp4"

Bạn cũng có thể chạy CLI trực tiếp từ thư mục gốc của repo:

```bash
# Một video (tự động phát hiện ngôn ngữ gốc → tiếng Anh)
npm run dub -- "clip.mp4" --target en --out result.mp4

# Nhiều ngôn ngữ cùng lúc (chỉ tải lên/chia nhỏ một lần, tái sử dụng cho từng ngôn ngữ)
npm run dub -- "clip.mp4" --target en,ja,zh

# Nhiều đầu vào cùng lúc (có thể trộn URL, tệp, và thư mục)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# Lồng tiếng + đồng bộ khẩu hình (khớp khẩu hình với âm thanh đã lồng tiếng; tốn thêm credit)
npm run dub -- "clip.mp4" --target en --lipsync

# Tách giọng nói / âm thanh nền (không lồng tiếng)
npm run dub -- "clip.mp4" --separate
```

*(Lệnh gọi trực tiếp tương đương: `node skills/dubbing/scripts/dubbing.mjs …` — hoặc `node scripts/dubbing.mjs …` từ bên trong một thư mục skill đã cài đặt.)*

---

## Khắc phục sự cố

Còn thắc mắc khác? Xem **[FAQ](FAQ.md)**.

| Triệu chứng | Cách khắc phục |
|---|---|
| Ứng dụng desktop Claude yêu cầu Git (Windows) | Tab Code cần <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> ở lần dùng đầu tiên. Cài đặt nó, sau đó khởi động lại ứng dụng. |
| Lệnh `claude` hoặc menu Plugins không có phản hồi | Bạn đang ở trong **phiên cloud** — plugin chỉ hoạt động trong phiên **Local** (và SSH). Chuyển môi trường sang Local rồi thử lại. |
| Không tìm thấy `node` / cài đặt hoặc chạy thất bại | Skill chạy trên **Node.js 18+** — kiểm tra bằng `node -v`. Nếu chưa có, hãy cài bản LTS từ <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>, hoặc đơn giản là nhờ Claude trong phiên làm việc cài đặt giúp bạn, rồi khởi động lại ứng dụng. |
| Chưa có API key | Chỉ cần chạy bất kỳ lệnh lồng tiếng nào — một tệp key sẽ tự động mở ra; dán key của bạn vào rồi lưu (tệp được mã hóa và sẽ bị xóa sau đó). Kiểm tra thủ công: `npm run key:check`. **Không dán key vào khung chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Lấy API key</a> |
| Lỗi liên quan đến ffmpeg | ffmpeg thường được tự động cài đặt. Nếu thất bại, hãy chạy `npm run doctor`. |
| Dừng giữa chừng (hết credit, gặp lỗi, tiến trình bị kill) | Tiến trình được lưu vào tệp trạng thái `*.dubresume.json` trong suốt quá trình chạy. Chạy lệnh **`--resume "<state-file>"`** được hiển thị trong thông báo để chỉ hoàn tất các phần còn lại (các phần đã xong sẽ tự động được bỏ qua). |

---

## Quyền riêng tư & Telemetry

`/dubbing` gửi các sự kiện sử dụng **ẩn danh** để cải thiện skill — ví dụ như hành động nào đã chạy (dub / lip-sync / separate), có thành công hay không, cặp ngôn ngữ, phiên bản ứng dụng, và hệ điều hành. Dữ liệu chỉ được gắn nhãn bằng một ID ngẫu nhiên theo từng lượt cài đặt và không bao giờ bao gồm API key, tên tệp hay nội dung media, tài khoản/email, hoặc workspace ID của bạn.

---

## Cấu trúc repository

```text
.claude-plugin/    Manifest plugin và marketplace của Claude Code
.codex-plugin/     Manifest plugin Codex
.cursor-plugin/    Manifest plugin Cursor
docs/              README và FAQ đã dịch (12 ngôn ngữ)
skills/dubbing/    Bản thân skill (SKILL.md · lib/ · scripts/) — độc lập
scripts/           Trình cài đặt cấp repo (install.mjs)
```

## Giấy phép

Mã nguồn của skill này được phân phối theo **[Giấy phép MIT](../../LICENSE)**. Việc lồng tiếng thực tế được thực hiện thông qua Perso Dubbing API, vì vậy việc sử dụng API sẽ tuân theo [Điều khoản dịch vụ của Perso AI](https://perso.ai) và biểu phí của Perso AI.
