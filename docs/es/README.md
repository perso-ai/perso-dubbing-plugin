# 🎬 /dubbing — Doblaje automático de vídeo con Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ **Español** ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Una skill para agentes de programación que lleva el **Doblaje (doblaje con IA)** de [Perso AI](https://perso.ai) a tu agente. **Dobla automáticamente** vídeos a otros idiomas —un solo archivo o una carpeta entera—, e incluso los archivos demasiado grandes o muy largos se dividen, se procesan y se vuelven a unir automáticamente. También puede **sincronizar los labios** del vídeo doblado y **separar la voz del audio de fondo**.

Por debajo llama a la API de Doblaje de Perso, así que **se necesita una clave de API de Perso Dubbing.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Consigue una clave de API</a>

Como todos los hosts usan el mismo estándar de **Agent Skills** (`SKILL.md`), funciona igual dondequiera que lo instales: solo ejecuta `/dubbing` o di *«dóblame este vídeo»*.

---

## 🖥️ La forma más fácil — la app de escritorio de Claude (unos 3 minutos)

No hace falta terminal. En la <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">app de escritorio de Claude</a> (plan de pago):

1. **Abre la pestaña Code** (arriba en el centro) y elige cualquier carpeta; selecciona el entorno **Local** (los plugins no están disponibles en sesiones en la nube).
2. **Pega cada comando** en el cuadro de texto y pulsa Enter, uno por uno:

   ```text
   /plugin marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   /plugin install perso-dubbing@perso-ai
   ```

   *¿Prefieres hacer clic? Tras el primer comando, pulsa el botón **+** junto al cuadro de texto → **Plugins** → **Add plugin** → instala **perso-dubbing**.*
3. **Pide un doblaje** — p. ej. *«Dobla este vídeo al inglés — C:\videos\clip.mp4»* (también funciona una URL de YouTube o una carpeta entera). En la primera ejecución se abre un archivo de clave para tu <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">clave de API de Perso</a>: pega la clave en ese archivo, **no en el chat**. Salvo que uses `--out`, los resultados se guardan junto al vídeo de origen.

> 💡 La skill se ejecuta con **Node.js 18+**. Si tu PC no lo tiene, el agente dirá que no encuentra `node`: responde simplemente *«instálame Node.js»* (o descarga la LTS desde <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>) y vuelve a intentarlo.

Los mismos dos comandos `/plugin` también funcionan en la **CLI de Claude Code**.

---

## Instalar en otros hosts

El atajo que funciona en todas partes: pega la URL de este repositorio en tu agente y di *«instala esto»*.

> **🤖 Para el agente:** Si solo te han dado la URL de este repositorio, elige la ruta según tu host:
>
> - **Claude Code (app de escritorio o CLI):** **no** ejecutes npx de inmediato, aunque el usuario diga «instala esto». Muéstrale los dos comandos `/plugin` de la sección *app de escritorio de Claude* de arriba y pídele que los escriba él mismo, uno por mensaje (son comandos de barra que escribe el usuario y que tú no puedes ejecutar). Menciona también la ruta con clics en la app de escritorio: tras el primer comando, **botón + → Plugins → Add plugin**. Si necesitas ajustar el texto, `CLAUDE_CODE_ENTRYPOINT=cli` en tu entorno de shell sugiere una sesión de terminal (señal no documentada; cuando dudes, presenta ambas rutas). Recurre a npx solo si el usuario, tras verlo, aún quiere que te encargues de la instalación.
> - **Codex · Cursor · Antigravity, o el usuario te delegó la instalación:** ejecuta este único comando; descarga el paquete, detecta automáticamente todos los hosts instalados e instala la skill en cada uno:
>
> ```bash
> npx perso-dubbing
> ```
>
> Si el repositorio ya está clonado, ejecuta `node scripts/install.mjs` desde la raíz del repositorio (no hace falta red).

<details>
<summary><b>Codex</b></summary>

Codex lee las skills de la carpeta compartida de Agent Skills. Ejecuta `npx perso-dubbing --codex`, o copia manualmente:

```text
~/.agents/skills/dubbing/        # personal (todos los repos) — Codex actual
~/.codex/skills/dubbing/         # versiones antiguas de Codex (el instalador escribe ambas)
<repo>/.agents/skills/dubbing/   # solo este repositorio
```

El repositorio también incluye un manifiesto de plugin de Codex (`.codex-plugin/plugin.json`) para instalaciones basadas en marketplace.

</details>

<details>
<summary><b>Cursor</b></summary>

Ejecuta `npx perso-dubbing --cursor`, o copia en:

```text
~/.cursor/skills/dubbing/        # global
.cursor/skills/dubbing/          # solo este proyecto
```

El repositorio incluye un manifiesto de plugin de Cursor (`.cursor-plugin/plugin.json`) para el marketplace de plugins de Cursor.

</details>

<details>
<summary><b>Antigravity</b></summary>

