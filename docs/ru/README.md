# 🎬 /dubbing — Автоматический дубляж видео с Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ **Русский** ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Навык (skill) для агентов программирования, который добавляет вашему агенту функцию **Dubbing (дубляж с помощью ИИ)** от [Perso AI](https://perso.ai). Он **автоматически дублирует** видео на другие языки — один файл или целую папку, а слишком большие или очень длинные материалы автоматически разбиваются на части, обрабатываются и снова объединяются. Также он умеет **синхронизировать движения губ (lip-sync)** в дублированном видео и **отделять голос от фонового звука**.

Под капотом он обращается к API Perso Dubbing, поэтому **необходим API-ключ Perso Dubbing.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Получить API-ключ</a>

Поскольку каждый хост использует единый стандарт **Agent Skills** (`SKILL.md`), навык работает одинаково независимо от того, куда вы его установили — просто выполните `/dubbing` или скажите «продублируй это видео».

---

## 🖥️ Проще всего — приложение Claude для компьютера (около 3 минут)

> 📖 **Предпочитаете наглядную инструкцию?** Откройте **[учебник по установке →](https://dubbing-plugin.perso.ai/?lang=en)** — выберите агента и скопируйте команды.

Терминал не нужен. В <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">приложении Claude для компьютера</a> (платный план):

1. **Откройте вкладку Code** (по центру сверху) и выберите любую папку — укажите окружение **Local** (плагины недоступны в облачных сессиях).
2. **Вставляйте команды по очереди** в поле ввода и нажимайте Enter:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Предпочитаете клики? После первой команды нажмите кнопку **+** рядом с полем ввода → **Plugins** → **Add plugin** → установите **perso-dubbing**.*
3. **Попросите продублировать видео** — например, «Продублируй это видео на английский — C:\videos\clip.mp4» (подойдёт и URL с YouTube, и целая папка). При первом запуске откроется файл для вашего <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API-ключа Perso</a> — вставьте ключ в этот файл, **а не в чат**. Если не указать `--out`, результат сохраняется рядом с исходным видео.

> 💡 Сам навык работает на **Node.js 18+**. Если на вашем ПК его нет, агент сообщит, что `node` не найден — просто ответьте «установи Node.js за меня» (или скачайте LTS-версию с <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>) и попробуйте снова.

В **Claude Code CLI** используйте вместо этого `/plugin marketplace add perso-ai/perso-dubbing-plugin` и `/plugin install perso-dubbing@perso-ai`.

---

## Установка на других хостах

Способ, который работает везде: вставьте URL этого репозитория в вашего агента и скажите «установи это».

> **🤖 Агенту:** Если вам дали только URL этого репозитория, выберите путь в зависимости от вашего хоста:
>
> - **Claude Code (приложение для компьютера или CLI):** **не** запускайте npx сразу же, даже если пользователь сказал «установи это». Покажите пользователю две команды из раздела *приложение Claude для компьютера* выше и попросите его ввести их самостоятельно, по одной в сообщении (это слэш-команды, которые вводит пользователь, и вы не можете их выполнить). Также упомяните путь с кликами в приложении для компьютера: после первой команды — **кнопка + → Plugins → Add plugin**. Если нужно скорректировать формулировку, переменная `CLAUDE_CODE_ENTRYPOINT=cli` в окружении shell указывает на сессию в терминале (недокументированный признак — если сомневаетесь, покажите оба пути). Используйте npx только если пользователь, увидев эти варианты, всё же хочет, чтобы установку выполнили вы.
> - **Codex · Cursor · Antigravity, или если пользователь поручил установку вам:** выполните эту единственную команду — она загрузит пакет, автоматически определит все установленные хосты и установит навык в каждый из них:
>
> ```bash
> npx perso-dubbing
> ```
>
> Если репозиторий уже клонирован, вместо этого выполните `node scripts/install.mjs` из корня репозитория (сеть не нужна).

<details>
<summary><b>Codex</b></summary>

Codex читает навыки из общей папки Agent Skills. Выполните `npx perso-dubbing --codex` или скопируйте вручную:

```text
~/.agents/skills/dubbing/        # личное (все репозитории) — текущий Codex
~/.codex/skills/dubbing/         # более старые версии Codex (установщик пишет в обе папки)
<repo>/.agents/skills/dubbing/   # только этот репозиторий
```

В репозитории также есть манифест плагина Codex (`.codex-plugin/plugin.json`) для установки через маркетплейс.

</details>

<details>
<summary><b>Cursor</b></summary>

Выполните `npx perso-dubbing --cursor` или скопируйте в:

```text
~/.cursor/skills/dubbing/        # глобально
.cursor/skills/dubbing/          # только этот проект
```

В репозитории есть манифест плагина Cursor (`.cursor-plugin/plugin.json`) для маркетплейса плагинов Cursor.

</details>

<details>
<summary><b>Antigravity</b></summary>

Выполните `npx perso-dubbing --antigravity` или скопируйте в одно из мест:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (общая папка Agent Skills)
```

</details>

<details>
<summary><b>⚡ Установка одной командой (любой хост)</b></summary>

Определяет, какие хосты у вас используются, и устанавливает навык во все — клонировать репозиторий не нужно:

```bash
npx perso-dubbing
```

- Только конкретный хост: `--claude` / `--antigravity` / `--codex` / `--cursor` · все сразу: `--all`
- Только текущий проект (`./.claude`, `./.agents`, …): `--project`

Репозиторий уже клонирован? `node scripts/install.mjs` из корня репозитория делает то же самое без обращения к сети.

</details>

<details>
<summary><b>🔧 Установка вручную</b></summary>

Скопируйте папку навыка в каталог навыков вашего хоста под именем **`dubbing`**. Из корня репозитория:

```bash
# macOS / Linux
mkdir -p <skills_folder>/dubbing && cp -r skills/dubbing/* <skills_folder>/dubbing/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>\dubbing; Copy-Item .\skills\dubbing\* <skills_folder>\dubbing\ -Recurse`

</details>

После установки введите **`/dubbing`** в вашем агенте или просто скажите **«продублируй это видео»**, чтобы запустить его.

---

## Примеры

Проще всего — просто скажите вашему агенту:

> «Продублируй это видео на английский — C:\videos\clip.mp4»

Также можно запускать CLI напрямую из корня репозитория:

```bash
# Одно видео (автоопределение исходного языка → английский)
npm run dub -- "clip.mp4" --target en --out result.mp4

# Несколько языков сразу (загрузка/разбиение выполняются один раз и переиспользуются для каждого языка)
npm run dub -- "clip.mp4" --target en,ja,zh

# Несколько источников сразу (можно смешивать URL, файлы и папки)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# Дубляж + синхронизация губ (движения рта подстраиваются под дублированную озвучку; дополнительные кредиты)
npm run dub -- "clip.mp4" --target en --lipsync

# Разделение дорожек голоса / фонового звука (без дубляжа)
npm run dub -- "clip.mp4" --separate
```

*(Эквивалентный прямой вызов: `node skills/dubbing/scripts/dubbing.mjs …` — либо `node scripts/dubbing.mjs …` из установленной папки навыка.)*

---

## Решение проблем

Остались вопросы? См. **[FAQ](FAQ.md)**.

| Симптом | Решение |
|---|---|
| Приложение Claude для компьютера запрашивает Git (Windows) | При первом использовании вкладке Code нужен <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git для Windows</a>. Установите его и перезапустите приложение. |
| Команды `claude` или меню Plugins не реагируют | Вы находитесь в **облачной сессии** — плагины работают только в сессиях **Local** (и SSH). Переключите окружение на Local и повторите. |
| `node` не найден / установка или запуск не удаются | Навык работает на **Node.js 18+** — проверьте командой `node -v`. Если его нет, установите LTS-версию с <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>, либо просто попросите Claude в сессии установить его за вас, а затем перезапустите приложение. |
| Пока нет API-ключа | Просто выполните любую команду дубляжа — файл ключа откроется автоматически; вставьте ключ и сохраните (он шифруется, а файл удаляется). Проверка вручную: `npm run key:check`. **Не вставляйте ключ в чат.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Получить API-ключ</a> |
| Ошибка, связанная с ffmpeg | Обычно ffmpeg устанавливается автоматически. Если это не удалось, выполните `npm run doctor`. |
| Останавливается на середине (кончились кредиты, сбой, процесс завершён) | Прогресс на протяжении всего выполнения сохраняется в файл состояния `*.dubresume.json`. Выполните команду **`--resume "<state-file>"`**, указанную в уведомлении, чтобы завершить только оставшиеся части (уже готовые части пропускаются автоматически). |

---

## Конфиденциальность и телеметрия

`/dubbing` отправляет **анонимные** события использования, чтобы улучшать навык — например, какое действие было выполнено (дубляж / синхронизация губ / разделение), успешно ли оно завершилось, языковую пару, версию приложения и ОС. Событие помечается только случайным идентификатором конкретной установки и никогда не включает ваш API-ключ, имена файлов или медиаконтент, учётную запись/email, а также идентификаторы рабочего пространства.

---

## Структура репозитория

```text
.claude-plugin/    Манифесты плагина и маркетплейса Claude Code
.codex-plugin/     Манифест плагина Codex
.cursor-plugin/    Манифест плагина Cursor
docs/              Лендинг GitHub Pages + переведённые README и FAQ (12 языков)
skills/dubbing/    Сам навык (SKILL.md · lib/ · scripts/) — автономный
scripts/           Установщик уровня репозитория (install.mjs)
```

## Лицензия

Код этого навыка распространяется по **[лицензии MIT](../../LICENSE)**. Сам дубляж выполняется через API Perso Dubbing, поэтому использование API регулируется [условиями использования Perso AI](https://perso.ai) и его тарифами.
