# /dubbing — Preguntas frecuentes (FAQ)

[English](../../FAQ.md) ｜ [한국어](../ko/FAQ.md) ｜ **Español** ｜ [Português](../pt/FAQ.md) ｜ [Русский](../ru/FAQ.md) ｜ [Bahasa Indonesia](../id/FAQ.md) ｜ [Deutsch](../de/FAQ.md) ｜ [ไทย](../th/FAQ.md) ｜ [日本語](../ja/FAQ.md) ｜ [繁體中文](../zh-TW/FAQ.md) ｜ [简体中文](../zh-CN/FAQ.md) ｜ [Tiếng Việt](../vi/FAQ.md) ｜ [Français](../fr/FAQ.md)

Preguntas frecuentes sobre las skills `/dubbing` y `/srt`. Para la instalación y el uso, consulta el [README](README.md).

### ¿Qué necesito para usarla?

Node.js 18+ y una clave de API de Perso Dubbing. Instala la skill y luego solo di *«dóblame este vídeo»*. → [Consigue una clave de API](https://developers.perso.ai/api-keys)

### ¿Cómo registro mi clave de API?

En la primera ejecución se abre una página del navegador: inicia sesión y haz un clic, y tu clave se emite y se guarda cifrada en este equipo. No hay nada que copiar. Si no puede abrirse ningún navegador, se abre en su lugar un archivo de clave: pega en él **solo tu clave de API** y guarda (se cifra y el archivo se elimina). **Nunca pegues la clave en el chat.** Comprobación manual: `npm run key:check`.

### ¿Tiene coste?

El código de la skill es gratuito (MIT), pero el doblaje se realiza a través de la API de Perso, que cobra créditos.

### ¿Qué puedo darle como entrada?

Un archivo local, una carpeta local o una URL (YouTube, TikTok, Google Drive). Los vídeos demasiado grandes o muy largos se dividen, se procesan y se vuelven a unir automáticamente.

### ¿Puede doblar a varios idiomas o procesar muchos archivos a la vez?

Sí. Pon varios idiomas en un solo comando (`--target en,ja,zh`): la fuente se sube y se divide una vez, y luego se reutiliza por idioma. También puedes mezclar varios archivos, carpetas y URLs en una sola ejecución.

### ¿Dónde se guardan mis resultados?

Junto al vídeo de origen por defecto, o en la carpeta que indiques con `--out`. Cada ejecución también es un proyecto en tu portal de Perso (<https://perso.ai/en/workspace/vt>), donde puedes volver a descargarlo u obtener otros formatos.

### ¿Qué es la sincronización labial?

Ajusta los movimientos de la boca al audio doblado. Se ejecuta después del doblaje, funciona solo con vídeo, tarda bastante más y cuesta créditos adicionales. Añade `--lipsync`.

### ¿Qué es la separación de audio?

Divide la fuente en pistas de voz / fondo / fondo secundario, sin doblaje. Añade `--separate`.

### ¿Puede generar subtítulos (SRT) en lugar de doblar?

La skill **`/srt`** extrae los subtítulos en el idioma original de un vídeo, audio o URL mediante el reconocimiento de voz de Perso. Si además los quieres traducidos, pide el SRT indicando los idiomas que quieres.

### Se detuvo a mitad (sin créditos, un fallo o un shell terminado). ¿Y ahora qué?

El progreso se guarda en un archivo de estado durante toda la ejecución (`*.dubresume.json` para `/dubbing`, `*.srtresume.json` para `/srt`). Vuelve a ejecutar el comando `--resume "<state-file>"` que aparece para terminar solo las partes restantes: las completadas se omiten y nunca se vuelven a cobrar.

### Me quedé sin créditos. ¿Cómo recargo?

La skill puede generar un enlace de pago de Stripe (suscribirse, cambiar de plan o comprar créditos, según tu plan). Tú abres el enlace y pagas: el agente nunca paga en tu nombre. Tras recargar, continúa con el comando `--resume` que aparece.

### ¿Puedo doblar sin guardar un archivo local?

Sí, para un vídeo único (sin dividir): añade `--no-save`. El resultado permanece en tu espacio de trabajo de Perso y no se descarga. Los vídeos divididos sí se guardan normalmente, porque el archivo combinado necesita una descarga local.

### `node` no encontrado, ¿qué hago?

La skill necesita Node.js 18+. Compruébalo con `node -v`; instala la LTS desde <https://nodejs.org>, o simplemente pídele al agente que lo instale por ti y reinténtalo.

### ¿Cómo actualizo la skill?

`npx perso-dubbing@latest`, o en el plugin de Claude Code: `/plugin update perso-dubbing`.

### ¿Qué datos recopila la skill?

Solo eventos de uso —qué acción se ejecutó, si tuvo éxito, recuentos aproximados, versión de la app y sistema operativo— etiquetados con un ID aleatorio por instalación y tu número de espacio de trabajo. Tu clave de API y tu contenido multimedia nunca se incluyen.
