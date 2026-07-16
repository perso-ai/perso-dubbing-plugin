# /dubbing — Perguntas frequentes (FAQ)

[English](../../FAQ.md) ｜ [한국어](../ko/FAQ.md) ｜ [Español](../es/FAQ.md) ｜ **Português** ｜ [Русский](../ru/FAQ.md) ｜ [Bahasa Indonesia](../id/FAQ.md) ｜ [Deutsch](../de/FAQ.md) ｜ [ไทย](../th/FAQ.md) ｜ [日本語](../ja/FAQ.md) ｜ [繁體中文](../zh-TW/FAQ.md) ｜ [简体中文](../zh-CN/FAQ.md) ｜ [Tiếng Việt](../vi/FAQ.md) ｜ [Français](../fr/FAQ.md)

Perguntas comuns sobre as skills `/dubbing` e `/srt`. Para instalação e uso, consulte o [README](README.md).

### O que eu preciso para usá-la?

Node.js 18+ e uma chave de API do Perso Dubbing. Instale a skill e depois basta dizer *"duble este vídeo para mim"*. → [Obtenha uma chave de API](https://developers.perso.ai/api-keys)

### Como registro minha chave de API?

Na primeira execução, um arquivo de chave abre automaticamente — cole **apenas a sua chave de API** nesse arquivo e salve (ela é criptografada e o arquivo é excluído). **Nunca cole a chave no chat.** Verificação manual: `npm run key:check`.

### Isso tem custo?

O código da skill é gratuito (MIT), mas a dublagem é executada através da API da Perso, que cobra créditos: dublagem ≈ 1 crédito/s, sincronização labial ≈ ×2, separação de áudio ≈ ×0,5. Fontes em 4K são cobradas ×3 nos planos pro/business/enterprise. A cobrança do servidor é a que prevalece.

### O que posso fornecer como entrada?

Um arquivo local, uma pasta inteira (em lote) ou uma URL — incluindo YouTube, TikTok, Google Drive e Vimeo. Vídeos grandes demais ou muito longos são divididos, processados e remontados automaticamente.

### Ela consegue dublar para vários idiomas ou processar muitos arquivos de uma vez?

Sim. Coloque vários idiomas em um único comando (`--target en,ja,zh`) — a fonte é enviada e dividida uma única vez, e depois reutilizada por idioma. Você também pode misturar vários arquivos, pastas e URLs em uma única execução.

### Onde meus resultados são salvos?

Por padrão, junto ao vídeo de origem, ou na pasta que você informar com `--out`. Cada execução também vira um projeto no seu portal da Perso (<https://portal.perso.ai>), onde você pode baixá-lo novamente ou obter outros formatos.

### O que é a sincronização labial?

Ela ajusta os movimentos da boca ao áudio dublado. É executada depois da dublagem, funciona apenas com vídeo, demora consideravelmente mais e custa créditos extras. Adicione `--lipsync`.

### O que é a separação de áudio?

Ela divide a fonte em faixas de voz / fundo / subfundo — sem envolver dublagem. Adicione `--separate`.

### Ela consegue gerar legendas (SRT) em vez de dublar?

Sim — o pacote também instala a skill **`/srt`**. Ela extrai as legendas no idioma original de um vídeo/áudio/URL usando o reconhecimento de fala da Perso, e seu agente então as traduz para os idiomas que você pedir (salvas como `<name>_<lang>_Subtitle.srt` junto ao arquivo original). Quer só a transcrição? Basta pedir — ele roda com `--transcribe-only`, sem tradução. Cada extração de legenda consome créditos proporcionalmente à duração da mídia (por idioma).

### Parou no meio do processo (sem créditos, uma falha ou um shell encerrado). E agora?

O progresso é salvo em um arquivo de estado durante toda a execução (`*.dubresume.json` para `/dubbing`, `*.srtresume.json` para `/srt`). Execute novamente o comando `--resume "<state-file>"` exibido para concluir apenas as partes restantes — as partes já concluídas são ignoradas e nunca são cobradas novamente.

### Fiquei sem créditos. Como faço para recarregar?

A skill pode gerar um link de pagamento do Stripe (assinar, mudar de plano ou comprar créditos, dependendo do seu plano). Você mesmo abre o link e paga — o agente nunca paga em seu nome. Depois de recarregar, retome com o comando `--resume` exibido.

### Posso dublar sem salvar um arquivo local?

Sim, para um único vídeo (não dividido): adicione `--no-save`. O resultado permanece no seu espaço de trabalho da Perso e não é baixado. Vídeos divididos ainda são salvos normalmente, porque o arquivo combinado precisa de um download local.

### `node` não foi encontrado — o que faço?

A skill precisa do Node.js 18+. Verifique com `node -v`; instale a versão LTS em <https://nodejs.org>, ou simplesmente peça ao agente para instalá-lo para você e tente novamente.

### Como atualizo a skill?

`npx perso-dubbing@latest`, ou no plugin do Claude Code: `/plugin update perso-dubbing`.

### Quais dados a skill coleta?

Apenas eventos de uso anônimos — qual ação foi executada, se teve sucesso, contagens aproximadas, versão do app e sistema operacional — identificados com um ID aleatório por instalação. Isso nunca inclui sua chave de API, nomes de arquivo ou conteúdo de mídia, conta/e-mail, ou IDs de espaço de trabalho.