Ejecuta `npx perso-dubbing --antigravity`, o copia en cualquiera de las dos ubicaciones:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (carpeta compartida de Agent Skills)
```

</details>

<details>
<summary><b>⚡ Instalador de una línea (cualquier host)</b></summary>

Detecta qué hosts usas y los instala en todos, sin necesidad de clonar:

```bash
npx perso-dubbing
```

- Solo un host concreto: `--claude` / `--antigravity` / `--codex` / `--cursor` · todos: `--all`
- Solo el proyecto actual (`./.claude`, `./.agents`, …): `--project`

¿Ya tienes el repositorio clonado? `node scripts/install.mjs` desde la raíz del repositorio hace lo mismo sin red.

</details>

<details>
<summary><b>🔧 Instalación manual</b></summary>

Copia la carpeta de la skill en el directorio de skills de tu host con el nombre **`dubbing`**. Desde la raíz del repositorio:

```bash
# macOS / Linux
mkdir -p <skills_folder>/dubbing && cp -r skills/dubbing/* <skills_folder>/dubbing/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>\dubbing; Copy-Item .\skills\dubbing\* <skills_folder>\dubbing\ -Recurse`

</details>

Tras instalar, escribe **`/dubbing`** en tu agente o simplemente di **«dóblame este vídeo»** para ejecutarlo.

---

## Ejemplos

La forma más fácil: solo dile a tu agente:

> «Dobla este vídeo al inglés — C:\videos\clip.mp4»

También puedes ejecutar la CLI directamente desde la raíz del repositorio:

```bash
# Un vídeo (detección automática del idioma de origen → inglés)
npm run dub -- "clip.mp4" --target en --out result.mp4

# Varios idiomas a la vez (se sube/divide una sola vez y se reutiliza por idioma)
npm run dub -- "clip.mp4" --target en,ja,zh

# Varias entradas a la vez (se pueden mezclar URLs, archivos y carpetas)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# Doblaje + sincronización labial (boca ajustada al audio doblado; créditos adicionales)
npm run dub -- "clip.mp4" --target en --lipsync

# Separar pistas de voz / audio de fondo (sin doblaje)
npm run dub -- "clip.mp4" --separate
```

*(Llamada directa equivalente: `node skills/dubbing/scripts/dubbing.mjs …` — o `node scripts/dubbing.mjs …` desde dentro de una carpeta de skill instalada.)*

---

## Solución de problemas

¿Tienes alguna duda primero? Consulta las **[Preguntas frecuentes (FAQ)](FAQ.md)**.

| Síntoma | Solución |
|---|---|
| La app de escritorio de Claude pide Git (Windows) | La pestaña Code necesita <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git para Windows</a> en el primer uso. Instálalo y reinicia la app. |
| Los comandos `/plugin` o el menú Plugins no hacen nada | Estás en una **sesión en la nube**: los plugins solo funcionan en sesiones **Local** (y SSH). Cambia el entorno a Local y reinténtalo. |
| `node` no encontrado / falla la instalación o la ejecución | La skill se ejecuta con **Node.js 18+** — compruébalo con `node -v`. Si falta, instala la LTS desde <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>, o pídele a Claude en la sesión que lo instale por ti y reinicia la app. |
| Aún no tienes clave de API | Simplemente ejecuta cualquier comando de doblaje: se abre un archivo de clave automáticamente; pega tu clave y guarda (se cifra y el archivo se elimina). Comprobación manual: `npm run key:check`. **No pegues la clave en el chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Consigue una clave de API</a> |
| Error relacionado con ffmpeg | ffmpeg normalmente se instala solo. Si falla, ejecuta `npm run doctor`. |
| Se detiene a mitad (sin créditos, fallo, proceso terminado) | El progreso se guarda en un archivo de estado `*.dubresume.json` durante toda la ejecución. Ejecuta el comando **`--resume "<state-file>"`** que aparece en el aviso para terminar solo las partes restantes (las completadas se omiten automáticamente). |

---

## Estructura del repositorio

```text
.claude-plugin/    Manifiestos de plugin y marketplace de Claude Code
.codex-plugin/     Manifiesto de plugin de Codex
.cursor-plugin/    Manifiesto de plugin de Cursor
docs/              README y FAQ traducidos (12 idiomas)
skills/dubbing/    La skill en sí (SKILL.md · lib/ · scripts/) — autónoma
scripts/           Instalador a nivel de repositorio (install.mjs)
```

## Privacidad y telemetría

Para mejorar la skill, `/dubbing` envía eventos de uso **anónimos** —por ejemplo, qué acción se ejecutó (doblaje / sincronización labial / separación), si tuvo éxito, el par de idiomas, la versión de la app y el sistema operativo. Se etiqueta únicamente con un ID aleatorio por instalación y nunca incluye tu clave de API, nombres de archivo ni contenido multimedia, cuenta/correo, ni IDs de espacio de trabajo.

## Licencia

El código de esta skill se distribuye bajo la **[Licencia MIT](../../LICENSE)**. El doblaje real se realiza a través de la API de Perso Dubbing, por lo que el uso de la API está sujeto a los [Términos de servicio de Perso AI](https://perso.ai) y a sus precios.
