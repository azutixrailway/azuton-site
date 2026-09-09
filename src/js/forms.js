/**
 * Envio dos formularios do site.
 *
 * Todo formulario .form posta em /api/lead, que dispara o e-mail pelo Resend.
 * Se a API falhar — rede caida, chave nao configurada, Resend fora do ar — o
 * visitante nao fica sem caminho: abrimos o WhatsApp com a mensagem ja
 * preenchida, que era o comportamento antigo. Nunca perder o lead e a regra.
 */
(function () {
  'use strict'

  var WA = document.documentElement.getAttribute('data-wa') || '551151520050'

  var TXT = {
    pt: {
      sending: 'Enviando…',
      ok: 'Recebemos! Nosso time responde no mesmo dia útil.',
      fallback: 'Não conseguimos enviar por aqui. Abrindo o WhatsApp com seus dados…',
      invalid: 'Confira os campos destacados antes de enviar.'
    },
    en: {
      sending: 'Sending…',
      ok: 'Got it. Our team replies the same business day.',
      fallback: 'We could not send it from here. Opening WhatsApp with your details…',
      invalid: 'Please check the highlighted fields before sending.'
    },
    es: {
      sending: 'Enviando…',
      ok: 'Recibido. Nuestro equipo responde el mismo día hábil.',
      fallback: 'No pudimos enviarlo desde aquí. Abriendo WhatsApp con sus datos…',
      invalid: 'Revise los campos destacados antes de enviar.'
    }
  }
  var lang = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase()
  var t = TXT[lang] || TXT.pt

  function fields (form) {
    var out = {}
    Array.prototype.slice.call(form.querySelectorAll('input, select, textarea')).forEach(function (el) {
      if (!el.name || el.type === 'submit' || el.type === 'button') return
      var v = (el.value || '').trim()
      if (v) out[el.name] = v
    })
    return out
  }

  function waLink (form, data) {
    var origem = form.dataset.produto || document.title
    var lines = ['Olá! Vim pelo site da Azuton — ' + origem + '.', '']
    Object.keys(data).forEach(function (k) {
      if (k !== '_gotcha') lines.push(k + ': ' + data[k])
    })
    return 'https://wa.me/' + (form.dataset.wa || WA) + '?text=' + encodeURIComponent(lines.join('\n'))
  }

  function statusEl (form) {
    var el = form.querySelector('.form__status')
    if (!el) {
      el = document.createElement('p')
      el.className = 'form__status'
      el.setAttribute('role', 'status')
      el.setAttribute('aria-live', 'polite')
      var note = form.querySelector('.form__note, .qf__note')
      if (note && note.parentNode) note.parentNode.insertBefore(el, note)
      else form.appendChild(el)
    }
    return el
  }

  function say (form, msg, kind) {
    var el = statusEl(form)
    el.textContent = msg
    el.className = 'form__status' + (kind ? ' form__status--' + kind : '')
  }

  Array.prototype.slice.call(document.querySelectorAll('form.form')).forEach(function (form) {
    // honeypot: bot preenche, gente nao ve
    if (!form.querySelector('[name="_gotcha"]')) {
      var hp = document.createElement('div')
      hp.setAttribute('aria-hidden', 'true')
      hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden'
      hp.innerHTML = '<label>Não preencha<input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></label>'
      form.appendChild(hp)
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault()

      if (!form.reportValidity()) { say(form, t.invalid, 'erro'); return }

      var btn = form.querySelector('button[type="submit"], button:not([type])')
      var label = btn ? btn.innerHTML : ''
      if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true') }
      say(form, t.sending)

      var data = fields(form)
      var payload = {
        produto: form.dataset.produto || document.title,
        pagina: location.pathname,
        idioma: lang,
        campos: data
      }

      var done = false
      var timer = setTimeout(function () { if (!done) finish(false) }, 12000)

      function finish (ok) {
        done = true
        clearTimeout(timer)
        if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = label }
        if (ok) {
          say(form, t.ok, 'ok')
          form.reset()
          if (window.dataLayer) window.dataLayer.push({ event: 'lead_enviado', produto: payload.produto })
        } else {
          say(form, t.fallback, 'erro')
          window.open(waLink(form, data), '_blank', 'noopener')
        }
      }

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.ok ? finish(true) : finish(false) })
        .catch(function () { finish(false) })
    })
  })
})()
