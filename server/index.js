/**
 * Servidor do site da Azuton.
 *
 * Serve dist/ como estatico e expoe uma unica rota de API, /api/lead.
 * Tudo o que e HTML foi gerado no build; aqui nao ha template nem banco.
 */
import express from 'express'
import compression from 'compression'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lead, leadConfigurado, rotasConfiguradas } from './lead.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const PORT = process.env.PORT || 3000

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ nao encontrado. Rode "npm run build" antes de "npm start".')
  process.exit(1)
}

const app = express()
app.set('trust proxy', 1)      // Railway fica atras de proxy: preciso para o IP real e o rate limit
app.set('strict routing', true) // /en e /en/ sao rotas diferentes — e o que permite canonizar as URLs
app.disable('x-powered-by')

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // o CSS das paginas usa style inline em alguns pontos; os scripts sao arquivos proprios
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://i.ytimg.com'],
      // o player do YouTube so entra depois do clique, na versao sem cookies
      frameSrc: ['https://www.youtube-nocookie.com'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
app.use(compression())

app.get('/healthz', (_req, res) => res.json({ ok: true, email: leadConfigurado, rotas: rotasConfiguradas }))

app.post('/api/lead',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 8,                       // 8 envios por IP a cada 10 minutos
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { ok: false, erro: 'muitas tentativas, tente em alguns minutos' },
  }),
  express.json({ limit: '64kb' }),
  lead
)

/* ---------- estaticos ---------- */
// assets com hash de conteudo nao mudam: cache longo. HTML sempre revalidado.
app.use('/css', express.static(join(DIST, 'css'), { maxAge: '7d' }))
app.use('/js', express.static(join(DIST, 'js'), { maxAge: '7d' }))
/**
 * /sobre/ -> /sobre: uma URL canonica so por pagina, sem barra final.
 * As raizes de idioma (/en/ e /es/) sao a excecao: la a barra fica, como em /,
 * e e para elas que a tag canonical aponta.
 */
const RAIZES = new Set(['/', '/en/', '/es/'])
app.get(/^(.+)\/$/, (req, res, next) => {
  if (RAIZES.has(req.path)) return next()
  const semBarra = req.path.slice(0, -1)
  if (semBarra && existsSync(join(DIST, semBarra, 'index.html'))) return res.redirect(301, semBarra)
  next()
})

/* /en e /es sem barra levam para a raiz do idioma */
app.get(['/en', '/es'], (req, res) => res.redirect(301, req.path + '/'))

/**
 * Resolve /sobre -> dist/sobre/index.html sem redirecionar para /sobre/.
 * Feito a mao porque o express.static insiste na barra final, e uma URL so
 * por pagina evita conteudo duplicado no Google.
 */
app.get(/^\/[^.]*$/, (req, res, next) => {
  const rel = req.path === '/' ? 'index.html' : join(req.path.slice(1), 'index.html')
  const abs = join(DIST, rel)
  if (!abs.startsWith(DIST) || !existsSync(abs)) return next()
  res.setHeader('Cache-Control', 'no-cache')
  res.sendFile(abs)
})

app.use(express.static(DIST, { index: false, redirect: false, maxAge: '1h' }))

/* redirecoes das URLs do site antigo */
const REDIRECT = {
  '/azuphone': '/azuphone-pabx-nuvem',
  '/pabx-nuvem': '/azuphone-pabx-nuvem',
  '/pabx-virtual': '/azuphone-pabx-nuvem',
  '/voz-ia': '/pabx-voz-ia',
  '/integracoes': '/integracoes-agentes-ia',
  '/solucoes-azuton': '/solucoes',
  '/download': '/downloads',
  '/azuphone/downloads': '/downloads',
}
app.get(Object.keys(REDIRECT), (req, res) => res.redirect(301, REDIRECT[req.path]))

app.use((req, res) => {
  res.status(404)
  const lg = req.path.startsWith('/en/') ? 'en' : req.path.startsWith('/es/') ? 'es' : 'pt'
  const home = lg === 'pt' ? '/' : `/${lg}/`
  const txt = {
    pt: ['Página não encontrada', 'A página que você procurou não existe ou mudou de endereço.', 'Ir para a home'],
    en: ['Page not found', 'The page you were looking for does not exist or has moved.', 'Go to the home page'],
    es: ['Página no encontrada', 'La página que buscaba no existe o cambió de dirección.', 'Ir al inicio'],
  }[lg]
  res.type('html').send(`<!doctype html><html lang="${lg === 'pt' ? 'pt-BR' : lg}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${txt[0]} — Azuton</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/core.css">
</head><body style="display:grid;place-items:center;min-height:100vh">
<main class="wrap" style="text-align:left;max-width:52ch;padding-block:60px">
<p class="label">404</p>
<h1 style="font-size:clamp(2rem,5vw,3.5rem);margin:18px 0">${txt[0]}</h1>
<p style="color:var(--ink-2);font-size:1.0625rem">${txt[1]}</p>
<p style="margin-top:26px"><a class="btn" href="${home}">${txt[2]}</a></p>
</main></body></html>`)
})

app.listen(PORT, () => {
  console.log(`azuton-site no ar em http://localhost:${PORT}`)
  console.log(`envio de e-mail: ${leadConfigurado ? 'configurado' : 'NAO configurado (formularios caem para o WhatsApp)'}`)
})
