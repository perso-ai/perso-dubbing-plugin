# 🎬 /dubbing — พากย์เสียงวิดีโออัตโนมัติด้วย Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ **ไทย** ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

สกิลสำหรับเอเจนต์เขียนโค้ดที่นำการพากย์เสียงด้วย AI ของ [Perso AI](https://perso.ai) มาสู่เอเจนต์ของคุณ ติดตั้งเพียงครั้งเดียว แล้วพูดว่า *"พากย์วิดีโอนี้เป็นภาษาอังกฤษ"* ได้เลย

- **พากย์เสียง** เป็นภาษาอื่น — ไฟล์เดียว ทั้งโฟลเดอร์ หรือ URL
- **ลิปซิงก์** วิดีโอที่พากย์เสียงแล้ว ให้การขยับปากตรงกับเสียงใหม่
- **แยกเสียง** เสียงพูดออกจากเสียงพื้นหลัง
- **คำบรรยาย** (`/srt`) — ดึงไฟล์ SRT ผ่านระบบแปลงเสียงพูดเป็นข้อความ จากนั้นเอเจนต์ของคุณจะแปลให้
- สื่อที่มีขนาดใหญ่เกินไปหรือยาวมากจะถูกแบ่ง ประมวลผล และรวมกลับเข้าด้วยกันโดยอัตโนมัติ

ทำงานบน **Node.js 18+** และต้องมี**คีย์ API ของ Perso Dubbing** สร้างบนมาตรฐาน Agent Skills (`SKILL.md`) จึงทำงานเหมือนกันทั้งบน Claude, Codex และ Antigravity

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## การติดตั้ง

> 📖 **[คู่มือแบบภาพประกอบ →](https://dubbing-plugin.perso.ai/en/)** — เลือกเอเจนต์ของคุณแล้วคัดลอกคำสั่ง

### แอปเดสก์ท็อป Claude — ง่ายที่สุด ไม่ต้องใช้เทอร์มินัล (ประมาณ 3 นาที)

ใน<a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">แอปเดสก์ท็อป Claude</a> (แผนแบบชำระเงิน):

1. เปิด**แท็บ Code** (ตรงกลางด้านบน) เลือกโฟลเดอร์ใดก็ได้ แล้วเลือกสภาพแวดล้อม **Local** — ปลั๊กอินใช้งานไม่ได้ในเซสชันบนคลาวด์
2. วางคำสั่งแต่ละคำสั่งลงในกล่องพรอมป์แล้วกด Enter ทีละคำสั่ง:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

3. ขอให้พากย์เสียง — *"พากย์วิดีโอนี้เป็นภาษาอังกฤษ — C:\videos\clip.mp4"* URL ของ YouTube หรือทั้งโฟลเดอร์ก็ใช้ได้เช่นกัน หากไม่ได้ระบุ `--out` ผลลัพธ์จะถูกบันทึกไว้ข้างวิดีโอต้นฉบับ

**Claude Code CLI:** ให้ใช้ `/plugin marketplace add perso-ai/perso-dubbing-plugin` และ `/plugin install perso-dubbing@perso-ai` แทน

### โฮสต์อื่นทั้งหมด

```bash
npx perso-dubbing
```

ตรวจจับโฮสต์ที่คุณติดตั้งไว้ แล้วติดตั้งสกิลทั้งสองลงในแต่ละโฮสต์ พร้อมแสดงตำแหน่งที่ติดตั้งของแต่ละตัว เพิ่ม `--claude` / `--codex` / `--antigravity` เพื่อเลือกเฉพาะโฮสต์เดียว `--all` สำหรับทุกโฮสต์ หรือ `--project` สำหรับเฉพาะโปรเจกต์ปัจจุบัน โคลนรีโพซิทอรีไว้แล้วใช่ไหม? `node scripts/install.mjs` จากรากของรีโพซิทอรีทำสิ่งเดียวกันโดยไม่ต้องใช้เครือข่าย

<details>
<summary><b>🤖 ถึงเอเจนต์</b> — หากคุณได้รับเพียง URL ของรีโพซิทอรีนี้</summary>

- **Claude Code (แอปเดสก์ท็อปหรือ CLI)** — รันคำสั่งติดตั้งบรรทัดเดียวนี้ด้วยตัวคุณเอง (ไม่ต้องโต้ตอบและเป็น idempotent รันซ้ำได้อย่างปลอดภัย):

  ```bash
  claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
  ```

  เมื่อทั้งสองคำสั่งสำเร็จ ให้แจ้งผู้ใช้ให้เริ่มเซสชันใหม่ (หรือรีสตาร์ต Claude Code) — `/dubbing` และ `/srt` จะโหลดตั้งแต่เซสชันถัดไป เฉพาะกรณีที่ใช้ CLI `claude` ในเชลล์ของคุณไม่ได้เท่านั้น จึงค่อยเปลี่ยนไปแสดงคำสั่งด้านบนให้ผู้ใช้พิมพ์เอง
- **Codex · Antigravity หรือผู้ใช้มอบหมายให้คุณติดตั้ง** — ให้รัน `npx perso-dubbing` (หรือ `node scripts/install.mjs` หากโคลนรีโพซิทอรีไว้แล้ว)
- **ChatGPT (เว็บ/แอป — ใช้เทอร์มินัลบนเครื่องผู้ใช้ไม่ได้)** — อ่าน https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/chatgpt-setup.md แล้วทำตาม: ให้ติดตั้ง **Codex** บนเครื่องผู้ใช้ก่อน — การติดตั้งจะดำเนินต่อที่นั่น (อยู่ใน Codex ที่มีเทอร์มินัลแล้ว? ใช้ข้อด้านบนแทน)
- **Gemini (เว็บ/แอป — ใช้เทอร์มินัลบนเครื่องผู้ใช้ไม่ได้)** — อ่าน https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/gemini-setup.md แล้วทำตาม: ให้ติดตั้ง **Antigravity** ก่อน — การติดตั้งจะดำเนินต่อที่นั่น (อยู่ใน Antigravity แล้ว? ใช้ข้อด้านบนแทน)

</details>

### การรันครั้งแรก — คีย์ API ของคุณ

หน้าเว็บจะเปิดขึ้นในเบราว์เซอร์: ลงชื่อเข้าใช้แล้วคลิกเพียงครั้งเดียว คีย์ของคุณจะถูกออกให้และจัดเก็บไว้บนเครื่องนี้แบบเข้ารหัส ไม่ต้องคัดลอกอะไรทั้งสิ้น หากไม่สามารถเปิดเบราว์เซอร์ได้ ไฟล์คีย์จะเปิดขึ้นมาแทน — วางคีย์ลงในไฟล์นั้นแล้วบันทึก คีย์จะถูกเข้ารหัสและไฟล์จะถูกลบทิ้ง

<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">รับคีย์ API</a> · ตรวจสอบได้ทุกเมื่อด้วย `npm run key:check`

---

## วิธีใช้งาน

เพียงบอกเอเจนต์ของคุณว่าต้องการอะไร:

> "พากย์วิดีโอนี้เป็นภาษาอังกฤษ — C:\videos\clip.mp4"
>
> "พากย์วิดีโอทุกไฟล์ในโฟลเดอร์นี้เป็นภาษาญี่ปุ่นและภาษาสเปน"
>
> "พากย์ลิงก์ YouTube นี้เป็นภาษาอังกฤษ พร้อมลิปซิงก์"
>
> "แยกเสียงพูดกับเพลงประกอบออกจากคลิปนี้"
>
> "ทำ SRT ภาษาอังกฤษของวิดีโอนี้ให้หน่อย"

หรือพิมพ์ **`/dubbing`** / **`/srt`** เพื่อเริ่มใช้งาน หากต้องการรายการตัวเลือก CLI ทั้งหมด ให้ถามเอเจนต์ของคุณถึงวิธีใช้งาน หรือรัน `npm run dub -- --help`

---

## การแก้ไขปัญหา

มีคำถามเพิ่มเติม? ดูที่ **[FAQ](FAQ.md)**

| อาการ | วิธีแก้ไข |
|---|---|
| ไม่พบ `node` | ติดตั้งเวอร์ชัน LTS จาก<a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (หรือขอเอเจนต์ของคุณว่า *"ช่วยติดตั้ง Node.js ให้หน่อย"*) แล้วลองใหม่อีกครั้ง |
| แอปเดสก์ท็อป Claude ขอให้ติดตั้ง Git (Windows) | แท็บ Code ต้องใช้<a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> ในการใช้งานครั้งแรก ติดตั้งแล้วรีสตาร์ทแอป |
| คำสั่ง `claude` หรือเมนู Plugins ไม่มีปฏิกิริยาใดๆ | คุณกำลังอยู่ใน**เซสชันบนคลาวด์** — ปลั๊กอินต้องใช้เซสชัน **Local** (หรือ SSH) |
| คีย์ถูกปฏิเสธหรือไม่มีคีย์ | ลงทะเบียนใหม่: `node skills/dubbing/scripts/connect.mjs` ตรวจสอบคีย์ที่จัดเก็บไว้ด้วย `npm run key:check` |
| ข้อผิดพลาดที่เกี่ยวข้องกับ ffmpeg | โดยปกติ ffmpeg จะถูกติดตั้งโดยอัตโนมัติ หากล้มเหลว ให้รัน `npm run doctor` |
| หยุดกลางคัน (เครดิตหมด, ขัดข้อง, โปรเซสถูกยกเลิก) | ความคืบหน้าจะถูกบันทึกอย่างต่อเนื่อง รันคำสั่ง **`--resume "<state-file>"`** ที่แสดงอยู่ในข้อความแจ้งเตือน — ส่วนที่เสร็จแล้วจะถูกข้ามและจะไม่ถูกคิดเงินซ้ำ |

---

## ความเป็นส่วนตัวและการเก็บข้อมูลทางไกล

`/dubbing` และ `/srt` ส่งข้อมูลการใช้งานเพื่อปรับปรุงสกิล — เช่น การทำงานที่รัน ว่าสำเร็จหรือไม่ ความยาวของสื่อ เวอร์ชันแอป และระบบปฏิบัติการ แต่ละอีเวนต์จะมี ID แบบสุ่มต่อการติดตั้งและหมายเลข workspace ของคุณกำกับไว้ คีย์ API และเนื้อหาสื่อของคุณจะไม่ถูกรวมไว้เด็ดขาด สามารถปิดการส่งข้อมูลได้ทุกเมื่อด้วย `PERSO_NO_TELEMETRY`

---

## โครงสร้างรีโพซิทอรี

```text
.claude-plugin/    ไฟล์ manifest ของปลั๊กอินและมาร์เก็ตเพลสของ Claude Code
.codex-plugin/     ไฟล์ manifest ของปลั๊กอิน Codex
docs/              หน้า Landing ของ GitHub Pages + README และ FAQ ฉบับแปล (12 ภาษา)
skills/dubbing/    สกิลพากย์เสียง (SKILL.md · lib/ · scripts/) — ครบในตัว
skills/srt/        สกิลคำบรรยาย SRT (SKILL.md · scripts/) — ใช้ lib/ ของสกิลพากย์เสียง
scripts/           ตัวติดตั้งระดับรีโพซิทอรี (install.mjs)
```

## สัญญาอนุญาต

โค้ดของสกิลนี้เผยแพร่ภายใต้ **[สัญญาอนุญาต MIT](../../LICENSE)** การพากย์เสียงจริงดำเนินการผ่าน Perso Dubbing API ดังนั้นการใช้งาน API จึงอยู่ภายใต้ [ข้อกำหนดการให้บริการของ Perso AI](https://perso.ai) และการคิดราคา
