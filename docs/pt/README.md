# 🎬 /dubbing — Dublagem automática de vídeo com Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ **Português** ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Uma skill para agentes de programação que traz a **Dublagem (dublagem com IA)** da [Perso AI](https://perso.ai) para o seu agente. Ela **dubla automaticamente** vídeos para outros idiomas — um único arquivo ou uma pasta inteira —, e até mídias grandes demais ou muito longas são divididas, processadas e remontadas automaticamente. Ela também pode fazer a **sincronização labial** do vídeo dublado e **separar a voz do áudio de fundo**.

O pacote também traz a skill **`/srt`** — uma segunda skill que extrai **legendas SRT** de um vídeo/áudio/URL usando o reconhecimento de fala da Perso, e então faz com que seu agente as traduza para os idiomas que você pedir (ou te entrega a transcrição no idioma original, sem tradução).

Por baixo dos panos, ela chama a API de Dublagem da Perso, então **é necessária uma chave de API do Perso Dubbing** (uma única chave cobre as duas skills). → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Obtenha uma chave de API</a>

Como todo host usa o mesmo padrão de **Agent Skills** (`SKILL.md`), ela funciona da mesma forma onde quer que você a instale — basta executar `/dubbing` ou dizer *"duble este vídeo para mim"* (ou `/srt` — *"crie um SRT em inglês para este vídeo"*).

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 🖥️ Forma mais fácil — o app de desktop do Claude (cerca de 3 minutos)

