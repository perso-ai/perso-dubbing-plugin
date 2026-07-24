# /dubbing — Câu hỏi thường gặp (FAQ)

[English](../../FAQ.md) ｜ [한국어](../ko/FAQ.md) ｜ [Español](../es/FAQ.md) ｜ [Português](../pt/FAQ.md) ｜ [Русский](../ru/FAQ.md) ｜ [Bahasa Indonesia](../id/FAQ.md) ｜ [Deutsch](../de/FAQ.md) ｜ [ไทย](../th/FAQ.md) ｜ [日本語](../ja/FAQ.md) ｜ [繁體中文](../zh-TW/FAQ.md) ｜ [简体中文](../zh-CN/FAQ.md) ｜ **Tiếng Việt** ｜ [Français](../fr/FAQ.md)

Các câu hỏi thường gặp về các skill `/dubbing` và `/srt`. Để biết cách cài đặt và sử dụng, xem [README](README.md).

### Tôi cần gì để sử dụng?

Node.js 18+ và một API key của Perso Dubbing. Cài đặt skill, sau đó chỉ cần nói *"lồng tiếng video này giúp tôi."* → [Lấy API key](https://developers.perso.ai/api-keys)

### Làm thế nào để đăng ký API key?

Ở lần chạy đầu tiên, một trang trình duyệt sẽ mở ra — đăng nhập và nhấn một lần, key của bạn sẽ được cấp và lưu trên máy này ở dạng mã hóa. Không cần sao chép gì cả. Nếu không mở được trình duyệt, một tệp key sẽ mở ra thay thế: chỉ dán **API key của bạn** vào đó rồi lưu (tệp được mã hóa và sau đó bị xóa). **Không bao giờ dán key vào khung chat.** Kiểm tra thủ công: `npm run key:check`.

### Có tốn phí không?

Mã nguồn của skill là miễn phí (MIT), nhưng việc lồng tiếng chạy qua Perso API, vốn tính phí theo credit.

### Tôi có thể đưa vào những gì?

Một tệp cục bộ, một thư mục cục bộ, hoặc một URL (YouTube, TikTok, Google Drive). Video quá lớn hoặc quá dài sẽ được tự động chia nhỏ, xử lý, rồi ghép lại.

### Có thể lồng tiếng sang nhiều ngôn ngữ, hoặc xử lý nhiều tệp cùng lúc không?

Có. Đưa nhiều ngôn ngữ vào cùng một lệnh (`--target en,ja,zh`) — nguồn chỉ được tải lên và chia nhỏ một lần, sau đó tái sử dụng cho từng ngôn ngữ. Bạn cũng có thể kết hợp nhiều tệp, thư mục, và URL trong cùng một lần chạy.

### Kết quả của tôi được lưu ở đâu?

Mặc định là cạnh video gốc, hoặc trong thư mục bạn chỉ định bằng `--out`. Mỗi lần chạy cũng tạo ra một dự án trong Perso portal của bạn (<https://perso.ai/en/workspace/vt>), nơi bạn có thể tải lại hoặc lấy các định dạng khác.

### Lip-sync là gì?

Đây là tính năng khớp chuyển động miệng với âm thanh đã lồng tiếng. Nó chạy sau khi lồng tiếng, chỉ hoạt động trên video, mất nhiều thời gian hơn đáng kể, và tốn thêm credit. Thêm `--lipsync`.

### Tách âm thanh là gì?

Tính năng này tách nguồn thành các track giọng nói / âm thanh nền / âm thanh nền phụ — không liên quan đến lồng tiếng. Thêm `--separate`.

### Nó có thể tạo phụ đề (SRT) thay vì lồng tiếng không?

Skill **`/srt`** trích xuất phụ đề ở ngôn ngữ gốc từ video/audio/URL thông qua công nghệ speech-to-text của Perso. Nếu bạn cũng muốn dịch chúng, hãy yêu cầu tệp SRT kèm theo các ngôn ngữ bạn muốn.

### Quá trình dừng giữa chừng (hết credit, gặp lỗi, hoặc shell bị kill). Giờ phải làm sao?

Tiến trình được lưu vào một tệp trạng thái trong suốt quá trình chạy (`*.dubresume.json` cho `/dubbing`, `*.srtresume.json` cho `/srt`). Chạy lại lệnh `--resume "<state-file>"` được in ra để chỉ hoàn tất các phần còn lại — các phần đã hoàn thành sẽ được bỏ qua và không bao giờ bị tính phí lại.

### Tôi đã hết credit. Làm thế nào để nạp thêm?

Skill có thể tạo một liên kết thanh toán Stripe (đăng ký, đổi gói, hoặc mua credit, tùy vào gói của bạn). Bạn tự mở liên kết và thanh toán — agent không bao giờ thanh toán thay bạn. Sau khi nạp thêm, tiếp tục bằng lệnh `--resume` được in ra.

### Tôi có thể lồng tiếng mà không lưu tệp cục bộ không?

Có, với một video đơn lẻ (không bị chia nhỏ): thêm `--no-save`. Kết quả sẽ ở lại trong workspace Perso của bạn và không được tải xuống. Video bị chia nhỏ vẫn được lưu bình thường, vì tệp đã ghép cần được tải về cục bộ.

### Không tìm thấy `node` — tôi phải làm gì?

Skill cần Node.js 18+. Kiểm tra bằng `node -v`; cài bản LTS từ <https://nodejs.org>, hoặc đơn giản là nhờ agent cài đặt giúp bạn, rồi thử lại.

### Làm thế nào để cập nhật skill?

`npx perso-dubbing@latest`, hoặc trong plugin Claude Code: `/plugin update perso-dubbing`.

### Skill thu thập những dữ liệu nào?

Chỉ các sự kiện sử dụng — hành động nào đã chạy, có thành công hay không, số liệu thống kê ở mức tổng quát, phiên bản ứng dụng, và hệ điều hành — được gắn nhãn bằng một ID ngẫu nhiên theo từng lượt cài đặt và số workspace của bạn. API key và nội dung media của bạn không bao giờ được đưa vào.
