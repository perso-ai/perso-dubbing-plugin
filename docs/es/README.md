# 🎬 /dubbing — Doblaje automático de vídeo con Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ **Español** ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Una skill para agentes de programación que lleva el doblaje con IA de [Perso Dubbing](https://perso.ai/dubbing) a tu agente. Instálala una vez y luego solo di *«dobla este vídeo al inglés»*.

- ![gratis](https://img.shields.io/badge/%E2%9C%93%20gratis-2ea44f) **Subtítulos con estilo** — incrusta subtítulos listos para usar o con estilo personalizado en un vídeo. **La novedad estrella de esta versión.**
- ![gratis](https://img.shields.io/badge/%E2%9C%93%20gratis-2ea44f) **Traducir subtítulos** — convierte un SRT que ya tienes a cualquier idioma
- ![gratis](https://img.shields.io/badge/%E2%9C%93%20gratis-2ea44f) **Clips cortos** — recorta un vídeo largo en momentos destacados de formato corto y reencuadra 16:9 → 9:16
- **Dobla** a otro idioma — un solo archivo, una carpeta entera o una URL
- **Sincroniza los labios** del vídeo doblado para que la boca coincida con el nuevo audio
- **Separa** la voz del audio de fondo
- **Subtítulos a partir del habla** — extrae un SRT mediante reconocimiento de voz (o usa el tuyo → gratis)
- El contenido demasiado grande o muy largo se divide, se procesa y se vuelve a unir automáticamente

> **La skill es gratuita y de código abierto (MIT).** Todo lo que se ejecuta localmente en tu equipo no necesita **ni cuenta ni créditos** — incrustar subtítulos con estilo en un vídeo, traducir un SRT que ya tienes y recortar clips cortos. Los pasos de IA que se ejecutan en los servidores de Perso — doblaje, sincronización labial, separación de voz/fondo, reconocimiento de voz — usan créditos de la API de Perso Dubbing (**pagas solo por lo que procesas**).

Se ejecuta con **Node.js 18+**. Los pasos gratuitos nunca necesitan una clave; los pasos de IA del lado del servidor usan una **clave de API de Perso Dubbing**. Está construida sobre el estándar Agent Skills (`SKILL.md`), así que se comporta igual en Claude, Codex y Antigravity.

![Presets de estilo de subtítulos](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif)

---

## Instalación

> 📖 **[Tutorial visual →](https://dubbing-plugin.perso.ai/es/)** — elige tu agente y copia los comandos.

### App de escritorio de Claude — lo más fácil, sin terminal (unos 3 min)

En la <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">app de escritorio de Claude</a> (plan de pago):

1. Abre la **pestaña Code** (arriba en el centro), elige cualquier carpeta y selecciona el entorno **Local**: los plugins no funcionan en sesiones en la nube.
2. Pega este comando en el cuadro de texto y pulsa Enter:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
   ```

3. Pide un doblaje — *«Dobla este vídeo al inglés — C:\videos\clip.mp4»*. También funciona una URL de YouTube o una carpeta. Los resultados se guardan junto al vídeo de origen salvo que uses `--out`.

**CLI de Claude Code:** usa en su lugar `/plugin marketplace add perso-ai/perso-dubbing-plugin` y `/plugin install perso-dubbing@perso-ai`.

### Cualquier otro host

```bash
npx perso-dubbing
```

Detecta qué hosts tienes e instala ambas skills en cada uno, indicando dónde ha quedado cada una. Añade `--claude` / `--codex` / `--antigravity` para un solo host, `--all` para todos, o `--project` solo para el proyecto actual. ¿Ya tienes el repositorio clonado? `node scripts/install.mjs` desde la raíz del repositorio hace lo mismo, sin conexión.

<details>
<summary><b>🤖 Para el agente</b> — si solo te han dado la URL de este repositorio</summary>

- **Claude Code (app de escritorio o CLI):** ejecuta tú mismo este comando de instalación de una línea (no interactivo e idempotente, seguro de repetir):

  ```bash
  claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
  ```

  Cuando ambos terminen con éxito, dile al usuario que inicie una nueva sesión (o reinicie Claude Code): `/dubbing` y `/srt` se cargan a partir de la siguiente sesión. Solo si la CLI `claude` no está disponible en tu shell, recurre a mostrarle el comando de arriba para que lo escriba él mismo.
- **Codex · Antigravity, o el usuario te delegó la instalación:** ejecuta `npx perso-dubbing` (o `node scripts/install.mjs` si el repositorio ya está clonado).
- **ChatGPT (web/app — sin terminal en el equipo del usuario):** lee https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/chatgpt-setup.md y síguelo: primero pon **Codex** en marcha en el equipo del usuario — la instalación continúa allí. (¿Ya estás dentro de Codex con terminal? Usa la viñeta de arriba.)
- **Gemini (web/app — sin terminal en el equipo del usuario):** lee https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/gemini-setup.md y síguelo: primero instala **Antigravity** — la instalación continúa allí. (¿Ya estás dentro de Antigravity? Usa la viñeta de arriba.)

</details>

### Primera ejecución — tu clave de API

La clave solo se necesita cuando una acción usa la API de Perso (doblaje, sincronización labial, separación, extracción de SRT); los pasos sin conexión, como incrustar subtítulos con estilo en un vídeo local o traducir un SRT que tú proporcionas, nunca la piden. Cuando hace falta, se abre una página del navegador: inicia sesión y haz un clic, y tu clave se emite y se guarda cifrada en este equipo. No hay nada que copiar. Si no puede abrirse ningún navegador, se abre en su lugar un archivo de clave: pega ahí la clave y guarda, y el archivo se cifra y se elimina.

<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Consigue una clave de API</a> · compruébala cuando quieras con `npm run key:check`

---

## Uso

Solo dile a tu agente lo que quieres:

> «Dobla este vídeo al inglés — C:\videos\clip.mp4»
>
> «Dobla todos los vídeos de esta carpeta al japonés y al español»
>
> «Dobla este enlace de YouTube al inglés, con sincronización labial»
>
> «Separa la voz y la música de fondo de este clip»
>
> «Hazme un SRT en inglés de este vídeo»
>
> «Añade subtítulos con estilo a este vídeo — aquí tienes el SRT»
>
> «Recorta este vídeo de 2:00 a 3:00 como un short»

O escribe **`/dubbing`** / **`/srt`** para empezar. Para la lista completa de opciones de la CLI, pídele el modo de uso a tu agente o ejecuta `npm run dub -- --help`.

---

## Solución de problemas

¿Más dudas? Consulta las **[Preguntas frecuentes (FAQ)](FAQ.md)**.

| Síntoma | Solución |
|---|---|
| `node` no encontrado | Instala la LTS desde <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (o pídele a tu agente *«instálame Node.js»*) y reinténtalo. |
| La app de escritorio de Claude pide Git (Windows) | La pestaña Code necesita <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git para Windows</a> en el primer uso. Instálalo y reinicia la app. |
| Los comandos `claude` o el menú Plugins no hacen nada | Estás en una **sesión en la nube**: los plugins necesitan una sesión **Local** (o SSH). |
| Clave rechazada o ausente | Regístrala de nuevo: `node skills/dubbing/scripts/connect.mjs`. Comprueba la clave guardada con `npm run key:check`. |
| Error de ffmpeg | ffmpeg normalmente se instala solo; si falla, ejecuta `npm run doctor`. |
| Se detiene a mitad (sin créditos, fallo, proceso terminado) | El progreso se guarda continuamente. Ejecuta el comando **`--resume "<state-file>"`** que aparece en el aviso: las partes terminadas se omiten y nunca se vuelven a cobrar. |

---

## Privacidad y telemetría

`/dubbing`, `/srt` y `/clip` envían eventos de uso para mejorar las skills — qué acción se ejecutó y cómo resultó, la duración del contenido, las opciones de estilo, la configuración regional aproximada, la versión de la app/SO y si se usó (y está registrada) una clave de API de Perso. Cada evento lleva un ID aleatorio por instalación y tu número de espacio de trabajo; nunca tu clave, contenido, nombres de archivo ni texto de subtítulos. Desactívalo con `PERSO_NO_TELEMETRY`.

---

## Estructura del repositorio

```text
.claude-plugin/    Plugin de Claude Code + manifiestos del marketplace
.codex-plugin/     Manifiesto del plugin de Codex
docs/              Landing de GitHub Pages + README traducidos · FAQ (12 idiomas)
skills/dubbing/    La skill de doblaje (SKILL.md · lib/ · scripts/) — autónoma
skills/srt/        La skill de subtítulos SRT (SKILL.md · scripts/) — usa la lib/ de la skill de doblaje
skills/clip/       La skill de clips cortos (SKILL.md · lib/ · scripts/) — usa la lib/ de la skill de doblaje
scripts/           Instalador a nivel de repositorio (install.mjs)
```

## Licencia

El código de esta skill se distribuye bajo la **[Licencia MIT](../../LICENSE)**. El doblaje real se realiza a través de la API de Perso Dubbing, por lo que el uso de la API está sujeto a los [Términos de servicio de Perso AI](https://perso.ai) y a sus precios.
