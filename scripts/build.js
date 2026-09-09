/**
 * Gera dist/ com as tres versoes de idioma de cada pagina.
 *
 *   dist/index.html            -> portugues (raiz)
 *   dist/en/index.html         -> ingles
 *   dist/es/index.html         -> espanhol
 *
 * A traducao e assada no HTML aqui, no build. Nada de troca de idioma por
 * JavaScript: cada idioma tem URL propria, com canonical e hreflang, que e o
 * que o Google e as buscas em IA precisam para indexar os tres.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'node-html-parser'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const DIST = join(ROOT, 'dist')

const SITE_URL = (process.env.SITE_URL || 'https://azuton.com').replace(/\/+$/, '')
const LOCALES = ['pt', 'en', 'es']
const HTMLLANG = { pt: 'pt-BR', en: 'en', es: 'es' }
const PREFIX = { pt: '', en: '/en', es: '/es' }

const pages = JSON.parse(readFileSync(join(SRC, 'pages.json'), 'utf8'))

/* ---------- metadados por pagina e por idioma ---------- */
const META = {
  index: {
    pt: ['Azuton — Comunicação unificada, IoT e segurança digital',
         'PABX em nuvem, agentes de voz com IA, link dedicado e IoT para empresas. Mais de dez anos habilitando operadoras e empresas no Brasil.'],
    en: ['Azuton — Unified communications, IoT and digital security',
         'Cloud PBX, AI voice agents, dedicated links and IoT for business. More than ten years enabling carriers and companies in Brazil.'],
    es: ['Azuton — Comunicaciones unificadas, IoT y seguridad digital',
         'PBX en la nube, agentes de voz con IA, enlaces dedicados e IoT para empresas. Más de diez años habilitando operadores y empresas en Brasil.'],
  },
  sobre: {
    pt: ['Sobre a Azuton — habilitadora de telecomunicações',
         'A Azuton é uma habilitadora (enabler) brasileira de telecom. Atacado mundial, operadoras de pequeno e médio porte no Brasil e agentes de voz com IA em produção há mais de um ano.'],
    en: ['About Azuton — telecommunications enabler',
         'Azuton is a Brazilian telecom enabler. Global wholesale, small and mid-sized carriers in Brazil, and AI voice agents in production for over a year.'],
    es: ['Sobre Azuton — habilitador de telecomunicaciones',
         'Azuton es un habilitador brasileño de telecom. Mayorista mundial, operadores pequeños y medianos en Brasil y agentes de voz con IA en producción desde hace más de un año.'],
  },
  solucoes: {
    pt: ['Soluções Azuton — voz, conectividade, IoT e segurança',
         'PABX em nuvem, voz com IA, integrações, link dedicado, IoT e segurança. E habilitação de operadoras de pequeno e médio porte.'],
    en: ['Azuton Solutions — voice, connectivity, IoT and security',
         'Cloud PBX, AI voice, integrations, dedicated links, IoT and security. Plus enablement for small and mid-sized carriers.'],
    es: ['Soluciones Azuton — voz, conectividad, IoT y seguridad',
         'PBX en la nube, voz con IA, integraciones, enlaces dedicados, IoT y seguridad. Y habilitación de operadores pequeños y medianos.'],
  },
  'azuphone-pabx-nuvem': {
    pt: ['AzuPhone PABX Nuvem — PABX virtual em 24 horas | Azuton',
         'PABX em nuvem, também chamado PABX virtual: ramal no escritório, no celular e na filial, no mesmo número. De 30% a 40% de economia e um Personal Tec dedicado.'],
    en: ['AzuPhone Cloud PBX — virtual PBX live in 24 hours | Azuton',
         'Cloud PBX, also called virtual PBX: your extension at the office, on your mobile and at the branch, on the same number. 30% to 40% savings and a dedicated Personal Tec.'],
    es: ['AzuPhone PBX en la Nube — PBX virtual en 24 horas | Azuton',
         'PBX en la nube, también llamado PBX virtual: extensión en la oficina, en el móvil y en la sucursal, con el mismo número. Del 30% al 40% de ahorro y un Personal Tec dedicado.'],
  },
  portabilidade: {
    pt: ['Portabilidade de número para o AzuPhone | Azuton',
         'Leve o número que seus clientes já conhecem para o PABX em nuvem da Azuton. Você troca de PABX, não de número.'],
    en: ['Number porting to AzuPhone | Azuton',
         'Take the number your customers already know to Azuton’s cloud PBX. You change PBX, not number.'],
    es: ['Portabilidad numérica a AzuPhone | Azuton',
         'Lleve el número que sus clientes ya conocen al PBX en la nube de Azuton. Cambia de PBX, no de número.'],
  },
  'pabx-voz-ia': {
    pt: ['PABX Virtual com voz IA — atendimento imediato | Azuton',
         'Agente de voz com inteligência artificial sobre o PABX virtual da Azuton: atende na hora, em linguagem natural, e integra ao CRM que sua equipe já usa.'],
    en: ['Virtual PBX with AI voice — instant service | Azuton',
         'An artificial-intelligence voice agent on Azuton’s virtual PBX: answers instantly, in natural language, and integrates with the CRM your team already uses.'],
    es: ['PBX Virtual con voz IA — atención inmediata | Azuton',
         'Agente de voz con inteligencia artificial sobre el PBX virtual de Azuton: atiende al instante, en lenguaje natural, e integra con el CRM que su equipo ya usa.'],
  },
  'integracoes-agentes-ia': {
    pt: ['Integrações com agentes de IA — CRM, WhatsApp e voz | Azuton',
         'Conecte agentes de IA ao telefone, ao WhatsApp e ao SMS sobre a rede da Azuton, integrados ao Pipedrive, Exact Sales, Zoho ou à sua própria API.'],
    en: ['AI agent integrations — CRM, WhatsApp and voice | Azuton',
         'Connect AI agents to phone, WhatsApp and SMS over Azuton’s network, integrated with Pipedrive, Exact Sales, Zoho or your own API.'],
    es: ['Integraciones con agentes de IA — CRM, WhatsApp y voz | Azuton',
         'Conecte agentes de IA al teléfono, WhatsApp y SMS sobre la red de Azuton, integrados con Pipedrive, Exact Sales, Zoho o su propia API.'],
  },
  downloads: {
    pt: ['Downloads AzuPhone — aplicativo e instruções de configuração | Azuton',
         'Baixe o aplicativo do AzuPhone e veja o passo a passo de configuração do PABX em nuvem. Suporte técnico no Brasil, de segunda a sexta.'],
    en: ['AzuPhone downloads — app and setup instructions | Azuton',
         'Download the AzuPhone app and follow the step-by-step setup for the cloud PBX. Technical support in Brazil, Monday to Friday.'],
    es: ['Descargas AzuPhone — aplicación e instrucciones de configuración | Azuton',
         'Descargue la aplicación de AzuPhone y siga el paso a paso de configuración del PBX en la nube. Soporte técnico en Brasil, de lunes a viernes.'],
  },
  contato: {
    pt: ['Contato Azuton — fale com um especialista',
         'Telefone, WhatsApp, e-mail e formulário. Orçamento do AzuPhone, portabilidade, agente de voz com IA, integrações e suporte.'],
    en: ['Contact Azuton — talk to a specialist',
         'Phone, WhatsApp, email and form. AzuPhone quotes, number porting, AI voice agent, integrations and support.'],
    es: ['Contacto Azuton — hable con un especialista',
         'Teléfono, WhatsApp, correo y formulario. Presupuesto de AzuPhone, portabilidad, agente de voz con IA, integraciones y soporte.'],
  },
}

