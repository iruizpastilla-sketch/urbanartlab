/* Propuesta 2 · «Kraft y cobre, editorial»
   - Selector «Pedir cita» (<dialog>: Esc cierra, foco atrapado, vuelve al botón que lo abrió)
   - Menú del móvil
   - Enlaces sincronizados con lib/datos.js (window.UAL)
   - «Abierto ahora» por box
   - Aparición suave de bloques (una vez) y scroll suave con Lenis (solo ratón y sin movimiento reducido) */
(function () {
  'use strict';
  var doc = document.documentElement;
  var UAL = window.UAL;
  var lenis = null;
  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Enlaces desde datos.js ---------- */
  if (UAL) {
    document.querySelectorAll('[data-booksy]').forEach(function (a) { a.href = UAL.booksy; });
    document.querySelectorAll('[data-wa]').forEach(function (a) { a.href = UAL.whatsapp(a.getAttribute('data-wa'), 'es'); });
    document.querySelectorAll('[data-mapa]').forEach(function (a) { a.href = UAL.direccion.mapa; });
    document.querySelectorAll('[data-resenas]').forEach(function (a) { a.href = UAL.resenas.google.enlace; });
    document.querySelectorAll('[data-instagram]').forEach(function (a) { a.href = UAL.instagram; });
  }

  /* ---------- Selector «Pedir cita» ---------- */
  var dialogo = document.getElementById('cita');
  var quienAbrio = null;
  if (dialogo && typeof dialogo.showModal === 'function') {
    document.querySelectorAll('[data-abre-cita]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        quienAbrio = b;
        cerrarMenu();
        dialogo.showModal();
        if (lenis) lenis.stop();
      });
    });
    dialogo.querySelectorAll('[data-cierra-cita]').forEach(function (b) {
      b.addEventListener('click', function () { dialogo.close(); });
    });
    // Clic en el fondo oscuro: cierra
    dialogo.addEventListener('click', function (e) {
      if (e.target !== dialogo) return;
      var r = dialogo.getBoundingClientRect();
      var dentro = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!dentro) dialogo.close();
    });
    dialogo.addEventListener('close', function () {
      if (lenis) lenis.start();
      if (quienAbrio) { quienAbrio.focus(); quienAbrio = null; }
    });
  }

  /* ---------- Menú del móvil ---------- */
  var botonMenu = document.querySelector('[data-menu]');
  var menu = document.getElementById('menu');
  function cerrarMenu() {
    if (!botonMenu || botonMenu.getAttribute('aria-expanded') !== 'true') return;
    botonMenu.setAttribute('aria-expanded', 'false');
    menu.classList.remove('abierto');
    var t = botonMenu.querySelector('.menu-boton__txt');
    t.textContent = t.getAttribute('data-abrir');
  }
  if (botonMenu && menu) {
    botonMenu.addEventListener('click', function () {
      var abierto = botonMenu.getAttribute('aria-expanded') === 'true';
      if (abierto) { cerrarMenu(); return; }
      botonMenu.setAttribute('aria-expanded', 'true');
      menu.classList.add('abierto');
      var t = botonMenu.querySelector('.menu-boton__txt');
      t.textContent = t.getAttribute('data-cerrar');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && botonMenu.getAttribute('aria-expanded') === 'true') { cerrarMenu(); botonMenu.focus(); }
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) cerrarMenu(); });
  }

  /* ---------- Línea bajo la cabecera al bajar ---------- */
  var cabecera = document.querySelector('.cabecera');
  function marcarCabecera() { cabecera.classList.toggle('con-sombra', window.scrollY > 40); }
  if (cabecera) { marcarCabecera(); window.addEventListener('scroll', marcarCabecera, { passive: true }); }

  /* ---------- Abierto ahora (hora de Lleida) ---------- */
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function aMin(h) { var p = h.split(':'); return +p[0] * 60 + +p[1]; }
  function bonita(h) { return h.replace(/^0/, ''); }
  function estado(horario) {
    var ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    var dia = ahora.getDay();
    var min = ahora.getHours() * 60 + ahora.getMinutes();
    var hoy = horario[dia] || [];
    for (var i = 0; i < hoy.length; i++) {
      if (min >= aMin(hoy[i][0]) && min < aMin(hoy[i][1])) return { abierto: true, txt: 'Abierto ahora · cierra a las ' + bonita(hoy[i][1]) };
    }
    for (var j = 0; j < hoy.length; j++) {
      if (min < aMin(hoy[j][0])) return { abierto: false, txt: 'Cerrado ahora · abre a las ' + bonita(hoy[j][0]) };
    }
    for (var k = 1; k <= 7; k++) {
      var d = (dia + k) % 7;
      var tramos = horario[d] || [];
      if (tramos.length) return { abierto: false, txt: 'Cerrado ahora · abre el ' + DIAS[d] + ' a las ' + bonita(tramos[0][0]) };
    }
    return null;
  }
  if (UAL) {
    document.querySelectorAll('[data-estado]').forEach(function (p) {
      var box = UAL.boxes[p.getAttribute('data-estado')];
      if (!box || !box.horario) return;
      try {
        var e = estado(box.horario);
        if (!e) return;
        p.textContent = e.txt;
        if (e.abierto) p.classList.add('estado--abierto');
      } catch (err) { /* sin estado: el horario escrito sigue ahí */ }
    });
  }

  /* ---------- Aparición suave (una vez) ---------- */
  var bloques = document.querySelectorAll('[data-revela]');
  if ('IntersectionObserver' in window && !navigator.webdriver && bloques.length) {
    var alto = window.innerHeight;
    doc.classList.add('revela-activo');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    bloques.forEach(function (b) {
      // Lo que ya se ve al cargar aparece sin esperar
      if (b.getBoundingClientRect().top < alto * 0.92) b.classList.add('visible');
      else io.observe(b);
    });
  }

  /* ---------- Scroll suave con Lenis (solo con ratón, sin movimiento reducido) ---------- */
  var conRaton = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!sinMovimiento && conRaton) {
    var s = document.createElement('script');
    s.src = '../lib/lenis.min.js';
    s.async = true;
    s.onload = function () {
      if (!window.Lenis) return;
      var desfase = -((cabecera ? cabecera.offsetHeight : 76) + 16);
      lenis = new window.Lenis({ autoRaf: true, lerp: 0.1, anchors: { offset: desfase } });
    };
    document.head.appendChild(s);
  }
})();
