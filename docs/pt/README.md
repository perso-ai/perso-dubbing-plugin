# 🎬 /dubbing — Dublagem automática de vídeo com Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ **Português** ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Uma skill para agentes de programação que traz a dublagem com IA da [Perso Dubbing](https://perso.ai/dubbing) para o seu agente. Instale uma vez e depois basta dizer *"duble este vídeo para o inglês"*.

- **Duble** para outro idioma — um único arquivo, uma pasta inteira ou uma URL
- **Sincronize os lábios** do vídeo dublado para que a boca acompanhe o novo áudio
- **Separe** a voz do áudio de fundo
- **Legendas** (`/srt`) — extraia um SRT por reconhecimento de fala e depois seu agente o traduz
- Mídias grandes demais ou muito longas são divididas, processadas e remontadas automaticamente

Roda em **Node.js 18+** e precisa de uma **chave de API do Perso Dubbing**. É construída sobre o padrão Agent Skills (`SKILL.md`), então se comporta de forma idêntica no Claude, no Codex, no Cursor e no Antigravity.

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## Instalação

> 📖 **[Tutorial visual →](https://dubbing-plugin.perso.ai/pt/)** — escolha seu agente e copie os comandos.

### App de desktop do Claude — o mais fácil, sem terminal (cerca de 3 min)

No <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">app de desktop do Claude</a> (plano pago):

1. Abra a **aba Code** (parte superior central), escolha qualquer pasta e selecione o ambiente **Local** — os plugins não funcionam em sessões na nuvem.
2. Cole cada comando na caixa de prompt e pressione Enter, um de cada vez:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Prefere clicar? Depois do primeiro comando: botão **+** → **Plugins** → **Add plugin** → **perso-dubbing**.*
3. Peça uma dublagem — *"Duble este vídeo para o inglês — C:\videos\clip.mp4"*. Uma URL do YouTube ou uma pasta também funcionam. Os resultados são salvos junto ao vídeo de origem, a menos que você use `--out`.

**CLI do Claude Code:** use `/plugin marketplace add perso-ai/perso-dubbing-plugin` e `/plugin install perso-dubbing@perso-ai` no lugar.

### Qualquer outro host

```bash
npx perso-dubbing
```

Detecta quais hosts você tem e instala as duas skills em cada um, informando onde cada uma foi instalada. Adicione `--claude` / `--codex` / `--cursor` / `--antigravity` para um único host, `--all` para todos, ou `--project` apenas para o projeto atual. Já clonou o repositório? `node scripts/install.mjs` a partir da raiz do repositório faz o mesmo, offline.

> **🤖 Para o agente:** se você recebeu apenas a URL deste repositório:
>
> - **Claude Code (app de desktop ou CLI):** **não** execute o npx, mesmo que o usuário diga "instale isto". Mostre a ele os dois comandos `claude …` acima e peça que ele mesmo os digite (são comandos de barra digitados pelo usuário que você não pode executar), além do caminho por cliques: botão **+** → **Plugins** → **Add plugin**. Recorra ao npx somente se, depois disso, ele ainda quiser que você cuide da instalação.
> - **Codex · Cursor · Antigravity, ou o usuário delegou a instalação a você:** execute `npx perso-dubbing` (ou `node scripts/install.mjs` se o repositório já estiver clonado).

### Primeira execução — sua chave de API

Uma página do navegador é aberta: faça login e clique uma vez, e sua chave é emitida e armazenada criptografada nesta máquina. Não há nada para copiar. Se nenhum navegador puder ser aberto, um arquivo de chave é aberto no lugar: cole a chave nele e salve, e o arquivo é criptografado e excluído.

**Nunca cole sua chave de API no chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Obtenha uma chave de API</a> · verifique quando quiser com `npm run key:check`

---

## Uso

Basta dizer ao seu agente o que você quer:

> "Duble este vídeo para o inglês — C:\videos\clip.mp4"
>
> "Duble todos os vídeos desta pasta para japonês e espanhol"
>
> "Duble este link do YouTube para o inglês, com sincronização labial"
>
> "Separe a voz e a música de fundo deste clipe"
>
> "Crie um SRT em inglês para este vídeo"

Ou digite **`/dubbing`** / **`/srt`** para começar. Para a lista completa de opções da CLI, peça o modo de uso ao seu agente ou execute `npm run dub -- --help`.

---

## Solução de problemas

Mais dúvidas? Consulte o **[FAQ](FAQ.md)**.

| Sintoma | Solução |
|---|---|
| `node` não encontrado | Instale a versão LTS em <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (ou peça ao seu agente *"instale o Node.js para mim"*) e tente novamente. |
| O app de desktop do Claude pede o Git (Windows) | A aba Code precisa do <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git para Windows</a> no primeiro uso. Instale-o e reinicie o app. |
| Os comandos `claude` ou o menu Plugins não fazem nada | Você está em uma **sessão na nuvem** — os plugins precisam de uma sessão **Local** (ou SSH). |
| Chave rejeitada ou ausente | Registre-a novamente: `node skills/dubbing/scripts/connect.mjs`. Verifique a chave armazenada com `npm run key:check`. |
| Erro do ffmpeg | O ffmpeg normalmente é instalado sozinho; se falhar, execute `npm run doctor`. |
| Para no meio do processo (sem créditos, falha, processo encerrado) | O progresso é salvo continuamente. Execute o comando **`--resume "<state-file>"`** mostrado no aviso — as partes concluídas são ignoradas e nunca cobradas novamente. |

---

## Privacidade e telemetria

`/dubbing` e `/srt` enviam eventos de uso para melhorar as skills — por exemplo, qual ação foi executada, se teve sucesso, a duração da mídia, a versão do app e o sistema operacional. Cada evento carrega um ID aleatório por instalação e o número do seu espaço de trabalho. Sua chave de API e sua mídia nunca são incluídas. Desative quando quiser com `PERSO_NO_TELEMETRY`.

---

## Estrutura do repositório

```text
.claude-plugin/    Plugin do Claude Code + manifestos do marketplace
.codex-plugin/     Manifesto do plugin do Codex
.cursor-plugin/    Manifesto do plugin do Cursor
docs/              Landing do GitHub Pages + READMEs traduzidos · FAQ (12 idiomas)
skills/dubbing/    A skill de dublagem (SKILL.md · lib/ · scripts/) — autossuficiente
skills/srt/        A skill de legendas SRT (SKILL.md · scripts/) — usa a lib/ da skill de dublagem
scripts/           Instalador no nível do repositório (install.mjs)
```

## Licença

O código desta skill é distribuído sob a **[Licença MIT](../../LICENSE)**. A dublagem em si é realizada através da API de Dublagem da Perso, portanto o uso da API está sujeito aos [Termos de Serviço da Perso AI](https://perso.ai) e aos seus preços.