const SWITCH_LABEL = { pt: 'Idioma da página', en: 'Page language', es: 'Idioma de la página' }

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Paginas do site antigo que ja existem aqui. As demais (link dedicado, IoT,
 * blog, SMS) continuam apontando para LEGACY_BASE ate serem migradas — trocar
 * essa variavel no dia da virada e o unico passo necessario.
 */
const LEGACY = (process.env.LEGACY_BASE || 'https://azuton.com').replace(/\/+$/, '')
const MIGRATED = {
  '/': '/',
  '/azuphone/': '/azuphone-pabx-nuvem',
  '/azuphone-pabx-nuvem/': '/azuphone-pabx-nuvem',
  '/portabilidade/': '/portabilidade',
  '/contato/': '/contato',
  '/sobre/': '/sobre',
}

function rewriteLegacy (html, prefix) {
  return html.replace(/href="https:\/\/azuton\.com(\/[^"]*)?"/g, (m, path) => {
    const p = path || '/'
    const dest = MIGRATED[p]
    if (dest === undefined) return `href="${LEGACY}${p}"`
    return `href="${prefix}${dest === '/' ? '/' : dest}"`
  })
}

function langSwitch (page, current) {
  const items = LOCALES.map((lg) => {
    const href = page.slug ? `${PREFIX[lg]}/${page.slug}` : `${PREFIX[lg]}/`
    const cur = lg === current ? ' aria-current="true"' : ''
    return `<a class="lang__o" href="${href}" hreflang="${HTMLLANG[lg]}" lang="${HTMLLANG[lg]}"${cur}>${lg.toUpperCase()}</a>`
  }).join('')
  return `<div class="lang__set" role="group" aria-label="${SWITCH_LABEL[current]}">${items}</div>`
}

function translate (html, dict) {
  if (!dict) return html
  const root = parse(html, { comment: true })
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const v = dict.text?.[el.getAttribute('data-i18n')]
    if (v !== undefined && v !== '') el.set_content(v)
  }
  for (const el of root.querySelectorAll('[data-i18n-ph]')) {
    const v = dict.attr?.[el.getAttribute('data-i18n-ph')]
    if (v) el.setAttribute('placeholder', v)
  }
  for (const el of root.querySelectorAll('[data-i18n-alt]')) {
    const v = dict.attr?.[el.getAttribute('data-i18n-alt')]
    if (v) el.setAttribute('alt', v)
  }
  return root.toString()
}

