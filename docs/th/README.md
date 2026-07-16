# 🎬 /dubbing — พากย์เสียงวิดีโออัตโนมัติด้วย Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ **ไทย** ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

สกิลสำหรับเอเจนต์เขียนโค้ดที่นำ**การพากย์เสียง (การพากย์เสียงด้วย AI)** ของ [Perso AI](https://perso.ai) มาสู่เอเจนต์ของคุณ สกิลนี้จะ**พากย์เสียงวิดีโออัตโนมัติ**เป็นภาษาอื่น ไม่ว่าจะเป็นไฟล์เดียวหรือทั้งโฟลเดอร์ และแม้แต่ไฟล์สื่อที่มีขนาดใหญ่เกินไปหรือยาวมากก็จะถูกแบ่ง ประมวลผล และรวมกลับเข้าด้วยกันโดยอัตโนมัติ นอกจากนี้ยังสามารถ**ลิปซิงก์**วิดีโอที่พากย์เสียงแล้ว และ**แยกเสียงพูดออกจากเสียงพื้นหลัง**ได้อีกด้วย

แพ็กเกจนี้ยังมาพร้อมกับ **`/srt`** ซึ่งเป็นสกิลตัวที่สองที่ดึง**คำบรรยาย SRT** ออกจากวิดีโอ/เสียง/URL ผ่านระบบแปลงเสียงพูดเป็นข้อความของ Perso จากนั้นให้เอเจนต์ของคุณแปลคำบรรยายเป็นภาษาใดก็ได้ตามที่คุณขอ (หรือส่งมอบบทถอดเสียงภาษาต้นฉบับให้คุณตามเดิมก็ได้)

เบื้องหลังสกิลนี้เรียกใช้งาน Perso Dubbing API ดังนั้น**จึงต้องมีคีย์ API ของ Perso Dubbing** (คีย์เดียวใช้ได้กับทั้งสองสกิล) → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">รับคีย์ API</a>

เนื่องจากทุกโฮสต์ใช้**มาตรฐาน Agent Skills** (`SKILL.md`) เดียวกัน สกิลนี้จึงทำงานเหมือนกันไม่ว่าคุณจะติดตั้งไว้ที่ใด เพียงรัน `/dubbing` หรือพูดว่า *"พากย์วิดีโอนี้ให้หน่อย"* (หรือ `/srt` — *"ทำ SRT ภาษาอังกฤษของวิดีโอนี้ให้หน่อย"*)

---

## 🖥️ วิธีที่ง่ายที่สุด — แอปเดสก์ท็อป Claude (ประมาณ 3 นาที)

> 📖 **อยากได้คู่มือแบบภาพประกอบ?** ทำตาม **[บทแนะนำการติดตั้ง →](https://perso-ai.github.io/perso-dubbing-plugin/)** — เลือกเอเจนต์ของคุณแล้วคัดลอกคำสั่ง

ไม่ต้องใช้เทอร์มินัล ใน<a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">แอปเดสก์ท็อป Claude</a> (แผนแบบชำระเงิน):

1. **เปิดแท็บ Code** (ตรงกลางด้านบน) แล้วเลือกโฟลเดอร์ใดก็ได้ — เลือกสภาพแวดล้อม **Local** (ปลั๊กอินไม่สามารถใช้งานได้ในเซสชันบนคลาวด์)
2. **วางคำสั่งแต่ละคำสั่ง** ลงในกล่องพรอมป์แล้วกด Enter ทีละคำสั่ง:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *ชอบคลิกมากกว่า? หลังจากคำสั่งแรก ให้กดปุ่ม **+** ข้างกล่องพรอมป์ → **Plugins** → **Add plugin** → ติดตั้ง **perso-dubbing***
3. **ขอให้พากย์เสียง** — เช่น *"พากย์วิดีโอนี้เป็นภาษาอังกฤษ — C:\videos\clip.mp4"* (ใช้ URL ของ YouTube หรือทั้งโฟลเดอร์ก็ได้เช่นกัน) ในการรันครั้งแรกจะมีไฟล์คีย์เปิดขึ้นมาให้สำหรับ<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">คีย์ API ของ Perso</a> ของคุณ — วางคีย์ลงในไฟล์นั้น **ไม่ใช่ในแชท** หากไม่ได้ระบุ `--out` ผลลัพธ์จะถูกบันทึกไว้ข้างวิดีโอต้นฉบับ

> 💡 ตัวสกิลเองทำงานบน **Node.js 18+** หากพีซีของคุณยังไม่มี เอเจนต์จะแจ้งว่าไม่พบ `node` — เพียงตอบกลับว่า *"ช่วยติดตั้ง Node.js ให้หน่อย"* (หรือดาวน์โหลดเวอร์ชัน LTS จาก<a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>) แล้วลองใหม่อีกครั้ง

ใน **Claude Code CLI** ให้ใช้ `/plugin marketplace add perso-ai/perso-dubbing-plugin` และ `/plugin install perso-dubbing@perso-ai` แทน

---

## ติดตั้งบนโฮสต์อื่น

ทางลัดที่ใช้ได้ทุกที่: วาง URL ของรีโพซิทอรีนี้ลงในเอเจนต์ของคุณแล้วพูดว่า *"install this"*

> **🤖 ถึงเอเจนต์:** หากคุณได้รับเพียง URL ของรีโพซิทอรีนี้ ให้เลือกแนวทางตามโฮสต์ของคุณ:
>
> - **Claude Code (แอปเดสก์ท็อปหรือ CLI):** **อย่า** รัน npx ทันที — แม้ผู้ใช้จะบอกว่า "install this" ก็ตาม ให้แสดงคำสั่ง ทั้งสองคำสั่งจากส่วน *แอปเดสก์ท็อป Claude* ด้านบนแก่ผู้ใช้ และขอให้ผู้ใช้พิมพ์คำสั่งเหล่านั้นด้วยตนเอง ทีละข้อความ (คำสั่งเหล่านี้เป็นคำสั่งสแลชที่ผู้ใช้ต้องพิมพ์เอง คุณไม่สามารถรันแทนได้) นอกจากนี้ให้กล่าวถึงแนวทางการคลิกในแอปเดสก์ท็อปด้วย: หลังจากคำสั่งแรก **ปุ่ม + → Plugins → Add plugin** หากต้องปรับถ้อยคำให้เหมาะสม `CLAUDE_CODE_ENTRYPOINT=cli` ในสภาพแวดล้อมเชลล์ของคุณบ่งชี้ว่าเป็นเซสชันเทอร์มินัล (สัญญาณที่ไม่ได้บันทึกไว้เป็นทางการ — เมื่อไม่แน่ใจ ให้นำเสนอทั้งสองแนวทาง) ใช้ npx เป็นทางเลือกสำรองก็ต่อเมื่อผู้ใช้ยังต้องการให้คุณจัดการการติดตั้งหลังจากเห็นคำสั่งเหล่านั้นแล้วเท่านั้น
> - **Codex · Cursor · Antigravity หรือผู้ใช้มอบหมายให้คุณติดตั้งเอง:** รันคำสั่งเดียวนี้ — คำสั่งนี้จะดึงแพ็กเกจ ตรวจจับโฮสต์ที่ติดตั้งไว้ทั้งหมดโดยอัตโนมัติ และติดตั้งสกิลลงในแต่ละโฮสต์:
>
> ```bash
> npx perso-dubbing
> ```
>
> หากโคลนรีโพซิทอรีไว้แล้ว ให้รัน `node scripts/install.mjs` จากรากของรีโพซิทอรีแทน (ไม่ต้องใช้เครือข่าย)

<details>
<summary><b>Codex</b></summary>

Codex อ่านสกิลจากโฟลเดอร์ Agent Skills ที่ใช้ร่วมกัน รัน `npx perso-dubbing --codex` หรือคัดลอกด้วยตนเอง:

```text
~/.agents/skills/dubbing/        # ส่วนตัว (ทุกรีโพซิทอรี) — Codex เวอร์ชันปัจจุบัน
~/.codex/skills/dubbing/         # Codex เวอร์ชันเก่า (ตัวติดตั้งเขียนทั้งสองที่)
<repo>/.agents/skills/dubbing/   # เฉพาะรีโพซิทอรีนี้เท่านั้น
```

รีโพซิทอรีนี้ยังมีไฟล์ manifest ของปลั๊กอิน Codex (`.codex-plugin/plugin.json`) สำหรับการติดตั้งผ่านมาร์เก็ตเพลสด้วย

</details>

<details>
<summary><b>Cursor</b></summary>

รัน `npx perso-dubbing --cursor` หรือคัดลอกไปยัง:

```text
~/.cursor/skills/dubbing/        # ทั่วทั้งระบบ
.cursor/skills/dubbing/          # เฉพาะโปรเจกต์นี้เท่านั้น
```

รีโพซิทอรีนี้มีไฟล์ manifest ของปลั๊กอิน Cursor (`.cursor-plugin/plugin.json`) สำหรับมาร์เก็ตเพลสปลั๊กอินของ Cursor

</details>

<details>
<summary><b>Antigravity</b></summary>

รัน `npx perso-dubbing --antigravity` หรือคัดลอกไปยังตำแหน่งใดตำแหน่งหนึ่งต่อไปนี้:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (โฟลเดอร์ Agent Skills ที่ใช้ร่วมกัน)
```

</details>

<details>
<summary><b>⚡ ตัวติดตั้งคำสั่งเดียว (ทุกโฮสต์)</b></summary>

ตรวจจับโฮสต์ที่คุณใช้งานและติดตั้งลงในทุกโฮสต์นั้น — ไม่ต้องโคลนรีโพซิทอรี:

```bash
npx perso-dubbing
```

- เฉพาะโฮสต์ที่ระบุ: `--claude` / `--antigravity` / `--codex` / `--cursor` · ทั้งหมด: `--all`
- เฉพาะโปรเจกต์ปัจจุบัน (`./.claude`, `./.agents`, …): `--project`

โคลนรีโพซิทอรีไว้แล้วใช่ไหม? `node scripts/install.mjs` จากรากของรีโพซิทอรีทำสิ่งเดียวกันโดยไม่ต้องใช้เครือข่าย

</details>

<details>
<summary><b>🔧 ติดตั้งด้วยตนเอง</b></summary>

คัดลอก**ทั้งสอง**โฟลเดอร์สกิลไปยังไดเรกทอรี skills ของโฮสต์คุณ วางไว้เคียงข้างกัน (สกิล `srt` นำเข้าไลบรารีของสกิล `dubbing` จากโฟลเดอร์ข้างเคียง) จากรากของรีโพซิทอรี:

```bash
# macOS / Linux
mkdir -p <skills_folder> && cp -r skills/dubbing skills/srt <skills_folder>/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>; Copy-Item .\skills\dubbing,.\skills\srt <skills_folder>\ -Recurse`

</details>

ติดตั้งเสร็จแล้ว พิมพ์ **`/dubbing`** ในเอเจนต์ของคุณ หรือเพียงแค่พูดว่า **"พากย์วิดีโอนี้ให้หน่อย"** เพื่อรันสกิล — หรือ **`/srt`** / **"ทำ SRT ภาษาอังกฤษของวิดีโอนี้ให้หน่อย"** สำหรับคำบรรยาย (ทุกวิธีการติดตั้งข้างต้นจะติดตั้งให้ทั้งสองสกิล)

---

## ตัวอย่าง

วิธีที่ง่ายที่สุด — บอกเอเจนต์ของคุณตรงๆ:

> "พากย์วิดีโอนี้เป็นภาษาอังกฤษ — C:\videos\clip.mp4"

คุณยังสามารถรัน CLI ได้โดยตรงจากรากของรีโพซิทอรี:

```bash
# วิดีโอเดียว (ตรวจจับภาษาต้นฉบับอัตโนมัติ → ภาษาอังกฤษ)
npm run dub -- "clip.mp4" --target en --out result.mp4

# หลายภาษาในคำสั่งเดียว (อัปโหลด/แบ่งไฟล์ครั้งเดียว แล้วนำกลับมาใช้ซ้ำในแต่ละภาษา)
npm run dub -- "clip.mp4" --target en,ja,zh

# หลายอินพุตในคำสั่งเดียว (ผสม URL ไฟล์ และโฟลเดอร์ได้)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# พากย์เสียง + ลิปซิงก์ (ขยับปากให้ตรงกับเสียงที่พากย์; ใช้เครดิตเพิ่ม)
npm run dub -- "clip.mp4" --target en --lipsync

# แยกแทร็กเสียงพูด / เสียงพื้นหลัง (ไม่มีการพากย์เสียง)
npm run dub -- "clip.mp4" --separate

# ดึงคำบรรยายออกมาแล้วให้เอเจนต์แปล (สกิล /srt)
npm run srt -- "clip.mp4" --target en,ja

# บทถอดเสียงอย่างเดียว — SRT ภาษาต้นฉบับ ไม่มีการแปล
npm run srt -- "clip.mp4" --transcribe-only
```

*(การเรียกโดยตรงที่เทียบเท่ากัน: `node skills/dubbing/scripts/dubbing.mjs …` — หรือ `node scripts/dubbing.mjs …` จากภายในโฟลเดอร์สกิลที่ติดตั้งไว้)*

---

## การแก้ไขปัญหา

มีคำถามเพิ่มเติม? ดูที่ **[FAQ](FAQ.md)**

| อาการ | วิธีแก้ไข |
|---|---|
| แอปเดสก์ท็อป Claude ขอให้ติดตั้ง Git (Windows) | แท็บ Code ต้องใช้<a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> ในการใช้งานครั้งแรก ติดตั้งแล้วรีสตาร์ทแอป |
| คำสั่ง `claude` หรือเมนู Plugins ไม่มีปฏิกิริยาใดๆ | คุณกำลังอยู่ใน**เซสชันบนคลาวด์** — ปลั๊กอินใช้งานได้เฉพาะในเซสชัน **Local** (และ SSH) เท่านั้น เปลี่ยนสภาพแวดล้อมเป็น Local แล้วลองใหม่ |
| ไม่พบ `node` / การติดตั้งหรือรันล้มเหลว | สกิลนี้ทำงานบน **Node.js 18+** — ตรวจสอบด้วย `node -v` หากยังไม่มี ให้ติดตั้งเวอร์ชัน LTS จาก<a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> หรือขอให้ Claude ในเซสชันติดตั้งให้คุณ แล้วรีสตาร์ทแอป |
| ยังไม่มีคีย์ API | เพียงรันคำสั่งพากย์เสียงใดก็ได้ — ไฟล์คีย์จะเปิดขึ้นเองโดยอัตโนมัติ วางคีย์ของคุณแล้วบันทึก (คีย์จะถูกเข้ารหัสและไฟล์จะถูกลบทิ้ง) ตรวจสอบด้วยตนเอง: `npm run key:check` **อย่าวางคีย์ลงในแชท** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">รับคีย์ API</a> |
| ข้อผิดพลาดที่เกี่ยวข้องกับ ffmpeg | โดยปกติ ffmpeg จะถูกติดตั้งโดยอัตโนมัติ หากล้มเหลว ให้รัน `npm run doctor` |
| หยุดกลางคัน (เครดิตหมด, ขัดข้อง, โปรเซสถูกยกเลิก) | ความคืบหน้าจะถูกบันทึกลงในไฟล์สถานะตลอดการทำงาน (`*.dubresume.json` สำหรับ `/dubbing`, `*.srtresume.json` สำหรับ `/srt`) รันคำสั่ง **`--resume "<state-file>"`** ที่แสดงอยู่ในข้อความแจ้งเตือนเพื่อทำเฉพาะส่วนที่เหลือให้เสร็จ (ส่วนที่เสร็จแล้วจะถูกข้ามโดยอัตโนมัติ) |

---

## ความเป็นส่วนตัวและการเก็บข้อมูลทางไกล

`/dubbing` และ `/srt` ส่งข้อมูลการใช้งานแบบ**ไม่ระบุตัวตน**เพื่อปรับปรุงสกิล — เช่น การทำงานที่รัน (พากย์เสียง / ลิปซิงก์ / แยกเสียง / ดึงคำบรรยาย) ว่าสำเร็จหรือไม่ คู่ภาษาที่ใช้ ความยาวของสื่อ เวอร์ชันแอป และระบบปฏิบัติการ ข้อมูลนี้ติดแท็กด้วย ID แบบสุ่มต่อการติดตั้งเท่านั้น และไม่มีการรวมคีย์ API ชื่อไฟล์หรือเนื้อหาสื่อ บัญชี/อีเมล หรือ workspace ID ของคุณแต่อย่างใด สามารถปิดการส่งข้อมูลได้ทุกเมื่อด้วยตัวแปรสภาพแวดล้อม `PERSO_NO_TELEMETRY`

---

## โครงสร้างรีโพซิทอรี

```text
.claude-plugin/    ไฟล์ manifest ของปลั๊กอินและมาร์เก็ตเพลสของ Claude Code
.codex-plugin/     ไฟล์ manifest ของปลั๊กอิน Codex
.cursor-plugin/    ไฟล์ manifest ของปลั๊กอิน Cursor
docs/              หน้า Landing ของ GitHub Pages + README และ FAQ ฉบับแปล (12 ภาษา)
skills/dubbing/    สกิลพากย์เสียง (SKILL.md · lib/ · scripts/) — ครบในตัว
skills/srt/        สกิลคำบรรยาย SRT (SKILL.md · scripts/) — ใช้ lib/ ของสกิลพากย์เสียง
scripts/           ตัวติดตั้งระดับรีโพซิทอรี (install.mjs)
```

## สัญญาอนุญาต

โค้ดของสกิลนี้เผยแพร่ภายใต้ **[สัญญาอนุญาต MIT](../../LICENSE)** การพากย์เสียงจริงดำเนินการผ่าน Perso Dubbing API ดังนั้นการใช้งาน API จึงอยู่ภายใต้ [ข้อกำหนดการให้บริการของ Perso AI](https://perso.ai) และการคิดราคา