> 📖 **Prefere um passo a passo visual?** Siga o **[tutorial de instalação →](https://dubbing-plugin.perso.ai/pt/)** — escolha seu agente e copie os comandos.

Não é preciso terminal. No <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">app de desktop do Claude</a> (plano pago):

1. **Abra a aba Code** (parte superior central) e escolha qualquer pasta — selecione o ambiente **Local** (os plugins não estão disponíveis em sessões na nuvem).
2. **Cole cada comando** na caixa de prompt e pressione Enter, um de cada vez:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Prefere clicar? Depois do primeiro comando, pressione o botão **+** ao lado da caixa de prompt → **Plugins** → **Add plugin** → instale **perso-dubbing**.*
3. **Peça uma dublagem** — por exemplo, *"Duble este vídeo para o inglês — C:\videos\clip.mp4"* (uma URL do YouTube ou uma pasta inteira também funcionam). Na primeira execução, um arquivo de chave é aberto para a sua <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">chave de API da Perso</a> — cole a chave nesse arquivo, **não no chat**. A menos que você use `--out`, os resultados são salvos junto ao vídeo de origem.

> 💡 A skill em si roda em **Node.js 18+**. Se o seu PC não tiver o Node.js, o agente dirá que não encontrou o `node` — basta responder *"instale o Node.js para mim"* (ou baixar a versão LTS em <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>) e tentar novamente.

Na **CLI do Claude Code**, use `/plugin marketplace add perso-ai/perso-dubbing-plugin` e `/plugin install perso-dubbing@perso-ai` no lugar.

---

## Instalar em outros hosts

O atalho que funciona em qualquer lugar: cole a URL deste repositório no seu agente e diga *"instale isto"*.

> **🤖 Para o agente:** Se você recebeu apenas a URL deste repositório, escolha o caminho para o seu host:
>
> - **Claude Code (app de desktop ou CLI):** **não** execute o npx imediatamente — mesmo que o usuário diga "instale isto". Mostre ao usuário os dois comandos da seção *app de desktop do Claude* acima e peça que ele mesmo digite os comandos, um por mensagem (são comandos de barra digitados pelo usuário que você não pode executar). Mencione também o caminho por cliques no app de desktop: depois do primeiro comando, **botão + → Plugins → Add plugin**. Se precisar ajustar o texto, `CLAUDE_CODE_ENTRYPOINT=cli` no ambiente do seu shell sugere uma sessão de terminal (sinal não documentado — na dúvida, apresente os dois caminhos). Recorra ao npx somente se o usuário, depois de ver as opções, ainda quiser que você cuide da instalação.
> - **Codex · Cursor · Antigravity, ou o usuário delegou a instalação a você:** execute este único comando — ele baixa o pacote, detecta automaticamente todos os hosts instalados e instala a skill em cada um deles:
>
> ```bash
> npx perso-dubbing
> ```
>
> Se o repositório já estiver clonado, execute `node scripts/install.mjs` a partir da raiz do repositório (não é necessária conexão de rede).

<details>
<summary><b>Codex</b></summary>

O Codex lê as skills da pasta compartilhada do Agent Skills. Execute `npx perso-dubbing --codex`, ou copie manualmente:

```text
~/.agents/skills/dubbing/        # pessoal (todos os repositórios) — Codex atual
~/.codex/skills/dubbing/         # versões antigas do Codex (o instalador grava em ambas)
<repo>/.agents/skills/dubbing/   # somente este repositório
```

O repositório também traz um manifesto de plugin do Codex (`.codex-plugin/plugin.json`) para instalações via marketplace.

</details>

<details>
<summary><b>Cursor</b></summary>

Execute `npx perso-dubbing --cursor`, ou copie para:

```text
~/.cursor/skills/dubbing/        # global
.cursor/skills/dubbing/          # somente este projeto
```

O repositório traz um manifesto de plugin do Cursor (`.cursor-plugin/plugin.json`) para o marketplace de plugins do Cursor.

</details>

<details>
<summary><b>Antigravity</b></summary>

Execute `npx perso-dubbing --antigravity`, ou copie para um dos dois locais:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (pasta compartilhada do Agent Skills)
```

</details>

<details>
<summary><b>⚡ Instalador de uma linha (qualquer host)</b></summary>

Detecta quais hosts você usa e instala em todos eles — sem precisar clonar:

```bash
npx perso-dubbing
```

- Apenas um host específico: `--claude` / `--antigravity` / `--codex` / `--cursor` · todos: `--all`
- Apenas o projeto atual (`./.claude`, `./.agents`, …): `--project`

Já tem o repositório clonado? `node scripts/install.mjs` a partir da raiz do repositório faz o mesmo sem precisar de rede.

</details>

<details>
<summary><b>🔧 Instalação manual</b></summary>

Copie **as duas** pastas de skill para o diretório de skills do seu host, lado a lado (a skill `srt` importa as bibliotecas da skill `dubbing` a partir da pasta irmã). A partir da raiz do repositório:

```bash
# macOS / Linux
mkdir -p <skills_folder> && cp -r skills/dubbing skills/srt <skills_folder>/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>; Copy-Item .\skills\dubbing,.\skills\srt <skills_folder>\ -Recurse`

</details>

Depois de instalar, digite **`/dubbing`** no seu agente ou apenas diga **"duble este vídeo para mim"** para executá-lo — ou **`/srt`** / **"crie um SRT em inglês para este vídeo"** para legendas. (Todo método de instalação acima instala as duas skills.)

---

## Exemplos

A forma mais fácil — basta dizer ao seu agente:

> "Duble este vídeo para o inglês — C:\videos\clip.mp4"

Você também pode executar a CLI diretamente a partir da raiz do repositório:

```bash
# Um vídeo (detecção automática do idioma de origem → inglês)
npm run dub -- "clip.mp4" --target en --out result.mp4

# Vários idiomas de uma vez (enviado/dividido uma única vez, reutilizado por idioma)
npm run dub -- "clip.mp4" --target en,ja,zh

# Várias entradas de uma vez (é possível misturar URLs, arquivos e pastas)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# Dublagem + sincronização labial (boca ajustada ao áudio dublado; créditos extras)
npm run dub -- "clip.mp4" --target en --lipsync

# Separar faixas de voz / áudio de fundo (sem dublagem)
npm run dub -- "clip.mp4" --separate

# Extrair legendas e fazer o agente traduzi-las (skill /srt)
npm run srt -- "clip.mp4" --target en,ja

# Somente transcrição — SRT no idioma original, sem tradução
npm run srt -- "clip.mp4" --transcribe-only
```

*(Chamada direta equivalente: `node skills/dubbing/scripts/dubbing.mjs …` — ou `node scripts/dubbing.mjs …` de dentro de uma pasta de skill instalada.)*

---

## Solução de problemas

Mais dúvidas? Consulte o **[FAQ](FAQ.md)**.

| Sintoma | Solução |
|---|---|
| O app de desktop do Claude pede o Git (Windows) | A aba Code precisa do <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git para Windows</a> no primeiro uso. Instale-o e reinicie o app. |
| Os comandos `claude` ou o menu Plugins não fazem nada | Você está em uma **sessão na nuvem** — os plugins só funcionam em sessões **Local** (e SSH). Mude o ambiente para Local e tente novamente. |
| `node` não encontrado / instalação ou execução falha | A skill roda em **Node.js 18+** — verifique com `node -v`. Se estiver faltando, instale a versão LTS em <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>, ou simplesmente peça ao Claude na sessão para instalá-lo para você e reinicie o app. |
| Ainda não tem uma chave de API | Basta executar qualquer comando de dublagem — um arquivo de chave abre automaticamente; cole sua chave e salve (ele é criptografado e o arquivo é excluído). Verificação manual: `npm run key:check`. **Não cole a chave no chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Obtenha uma chave de API</a> |
| Erro relacionado ao ffmpeg | O ffmpeg normalmente é instalado automaticamente. Se falhar, execute `npm run doctor`. |
| Para no meio do processo (sem créditos, falha, processo encerrado) | O progresso é salvo em um arquivo de estado durante toda a execução (`*.dubresume.json` para `/dubbing`, `*.srtresume.json` para `/srt`). Execute o comando **`--resume "<state-file>"`** mostrado no aviso para concluir apenas as partes restantes (as partes já concluídas são ignoradas automaticamente). |

---

## Privacidade e telemetria

`/dubbing` e `/srt` enviam eventos de uso **anônimos** para melhorar as skills — por exemplo, qual ação foi executada (dublagem / sincronização labial / separação / extração de legendas), se teve sucesso, o par de idiomas, a duração da mídia, a versão do app e o sistema operacional. Isso é identificado apenas com um ID aleatório por instalação e nunca inclui sua chave de API, nomes de arquivo ou conteúdo de mídia, conta/e-mail, ou IDs de espaço de trabalho. Desative quando quiser com a variável de ambiente `PERSO_NO_TELEMETRY`.

---

## Estrutura do repositório

```text
.claude-plugin/    Manifestos de plugin e marketplace do Claude Code
.codex-plugin/     Manifesto de plugin do Codex
.cursor-plugin/    Manifesto de plugin do Cursor
docs/              Landing do GitHub Pages + README e FAQ traduzidos (12 idiomas)
skills/dubbing/    A skill de dublagem (SKILL.md · lib/ · scripts/) — autônoma
skills/srt/        A skill de legendas SRT (SKILL.md · scripts/) — usa o lib/ da skill de dublagem
scripts/           Instalador em nível de repositório (install.mjs)
```

## Licença

O código desta skill é distribuído sob a **[Licença MIT](../../LICENSE)**. A dublagem em si é realizada através da API de Dublagem da Perso, portanto o uso da API está sujeito aos [Termos de Serviço da Perso AI](https://perso.ai) e aos seus preços.
