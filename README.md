# Site Azuton

Site institucional da Azuton em três idiomas — português, inglês e espanhol —
com formulários que entregam os leads por e-mail via Resend.

Nove páginas, cada uma gerada nos três idiomas no momento do build: 27 páginas
HTML estáticas servidas por um servidor Node enxuto, que só faz duas coisas —
entregar os arquivos e receber os formulários.

---

## Como rodar na sua máquina

```bash
npm install
cp .env.example .env    # preencha as variáveis (veja abaixo)
npm run dev             # build + servidor em http://localhost:3000
```

Comandos separados, se preferir:

```bash
npm run build   # gera dist/
npm start       # sobe o servidor (exige dist/ pronto)
npm run check   # confere o dist: páginas, links, hreflang, títulos
```

---

## Variáveis de ambiente

Copie de `.env.example`. Na Railway elas entram em **Variables**, nunca no repositório.

| Variável | Obrigatória | Para quê |
|---|---|---|
| `RESEND_API_KEY` | sim, para enviar e-mail | Chave da API do Resend |
| `LEAD_FROM` | sim | Remetente. O domínio precisa estar **verificado no Resend** |
| `LEAD_TO` | sim | Destino padrão dos leads. Vários e-mails separados por vírgula |
| `LEAD_TO_PORTABILIDADE` | não | Destino do formulário de portabilidade. Sem ela, cai no `LEAD_TO` |
| `LEAD_BCC` | não | Cópia oculta |
| `LEAD_REPLY_TO_LEAD` | não (padrão `true`) | Faz o "Responder" ir direto para o lead |
| `SITE_URL` | sim, em produção | Domínio público. Alimenta canonical, hreflang e sitemap |
| `LEGACY_BASE` | não (padrão `https://azuton.com`) | Para onde apontam as páginas ainda não migradas |
| `PORT` | não | A Railway define sozinha |
| `WHATSAPP_FALLBACK` | não | WhatsApp usado quando o e-mail falha |

**Sem `RESEND_API_KEY` o site funciona normalmente** — só que o formulário
responde 503 e o navegador cai para o WhatsApp. Nenhum lead se perde.

---

## Subir para o GitHub

O repositório já vem com o commit inicial feito. Na sua máquina:

```bash
tar -xzf azuton-site.tar.gz
cd azuton-site

git remote add origin git@github.com:SEU-USUARIO/azuton-site.git
git branch -M main
git push -u origin main
```

Se preferir HTTPS, troque a URL do remote por
`https://github.com/SEU-USUARIO/azuton-site.git`.

Crie o repositório vazio antes, em <https://github.com/new>, **sem** README,
`.gitignore` ou licença — eles já existem aqui e criariam conflito.

---

## Deploy na Railway

1. **New Project → Deploy from GitHub repo** e escolha `azuton-site`.
2. A Railway lê o `railway.json` e usa `npm ci && npm run build` para montar e
   `npm start` para servir. Não precisa configurar build command na mão.
3. Em **Variables**, cole o conteúdo do seu `.env` (a Railway aceita colar o
   bloco inteiro de uma vez). Não defina `PORT` — ela injeta.
4. Em **Settings → Networking**, gere o domínio. Teste o site no endereço
   `*.up.railway.app` antes de apontar o domínio de verdade.
5. **Settings → Domains**, adicione `azuton.com` e `www.azuton.com` e crie os
   registros DNS que a Railway mostrar.
6. Quando o domínio estiver ativo, ajuste `SITE_URL` para `https://azuton.com`
   e faça um redeploy — canonical, hreflang e sitemap dependem dele.

O health check já está configurado em `/healthz`. Ele responde
`{"ok":true,"email":true|false}` — o `email` diz se o Resend está configurado,
o que é a forma mais rápida de conferir as variáveis depois de um deploy.

---

## Configurar o Resend

1. Em <https://resend.com/domains>, adicione `azuton.com` e crie os registros
   DNS (SPF, DKIM e, de preferência, DMARC). Sem domínio verificado o Resend só
   envia a partir de `onboarding@resend.dev`, que cai em spam.
2. Em **API Keys**, crie uma chave com permissão de envio e cole em
   `RESEND_API_KEY` na Railway.
3. `LEAD_FROM` precisa usar o domínio verificado, por exemplo
   `Site Azuton <noreply@azuton.com>`.
4. Teste pelo formulário do site, ou direto:

```bash
curl -X POST https://SEU-DOMINIO/api/lead \
  -H 'Content-Type: application/json' \
  -d '{"produto":"Teste","pagina":"/contato","idioma":"pt",
       "campos":{"Nome":"Teste","E-mail":"voce@exemplo.com","Telefone":"11999999999"}}'
```

Resposta `{"ok":true,"id":"..."}` significa que o e-mail saiu.

### Destino por formulário

Cada formulário pode ter destino próprio. A escolha é feita pelo caminho da
página de origem, então vale para os dois formulários da mesma página e para as
versões em inglês e espanhol.

Hoje há uma rota configurada: a página de **portabilidade** (`/portabilidade`,
`/en/portabilidade`, `/es/portabilidade`) vai para `LEAD_TO_PORTABILIDADE`.
Todo o resto vai para `LEAD_TO`.

