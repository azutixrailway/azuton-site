/**
 * Recebe os formularios do site e manda o lead por e-mail via Resend.
 *
 * Sem chave configurada o endpoint responde 503 e o front-end cai para o
 * WhatsApp — o site nao quebra, so deixa de mandar e-mail.
 */
import { Resend } from 'resend'

const KEY = process.env.RESEND_API_KEY
const FROM = process.env.LEAD_FROM || 'Site Azuton <onboarding@resend.dev>'
const lista = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean)

const TO = lista(process.env.LEAD_TO)
const BCC = lista(process.env.LEAD_BCC)
const REPLY_TO_LEAD = String(process.env.LEAD_REPLY_TO_LEAD || 'true') === 'true'

/**
 * Cada formulario pode ter destino proprio. A rota e escolhida pelo caminho da
 * pagina de origem, entao vale para os dois formularios da mesma pagina e para
 * as versoes em ingles e espanhol (/en/portabilidade, /es/portabilidade).
 *
 * Para acrescentar uma rota: uma linha aqui e a variavel correspondente na
 * Railway. Sem a variavel, cai no LEAD_TO.
 */
const ROTAS = [
  { quando: /\/portabilidade(?:$|[/?#])/i, env: 'LEAD_TO_PORTABILIDADE', nome: 'portabilidade' },
]

export function destinatarios (pagina) {
  for (const r of ROTAS) {
    if (r.quando.test(pagina)) {
      const alvo = lista(process.env[r.env])
      if (alvo.length) return { para: alvo, rota: r.nome }
    }
  }
  return { para: TO, rota: 'padrão' }
}

const resend = KEY ? new Resend(KEY) : null

const MAX_CAMPOS = 25
const MAX_TAM = 4000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Tira quebras de linha de valores que vao para cabecalho de e-mail. */
const oneline = (s) => String(s).replace(/[\r\n]+/g, ' ').trim().slice(0, 200)

function normaliza (body) {
  if (!body || typeof body !== 'object') return { erro: 'corpo inválido' }
  if (body.campos && typeof body.campos !== 'object') return { erro: 'campos inválidos' }

  const campos = body.campos || {}
  const chaves = Object.keys(campos).filter((k) => k !== '_gotcha')
  if (chaves.length === 0) return { erro: 'formulário vazio' }
  if (chaves.length > MAX_CAMPOS) return { erro: 'campos demais' }

  const limpo = {}
  for (const k of chaves) {
    const v = campos[k]
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!t) continue
    if (t.length > MAX_TAM) return { erro: `campo "${k}" longo demais` }
    limpo[oneline(k)] = t.slice(0, MAX_TAM)
  }
  if (Object.keys(limpo).length === 0) return { erro: 'formulário vazio' }

  return {
    campos: limpo,
    produto: oneline(body.produto || 'Site Azuton'),
    pagina: oneline(body.pagina || '/'),
    idioma: ['pt', 'en', 'es'].includes(body.idioma) ? body.idioma : 'pt',
  }
}

function achaEmail (campos) {
  for (const [k, v] of Object.entries(campos)) {
    if (/mail|correo/i.test(k) && EMAIL_RE.test(v)) return v
  }
  return null
}

function corpo (dado, meta) {
  const linhas = Object.entries(dado.campos)
    .map(([k, v]) => `  <tr>
    <th style="text-align:left;padding:9px 14px 9px 0;border-bottom:1px solid #D8DEE7;color:#5A6478;font:500 12px/1.4 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;vertical-align:top">${esc(k)}</th>
    <td style="padding:9px 0;border-bottom:1px solid #D8DEE7;color:#062A5F;font:400 15px/1.5 system-ui,sans-serif">${esc(v).replace(/\n/g, '<br>')}</td>
  </tr>`).join('\n')

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#F2F4F7;padding:28px 16px;font-family:system-ui,-apple-system,Segoe UI,sans-serif">
  <table role="presentation" style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #D8DEE7;border-collapse:collapse;width:100%">
    <tr><td style="background:#062A5F;padding:22px 26px">
      <div style="color:#35DDC5;font:500 11px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase">Novo lead pelo site</div>
      <div style="color:#FFFFFF;font:600 22px/1.2 system-ui,sans-serif;margin-top:9px">${esc(dado.produto)}</div>
    </td></tr>
    <tr><td style="padding:24px 26px">
      <table role="presentation" style="width:100%;border-collapse:collapse">
${linhas}
      </table>
    </td></tr>
    <tr><td style="padding:0 26px 24px">
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#EDF1F9;border:1px solid #C9D5EA">
        <tr><td style="padding:14px 16px;color:#5A6478;font:400 12px/1.7 ui-monospace,monospace">
          Página: ${esc(dado.pagina)}<br>
          Idioma: ${esc(dado.idioma)}<br>
          Recebido: ${esc(meta.quando)}<br>
          Origem: ${esc(meta.ip)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const texto = [
    `Novo lead pelo site — ${dado.produto}`, '',
    ...Object.entries(dado.campos).map(([k, v]) => `${k}: ${v}`), '',
    `Página: ${dado.pagina}`,
    `Idioma: ${dado.idioma}`,
    `Recebido: ${meta.quando}`,
    `Origem: ${meta.ip}`,
  ].join('\n')

  return { html, texto }
}

export async function lead (req, res) {
  // honeypot: bot preencheu o campo escondido. Responde 200 para nao ensinar nada.
  if (req.body?.campos?._gotcha) return res.status(200).json({ ok: true })

  const dado = normaliza(req.body)
  if (dado.erro) return res.status(400).json({ ok: false, erro: dado.erro })

  const { para, rota } = destinatarios(dado.pagina)

  if (!resend || para.length === 0) {
    console.warn('[lead] RESEND_API_KEY ou destinatário ausente — e-mail nao enviado')
    return res.status(503).json({ ok: false, erro: 'envio de e-mail não configurado' })
  }

  const meta = {
    quando: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' (BRT)',
    ip: oneline(req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '—'),
  }
  const { html, texto } = corpo(dado, meta)
  const nome = dado.campos.Nome || dado.campos.Name || dado.campos.Nombre || ''
  const emailLead = achaEmail(dado.campos)

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: para,
      ...(BCC.length ? { bcc: BCC } : {}),
      ...(REPLY_TO_LEAD && emailLead ? { replyTo: emailLead } : {}),
      subject: `Lead — ${dado.produto}${nome ? ` — ${oneline(nome)}` : ''}`,
      html,
      text: texto,
    })
    if (error) {
      console.error('[lead] resend:', error)
      return res.status(502).json({ ok: false, erro: 'falha ao enviar' })
    }
    console.log(`[lead] enviado id=${data?.id} rota=${rota} para=${para.join(',')} produto="${dado.produto}"`)
    return res.status(200).json({ ok: true, id: data?.id })
  } catch (e) {
    console.error('[lead] excecao:', e)
    return res.status(502).json({ ok: false, erro: 'falha ao enviar' })
  }
}

export const leadConfigurado = Boolean(resend && TO.length)

/** Resumo das rotas, para o /healthz mostrar o que esta configurado. */
export const rotasConfiguradas = {
  padrão: TO,
  ...Object.fromEntries(ROTAS.map((r) => [r.nome, lista(process.env[r.env])]).filter(([, v]) => v.length)),
}
