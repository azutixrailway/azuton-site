/**
 * Vídeo do YouTube com carregamento sob demanda.
 *
 * A página mostra só a miniatura. O player do YouTube — que traz mais de meio
 * megabyte de JavaScript e cookies de terceiros — só entra depois do clique.
 * Assim a página continua rápida para quem nunca aperta o play, o que é a
 * maioria, e ainda pontua bem no Core Web Vitals.
 */
(function () {
  'use strict'

  var LEG = {
    pt: 'Carregando o vídeo…',
    en: 'Loading the video…',
    es: 'Cargando el video…'
  }
  var lang = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase()

  Array.prototype.slice.call(document.querySelectorAll('.ytf')).forEach(function (box) {
    var id = box.dataset.yt
    if (!id || !/^[\w-]{6,15}$/.test(id)) return

    var btn = box.querySelector('.ytf__btn')
    if (!btn) return

    // nem todo video tem maxresdefault; hqdefault sempre existe
    var thumb = box.querySelector('.ytf__thumb')
    if (thumb) {
      thumb.addEventListener('error', function once () {
        thumb.removeEventListener('error', once)
        thumb.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'
      })
    }

    btn.addEventListener('click', function () {
      var frame = document.createElement('iframe')
      frame.className = 'ytf__frame'
      frame.width = '560'
      frame.height = '315'
      frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
      frame.setAttribute('allowfullscreen', '')
      frame.setAttribute('title', btn.getAttribute('aria-label') || 'YouTube')
      var inicio = box.dataset.start && /^\d{1,5}$/.test(box.dataset.start) ? '&start=' + box.dataset.start : ''
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=1&rel=0&modestbranding=1&hl=' + lang + inicio
      btn.replaceWith(frame)
      box.setAttribute('data-carregado', 'true')
      frame.focus()
    })

    // dá para chegar no play pelo teclado sem precisar de mouse
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click() }
    })

    var aviso = box.querySelector('.ytf__carregando')
    if (aviso) aviso.textContent = LEG[lang] || LEG.pt
  })
})()
