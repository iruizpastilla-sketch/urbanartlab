// Propuesta 3 · «Tres boxes, tres colores»
// Selector «Pedir cita», menú del móvil, color de la cabecera según la box, aparición al bajar,
// fila de tatuajes con botones y «abierto ahora» con los horarios de lib/datos.js.
(function () {
  'use strict';
  var raiz = document.documentElement;

  /* ---------- Selector «Pedir cita» ---------- */
  var dialogo = document.getElementById('cita');
  var quienAbrio = null;

  function abrirCita(ev) {
    if (!dialogo || typeof dialogo.showModal !== 'function') {
      var cierre = document.getElementById('pedir-cita');
      if (cierre) cierre.scrollIntoView();
      return;
    }
    quienAbrio = ev && ev.currentTarget;
    var actual = raiz.getAttribute('data-box');
    dialogo.querySelectorAll('.op').forEach(function (op) {
      op.classList.toggle('actual', op.getAttribute('data-op') === actual);
    });
    dialogo.showModal();
    // Si estás viendo una box, el foco va directo a su botón; si no, al primero.
    var destino = actual && dialogo.querySelector('.op[data-op="' + actual + '"] .op-principal');
    (destino || dialogo.querySelector('.op-principal')).focus();
  }
  function cerrarCita() { if (dialogo && dialogo.open) dialogo.close(); }

  document.querySelectorAll('[data-cita]').forEach(function (b) { b.addEventListener('click', abrirCita); });
  if (dialogo) {
    dialogo.querySelectorAll('[data-cerrar]').forEach(function (b) { b.addEventListener('click', cerrarCita); });
    // Clic fuera del panel (en el fondo oscuro) = cerrar
    dialogo.addEventListener('click', function (e) { if (e.target === dialogo) cerrarCita(); });
    dialogo.addEventListener('close', function () {
      if (quienAbrio && document.contains(quienAbrio)) quienAbrio.focus();
      quienAbrio = null;
      if (location.hash === '#cita') history.replaceState(null, '', location.pathname + location.search);
    });
    // Un enlace a …/#cita (por ejemplo, desde la bio de Instagram) abre el selector directamente
    var porDireccion = function () { if (location.hash === '#cita' && !dialogo.open) abrirCita(); };
    window.addEventListener('hashchange', porDireccion);
    porDireccion();
  }

  /* ---------- Menú del móvil ---------- */
  var botonMenu = document.querySelector('.boton-menu');
  var menu = document.getElementById('menu');
  function ponerMenu(abierto) {
    botonMenu.setAttribute('aria-expanded', String(abierto));
    botonMenu.querySelector('.boton-menu-texto').textContent = abierto ? 'Cerrar menú' : 'Menú';
    menu.classList.toggle('abierta', abierto);
  }
  if (botonMenu && menu) {
    botonMenu.addEventListener('click', function () { ponerMenu(botonMenu.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && botonMenu.getAttribute('aria-expanded') === 'true') { ponerMenu(false); botonMenu.focus(); }
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) ponerMenu(false); });
  }

  /* ---------- La cabecera (y la píldora «Pedir cita») toma el color de la box que tienes delante ---------- */
  if ('IntersectionObserver' in window) {
    var metaTema = document.querySelector('meta[name="theme-color"]');
    var colorTema = { beauty: '#F2D6CB', barber: '#14213D', tattoo: '#121212' };
    var ponerBox = function (box) {
      if (box) raiz.setAttribute('data-box', box); else raiz.removeAttribute('data-box');
      if (metaTema) metaTema.setAttribute('content', colorTema[box] || '#FBF7F2');
    };
    var bandas = document.querySelectorAll('[data-box]');
    var obsBox = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        var box = en.target.getAttribute('data-box');
        if (en.isIntersecting) ponerBox(box);
        else if (raiz.getAttribute('data-box') === box) ponerBox(null);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    bandas.forEach(function (b) { obsBox.observe(b); });

    /* ---------- Aparición al bajar (una vez) ----------
       La clase que esconde los bloques se pone aquí, no en el <head>: si este archivo no llega, todo se ve. */
    var obsAparece = new IntersectionObserver(function (entradas, obs) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    raiz.classList.add('aparece-activa');
    document.querySelectorAll('.aparece').forEach(function (el) { obsAparece.observe(el); });
  }

  /* ---------- Fila de tatuajes: se mueve a mano; los botones ayudan con ratón o teclado ---------- */
  var tira = document.getElementById('tira');
  if (tira) {
    var botones = document.querySelectorAll('[data-tira]');
    var actualizar = function () {
      var max = tira.scrollWidth - tira.clientWidth - 2;
      botones.forEach(function (b) {
        var dir = +b.getAttribute('data-tira');
        b.disabled = dir < 0 ? tira.scrollLeft <= 2 : tira.scrollLeft >= max;
      });
    };
    botones.forEach(function (b) {
      b.addEventListener('click', function () {
        var li = tira.querySelector('li');
        var paso = li ? li.getBoundingClientRect().width + 16 : 300;
        var suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        tira.scrollBy({ left: paso * +b.getAttribute('data-tira'), behavior: suave ? 'smooth' : 'auto' });
      });
    });
    tira.addEventListener('scroll', function () { window.requestAnimationFrame(actualizar); }, { passive: true });
    window.addEventListener('resize', actualizar);
    actualizar();
  }

  /* ---------- «Abierto ahora» (hora de Lleida) ---------- */
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function aMinutos(h) { var p = h.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function hora(h) { return h.replace(/^0/, ''); }
  function ahoraEnLleida() {
    try {
      var partes = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (p) { partes[p.type] = p.value; });
      return { dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partes.weekday), min: (+partes.hour) * 60 + (+partes.minute) };
    } catch (e) {
      var d = new Date();
      return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function estado(horario) {
    var ahora = ahoraEnLleida();
    var hoy = horario[ahora.dia] || [];
    for (var i = 0; i < hoy.length; i++) {
      var abre = aMinutos(hoy[i][0]);
      var cierra = aMinutos(hoy[i][1]);
      if (ahora.min >= abre && ahora.min < cierra) return { abierto: true, texto: 'Abierto ahora · cierra a las ' + hora(hoy[i][1]) };
      if (ahora.min < abre) return { abierto: false, texto: 'Cerrado ahora · abre a las ' + hora(hoy[i][0]) };
    }
    for (var n = 1; n <= 7; n++) {
      var d = (ahora.dia + n) % 7;
      var tramos = horario[d];
      if (tramos && tramos.length) return { abierto: false, texto: 'Cerrado ahora · abre el ' + DIAS[d] + ' a las ' + hora(tramos[0][0]) };
    }
    return null;
  }
  if (window.UAL && window.UAL.boxes) {
    document.querySelectorAll('[data-estado]').forEach(function (el) {
      var box = window.UAL.boxes[el.getAttribute('data-estado')];
      if (!box || !box.horario) return;
      var e = estado(box.horario);
      if (!e) return;
      el.textContent = e.texto;
      el.classList.toggle('abierto', e.abierto);
      el.hidden = false;
    });
  }
})();