Para acrescentar outra rota, uma linha em `ROTAS`, no `server/lead.js`, e a
variável correspondente na Railway. Sem a variável, a rota cai no `LEAD_TO` —
nada quebra.

O `/healthz` mostra as rotas que estão valendo, o que é a forma mais rápida de
conferir depois de um deploy:

```json
{"ok":true,"email":true,
 "rotas":{"padrão":["marketing@azuton.com","comercial@azuton.com"],
          "portabilidade":["suporte.voz@azuton.com"]}}
```

---

## Como o site é montado

```
src/
  pages/*.html      corpo de cada página, em português, com data-i18n nos textos
  i18n/*.en.json    tradução em inglês, por chave
  i18n/*.es.json    tradução em espanhol
  styles/core.css   CSS comum a todas as páginas — cabeçalho, rodapé,
                    botões, formulários, seletor de idioma, botão do WhatsApp
  styles/<pág>.css  CSS específico de cada página
  js/forms.js       envio dos formulários
  js/video.js       vídeo do YouTube com carregamento sob demanda
  pages.json        slug e título de cada página
scripts/
  build.js          gera dist/ nos três idiomas
  check.js          valida o dist antes do deploy
server/
  index.js          servidor, rotas e redirecionamentos
  lead.js           /api/lead e o envio pelo Resend
```

**A tradução é assada no build, não trocada por JavaScript.** Cada idioma tem
URL própria (`/sobre`, `/en/sobre`, `/es/sobre`), com `canonical` e `hreflang`
corretos. É o que permite ao Google e às buscas em IA indexarem os três — troca
de idioma no cliente indexaria só o português.

### Mexer no texto

- **Português:** edite direto o HTML em `src/pages/`.
- **Inglês e espanhol:** edite o valor da chave correspondente em
  `src/i18n/<página>.<idioma>.json`. A chave é o `data-i18n` do elemento no HTML.
- **Títulos e descrições:** o objeto `META` no topo de `scripts/build.js`.

Depois de qualquer mudança: `npm run build && npm run check`.

### Acrescentar uma página

1. Crie `src/pages/<slug>.html` com o corpo (copie o cabeçalho e o rodapé de
   outra página).
2. Crie `src/styles/<slug>.css`, mesmo que vazio. **Só o CSS específico da
   página** — cabeçalho, rodapé, botões e formulários já estão no `core.css`.
3. Acrescente a entrada em `src/pages.json`.
4. Acrescente título e descrição dos três idiomas em `META`, no `build.js`.
5. Traduza em `src/i18n/<slug>.en.json` e `.es.json`.

---

## O que o servidor faz

- Serve `dist/` como estático, com compressão e cache.
- `POST /api/lead` — recebe o formulário e envia pelo Resend. Tem honeypot,
  limite de 8 envios por IP a cada 10 minutos, validação de tamanho e
  quantidade de campos, e proteção contra injeção de cabeçalho de e-mail.
- `GET /healthz` — health check da Railway.
- Canoniza URLs: `/sobre/` redireciona para `/sobre`; `/en` para `/en/`.
- Redireciona as URLs antigas: `/azuphone`, `/pabx-nuvem`, `/pabx-virtual`,
  `/voz-ia`, `/integracoes`.
- Página 404 própria, no idioma da URL.
- Vídeos do YouTube carregam só depois do clique, na versão sem cookies. A
  página mostra a miniatura; o player entra ao apertar o play. Mantém o site
  rápido e evita cookies de terceiros em quem nunca assiste. Para acrescentar
  um vídeo, basta um bloco `.ytf` com `data-yt="ID_DO_VIDEO"` (e `data-start`
  em segundos, se quiser começar depois do início) — o `js/video.js` cuida do
  resto, inclusive de trocar a miniatura quando o `maxresdefault` não existe.
- Cabeçalhos de segurança pelo Helmet, com CSP que proíbe script inline — por
  isso o build move todo JavaScript para arquivos em `/js/`.

---

## Pendências conhecidas

- **Páginas ainda não migradas.** Link dedicado, Azuton IoT, IoT em LPWA,
  fazendas/clima/solo, segurança para IoT, Azuton/SMS e o blog continuam
  apontando para o WordPress atual, via `LEGACY_BASE`. No dia da virada, ou
  essas páginas são criadas aqui, ou o `LEGACY_BASE` passa a apontar para onde
  elas estiverem.
- **Logotipo.** O cabeçalho usa uma marca desenhada em SVG. Para trocar pelo
  logotipo oficial, substitua o bloco `<a class="mark">` nas páginas e o
  `public/favicon.svg`.
- **Ícones das redes sociais** são glifos geométricos próprios, não as marcas
  oficiais do Facebook, Instagram e X. Para usar as oficiais, baixe os kits de
  marca de cada plataforma.
- **Fotos.** Só a LP de Voz IA tem foto real. Os demais espaços seguem com arte
  geométrica.
- **Google Analytics / Tag Manager** não estão instalados. O `forms.js` já
  empurra o evento `lead_enviado` para o `dataLayer` quando ele existir.
