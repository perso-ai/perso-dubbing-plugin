<div align="center">

# Perso Dubbing Plugin

**Todo vídeo, em qualquer idioma. Dubla, legenda e corta clipes direto do seu agente de código.**
*"Dubla este vídeo para o português" é todo o fluxo de trabalho.*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ **Português** ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| Recurso | Você diz | Você recebe | |
|---|---|---|---|
| **Dublagem** | *"Dubla este vídeo para o japonês"* | O mesmo vídeo, com nova voz | |
| **Lip-sync** | *"…com lip-sync"* | A boca sincronizada com o áudio dublado | |
| **Separação de voz** | *"Separa a voz da música"* | Faixas de voz e de fundo | |
| **Legendas a partir da fala** | *"Cria um SRT em inglês"* | Um SRT extraído via STT | |
| **Tradução de legendas** | *"Traduz o subs.srt para o espanhol"* | SRT traduzido, com timing intacto e revisão incluída | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Legendas estilizadas** | *"Grava estas legendas no vídeo"* | Legendas estilizadas no vídeo | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Clipes curtos** | *"Corta de 2:00 a 3:00 como um short"* | Um clipe 9:16, reenquadrado | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Destaques por IA** | *"Escolhe os melhores momentos para shorts"* | Clipes de destaque selecionados por IA | |

Arquivos, pastas e URLs do YouTube/TikTok funcionam do mesmo jeito.

<br>

## Instalação

> **Agente instalando a partir da URL deste repositório?** No Claude Code, execute agora (não interativo, seguro para reexecutar):
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> Peça ao usuário para reiniciar para que `/dubbing`, `/srt` e `/clip` sejam carregados. Outros hosts: `npx perso-dubbing`. Sem terminal (ChatGPT / Gemini): [chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**App desktop do Claude** (plano pago): abra a **aba Code**, escolha uma pasta, selecione **Local** e cole:

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**: `/plugin marketplace add perso-ai/perso-dubbing-plugin`, depois `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · qualquer outro**: `npx perso-dubbing` detecta seus hosts e instala em cada um.

Requer apenas **Node.js 18+**, nada mais. [Guia visual](https://dubbing-plugin.perso.ai/pt/) · [FAQ](FAQ.md)

<br>

<sub>FREE · RODA LOCALMENTE</sub>

## Legendas estilizadas

Escolha um dos doze presets ou simplesmente descreva o visual com suas palavras: *"texto amarelo, contorno preto, embaixo."* A gravação roda localmente no ffmpeg: sem upload, sem fila, sem conta. Vários idiomas? Cada SRT vira um vídeo finalizado.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 presets de estilo de legenda">
</p>

<br>

<sub>FREE · RODA LOCALMENTE</sub>

## Traduzir legendas

Entregue qualquer SRT e diga os idiomas que quiser. Pode pedir vários de uma vez, uma única passada cobre todos. Cada linha mantém exatamente o timing original, aparecendo e desaparecendo nos mesmos momentos de antes. Antes da entrega, o resultado é revisado em busca de linhas longas demais ou rápidas demais para ler.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="Demonstração de tradução de legendas">
</p>

<br>

<sub>FREE · RODA LOCALMENTE</sub>

## Clipes curtos

Timecodes entram, shorts verticais saem: reenquadrados de 16:9 para 9:16, nomeados e prontos para receber legendas. Ou entregue a transcrição e a IA escolhe os momentos que funcionam como shorts: abre com um gancho, leva a reação até o pico e corta antes de a energia cair. De 30 a 90 segundos cada.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="Demonstração de clipes curtos: peça no chat, destaques escolhidos na linha do tempo, shorts 9:16 prontos">
</p>

<br>

<sub>PERSO API</sub>

## Dublagem e lip-sync

Uma única execução aceita um arquivo, uma pasta inteira ou uma URL do YouTube/TikTok e dubla em vários idiomas a partir de um único upload. Vídeos acima do limite do plano são divididos, processados e remontados sozinhos; uma execução interrompida retoma exatamente de onde parou, sem cobrar de novo pelas partes concluídas. A dublagem clona a voz original no novo idioma, e o lip-sync move a boca para acompanhar esse áudio clonado.

<br>

<sub>PERSO API</sub>

## Legendas a partir da fala (STT)

Ainda não tem legendas? O reconhecimento de fala roda nos servidores da Perso e usa créditos para transformar o áudio do vídeo em um SRT no idioma original, para um arquivo ou uma pasta inteira. Tudo o que vem depois de o SRT existir é grátis: traduzir, estilizar, gravar no vídeo.

<br>

<sub>PERSO API</sub>

## Separação de voz

Divide um vídeo ou áudio em faixas limpas: a voz e o fundo. Com vários falantes, a voz de cada pessoa sai como uma faixa própria. Troque a trilha sonora, remasterize o diálogo ou reutilize qualquer faixa separadamente.

<br>

## Grátis onde pode ser. Pago onde precisa ser.

**MIT, gratuito e de código aberto.** Tudo o que roda na sua máquina não custa nada e não exige conta: estilizar e gravar legendas, traduzir um SRT que você já tem, cortar clipes por timecode. Créditos só entram quando um trabalho roda nos servidores da Perso: dublagem, lip-sync, separação de voz e reconhecimento de fala, cobrados por segundo processado via [Perso Dubbing API](https://developers.perso.ai/api-keys).

Sem cerimônia de configuração. Na primeira vez que um trabalho de servidor roda, um navegador abre: faça login, um clique, e a chave fica armazenada criptografada. As etapas gratuitas nunca pedem nada.

<br>

---

<sub>**Privacidade**: `/dubbing`, `/srt` e `/clip` enviam eventos de uso anônimos para melhorar as skills, cobrindo o que rodou e como foi, duração da mídia, escolhas de estilo, localidade aproximada, versão do app/SO e se uma chave da Perso API foi usada (e registrada). Cada evento tem um ID aleatório por instalação e o número do seu workspace; nunca sua chave, mídia, nomes de arquivo ou texto de legendas. Desative com `PERSO_NO_TELEMETRY`.</sub>

<sub>**Licença**: o código das skills é [MIT](../../LICENSE). O uso da API está sujeito aos [Termos de Serviço da Perso AI](https://perso.ai) e à sua tabela de preços.</sub>
