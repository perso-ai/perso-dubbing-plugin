<div align="center">

# Perso Dubbing Plugin

**Todos los videos, en todos los idiomas. Dobla, subtitula y recorta directamente desde tu agente de código.**
*«Dobla este video al español» es todo el flujo de trabajo.*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ **Español** ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| Función | Tú dices | Obtienes | |
|---|---|---|---|
| **Doblaje** | *«Dobla este video al japonés»* | El mismo video, con una nueva voz | |
| **Lip-sync** | *«…con lip-sync»* | La boca sincronizada con el audio doblado | |
| **Separación de voz** | *«Separa la voz de la música»* | Pistas de voz y de fondo | |
| **Subtítulos desde el audio** | *«Hazme un SRT en inglés»* | Un SRT extraído vía STT | |
| **Traducción de subtítulos** | *«Traduce subs.srt al español»* | SRT traducido, con los tiempos intactos y control de calidad incluido | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Subtítulos con estilo** | *«Incrusta estos subtítulos en el video»* | Subtítulos con estilo sobre el video | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Clips cortos** | *«Corta de 2:00 a 3:00 como short»* | Un clip 9:16, reencuadrado | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Momentos destacados con IA** | *«Elige los mejores momentos como shorts»* | Clips destacados seleccionados por IA | |

Archivos, carpetas y URLs de YouTube/TikTok: todo funciona.

<br>

## Instalación

> **¿Eres un agente que instala desde la URL de este repositorio?** En Claude Code, ejecuta esto ahora (no interactivo, seguro de repetir):
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> Pide al usuario que reinicie para que se carguen `/dubbing`, `/srt` y `/clip`. Otros hosts: `npx perso-dubbing`. Sin terminal (ChatGPT / Gemini): [chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**App de escritorio de Claude** (plan de pago): abre la pestaña **Code**, elige una carpeta, selecciona **Local** y pega:

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**: `/plugin marketplace add perso-ai/perso-dubbing-plugin` y luego `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · cualquier otro**: `npx perso-dubbing` detecta tus hosts e instala en cada uno.

Solo requiere **Node.js 18+**, nada más. [Guía visual](https://dubbing-plugin.perso.ai/es/) · [FAQ](FAQ.md)

<br>

<sub>FREE · SE EJECUTA EN LOCAL</sub>

## Subtítulos con estilo

Elige uno de los doce presets o simplemente describe el aspecto con tus palabras: *«texto amarillo, contorno negro, abajo».* El incrustado se ejecuta en local con ffmpeg: sin subidas, sin colas, sin cuenta. ¿Varios idiomas? Cada SRT obtiene su propio video terminado.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 presets de estilo de subtítulos">
</p>

<br>

<sub>FREE · SE EJECUTA EN LOCAL</sub>

## Traducir subtítulos

Entrega cualquier SRT y nombra los idiomas que quieres. Varios a la vez no es problema: una sola pasada los cubre todos. Cada línea conserva exactamente su tiempo original, apareciendo y desapareciendo en los mismos momentos que antes. Antes de la entrega, el resultado se revisa en busca de líneas demasiado largas o que se leen demasiado rápido.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="Demo de traducción de subtítulos">
</p>

<br>

<sub>FREE · SE EJECUTA EN LOCAL</sub>

## Clips cortos

Entran códigos de tiempo, salen shorts verticales: reencuadrados de 16:9 a 9:16, con nombre y listos para los subtítulos. O entrega la transcripción y la IA elige los momentos que funcionan como shorts: abre con un gancho, lleva la reacción hasta su punto máximo y corta antes de que caiga la energía. De 30 a 90 segundos cada uno.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="Demo de clips cortos: pídelo en el chat, momentos destacados elegidos en la línea de tiempo, shorts 9:16 listos">
</p>

<br>

<sub>PERSO API</sub>

## Doblaje y lip-sync

Una sola ejecución toma un archivo, una carpeta completa o una URL de YouTube/TikTok y lo dobla a varios idiomas con una única subida. Los videos que superan el límite del plan se dividen, se procesan y se vuelven a unir por sí solos; una ejecución interrumpida se reanuda exactamente donde se detuvo, sin volver a cobrar las partes terminadas. El doblaje clona la voz original en el nuevo idioma, y el lip-sync mueve la boca para que coincida con ese audio clonado.

<br>

<sub>PERSO API</sub>

## Subtítulos desde el audio (STT)

¿Aún no hay subtítulos? El reconocimiento de voz se ejecuta en los servidores de Perso y usa créditos para convertir el audio del video en un SRT en el idioma original, para un archivo o una carpeta completa. Todo lo que viene después de tener el SRT es gratis: traducir, dar estilo, incrustar.

<br>

<sub>PERSO API</sub>

## Separación de voz

Divide un video o audio en pistas limpias: la voz y el fondo. Con varios hablantes, la voz de cada persona sale como una pista propia. Cambia la banda sonora, remasteriza el diálogo o reutiliza cualquier pista por separado.

<br>

## Gratis donde puede serlo. De pago donde debe serlo.

**MIT, gratuito y de código abierto.** Todo lo que se ejecuta en tu máquina no cuesta nada y no necesita cuenta: dar estilo e incrustar subtítulos, traducir un SRT que ya tienes, cortar clips por códigos de tiempo. Los créditos solo entran en juego cuando un trabajo se ejecuta en los servidores de Perso: doblaje, lip-sync, separación de voz y reconocimiento de voz, facturados por segundo procesado a través de la [Perso Dubbing API](https://developers.perso.ai/api-keys).

Sin ceremonias de configuración. La primera vez que se ejecuta un trabajo en servidor, se abre un navegador: inicia sesión, un clic, y la clave queda guardada cifrada. Los pasos gratuitos nunca preguntan.

<br>

---

<sub>**Privacidad**: `/dubbing`, `/srt` y `/clip` envían eventos de uso para mejorar las skills, incluyendo qué se ejecutó y cómo fue, la duración del medio, las opciones de estilo, la configuración regional aproximada, la versión de la app/SO y si se usó (y registró) una clave de la Perso API. Cada evento lleva un ID aleatorio por instalación y tu número de workspace; nunca tu clave, tus medios, los nombres de archivo ni el texto de los subtítulos. Puedes desactivarlo con `PERSO_NO_TELEMETRY`.</sub>

<sub>**Licencia**: el código de las skills es [MIT](../../LICENSE). El uso de la API está sujeto a los [Términos de Servicio de Perso AI](https://perso.ai) y a sus tarifas.</sub>