function document_ (page, lg, body) {
  const [title, desc] = META[page.file]?.[lg] || [page.title, '']
  const path = `/${page.slug}`.replace(/\/$/, '') || '/'
  const canonical = `${SITE_URL}${PREFIX[lg]}${path === '/' ? '/' : path}`
  const alternates = LOCALES.map((l) =>
    `  <link rel="alternate" hreflang="${HTMLLANG[l]}" href="${SITE_URL}${PREFIX[l]}${path === '/' ? '/' : path}">`
  ).join('\n')

  return `<!doctype html>
<html lang="${HTMLLANG[lg]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonical}">
${alternates}
  <link rel="alternate" hreflang="x-default" href="${SITE_URL}${path === '/' ? '/' : path}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Azuton">
  <meta property="og:locale" content="${lg === 'pt' ? 'pt_BR' : lg === 'es' ? 'es_ES' : 'en_US'}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#062A5F">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="/css/core.css">
  <link rel="stylesheet" href="/css/${page.file}.css">
</head>
<body>
${body}
<script src="/js/forms.js" defer></script>
<script src="/js/video.js" defer></script>
</body>
</html>
`
}

/* ---------- build ---------- */
rmSync(DIST, { recursive: true, force: true })
mkdirSync(join(DIST, 'css'), { recursive: true })
mkdirSync(join(DIST, 'js'), { recursive: true })

for (const f of readdirSync(join(SRC, 'styles'))) {
  copyFileSync(join(SRC, 'styles', f), join(DIST, 'css', f))
}
for (const f of readdirSync(join(SRC, 'js'))) {
  copyFileSync(join(SRC, 'js', f), join(DIST, 'js', f))
}
for (const f of readdirSync(join(ROOT, 'public'))) {
  copyFileSync(join(ROOT, 'public', f), join(DIST, f))
}

const urls = []
let written = 0

for (const page of pages) {
  let raw = readFileSync(join(SRC, 'pages', `${page.file}.html`), 'utf8')

  /**
   * Scripts inline saem para /js/<pagina>.js. Assim a CSP pode proibir script
   * inline por completo, que e a defesa mais eficaz contra XSS. O JSON-LD fica
   * onde esta: tem type proprio e nao e codigo executavel.
   */
  const inline = []
  raw = raw.replace(/<script(?![^>]*\b(?:src|type)=)[^>]*>([\s\S]*?)<\/script>/g, (_m, code) => {
    inline.push(code.trim())
    return ''
  })
  if (inline.length) {
    writeFileSync(join(DIST, 'js', `${page.file}.js`), inline.join('\n\n') + '\n')
    raw = raw.trimEnd() + `\n<script src="/js/${page.file}.js" defer></script>\n`
  }

  for (const lg of LOCALES) {
    let body = raw
      .replaceAll('{{BASE}}', PREFIX[lg])
      .replaceAll('{{LANGSWITCH}}', langSwitch(page, lg))

    if (lg !== 'pt') {
      const dp = join(SRC, 'i18n', `${page.file}.${lg}.json`)
      if (existsSync(dp)) body = translate(body, JSON.parse(readFileSync(dp, 'utf8')))
    }

    // normaliza a raiz e reescreve o que ja migrou do site antigo
    body = body.replaceAll('href=""', 'href="/"').replaceAll(`href="${PREFIX[lg]}"`, `href="${PREFIX[lg]}/"`)
    body = rewriteLegacy(body, PREFIX[lg])

    const outDir = page.slug
      ? join(DIST, PREFIX[lg].slice(1), page.slug)
      : join(DIST, PREFIX[lg].slice(1))
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, 'index.html'), document_(page, lg, body))
    written++

    const path = `/${page.slug}`.replace(/\/$/, '') || '/'
    urls.push({ loc: `${SITE_URL}${PREFIX[lg]}${path === '/' ? '/' : path}`, lg, path })
  }
}

/* sitemap com alternates por idioma */
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...urls.map((u) => [
    '  <url>',
    `    <loc>${u.loc}</loc>`,
    ...LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${HTMLLANG[l]}" href="${SITE_URL}${PREFIX[l]}${u.path === '/' ? '/' : u.path}"/>`),
    '    <changefreq>weekly</changefreq>',
    `    <priority>${u.path === '/' ? '1.0' : '0.8'}</priority>`,
    '  </url>',
  ].join('\n')),
  '</urlset>',
  '',
].join('\n')

writeFileSync(join(DIST, 'sitemap.xml'), sitemap)
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

console.log(`build: ${written} paginas em ${LOCALES.length} idiomas`)
console.log(`sitemap: ${urls.length} URLs`)
