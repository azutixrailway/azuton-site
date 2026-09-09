/**
 * Confere o dist antes de subir: paginas presentes, traducao completa,
 * links internos vivos e head correto.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const pages = JSON.parse(readFileSync(join(ROOT, 'src/pages.json'), 'utf8'))
const LOCALES = [['pt', ''], ['en', '/en'], ['es', '/es']]

let erros = 0
const falha = (m) => { console.error('  ERRO  ' + m); erros++ }

const arquivos = []
for (const [lg, prefix] of LOCALES) {
  for (const p of pages) {
    const rel = join(prefix.slice(1), p.slug, 'index.html')
    const abs = join(DIST, rel)
    if (!existsSync(abs)) { falha(`falta ${rel}`); continue }
    arquivos.push({ lg, prefix, page: p, abs, rota: `${prefix}/${p.slug}`.replace(/\/$/, '') || '/' })
  }
}
console.log(`paginas encontradas: ${arquivos.length}/${pages.length * LOCALES.length}`)

const rotas = new Set(arquivos.map((a) => a.rota))
const estaticos = new Set()
for (const d of ['css', 'js']) {
  if (existsSync(join(DIST, d))) for (const f of readdirSync(join(DIST, d))) estaticos.add(`/${d}/${f}`)
}
for (const f of readdirSync(DIST)) if (f.includes('.')) estaticos.add('/' + f)

for (const a of arquivos) {
  const html = readFileSync(a.abs, 'utf8')
  const nome = `${a.lg} ${a.rota}`

  if (!/<html lang="/.test(html)) falha(`${nome}: sem lang no <html>`)
  if (!/<link rel="canonical"/.test(html)) falha(`${nome}: sem canonical`)
  if ((html.match(/rel="alternate" hreflang=/g) || []).length < 4) falha(`${nome}: hreflang incompleto`)
  if (!/<meta name="description" content="[^"]{40,}"/.test(html)) falha(`${nome}: description curta ou ausente`)
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) falha(`${nome}: precisa de exatamente um <h1>`)
  if (/\{\{[A-Z]+\}\}/.test(html)) falha(`${nome}: sobrou placeholder no HTML`)
  if (/claude\.ai\/code\/artifact/.test(html)) falha(`${nome}: sobrou link de artifact`)
  if (/data-i18n=/.test(html) && a.lg !== 'pt') {
    // ok: o atributo fica, o conteudo e que foi trocado
  }

  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const alvo = m[1].replace(/\/$/, '') || '/'
    if (estaticos.has(m[1]) || estaticos.has(alvo)) continue
    if (!rotas.has(alvo)) falha(`${nome}: link interno quebrado -> ${m[1]}`)
  }
}

for (const f of ['sitemap.xml', 'robots.txt', 'favicon.svg', 'css/core.css', 'js/forms.js']) {
  if (!existsSync(join(DIST, f))) falha(`falta ${f}`)
}

console.log(erros ? `\n${erros} problema(s).` : '\ntudo certo.')
process.exit(erros ? 1 : 0)
