// Propuesta 4 · «Blanco, negro y aire»
// Poco movimiento a propósito: fundido de fotos, selector de cita, menú, «hoy» en el horario y scroll suave con Lenis.
(function () {
  'use strict';
  var d = document;
  var raiz = d.documentElement;
  var UAL = window.UAL;
  var cabecera = d.getElementById('cabecera');
  var lenis = null;

  // 1. Enlaces desde lib/datos.js (el HTML ya los lleva escritos; así, si cambian allí, cambian aquí)
  if (UAL) {
    d.querySelectorAll('[data-booksy]').forEach(function (a) { a.href = UAL.booksy; });
    d.querySelectorAll('[data-mapa]').forEach(function (a) { a.href = UAL.direccion.mapa; });
    d.querySelectorAll('[data-whatsapp]').forEach(function (a) { a.href = UAL.whatsapp(a.getAttribute('data-whatsapp'), 'es'); });
  }

  // 2. Fotos: fundido de 300 ms al cargar
  d.querySelectorAll('.foto img').forEach(function (img) {
    var listo = function () { img.classList.add('cargada'); };
    if (img.complete && img.naturalWidth) listo();
    else { img.addEventListener('load', listo); img.addEventListener('error', listo); }
  });

  // 3. Línea fina bajo la cabecera en cuanto se baja un poco
  var linea = function () { cabecera.classList.toggle('con-linea', window.scrollY > 8); };
  window.addEventListener('scroll', linea, { passive: true });
  linea();

  // 3b. En móvil, «Pedir cita» aparece en la cabecera cuando los botones de la portada salen de la vista
  var accionesHero = d.querySelector('.hero__acciones');
  if (accionesHero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      cabecera.classList.toggle('cta-fuera', !e[0].isIntersecting);
    }, { rootMargin: '-56px 0px 0px 0px' }).observe(accionesHero);
  } else {
    cabecera.classList.add('cta-fuera');
  }

  // 4. «Hoy» en la tabla de horario
  var hoy = d.querySelector('.tabla-horario tr[data-dia="' + new Date().getDay() + '"]');
  if (hoy) hoy.classList.add('hoy');

  // 5. Diálogos (selector de cita y menú): botones de verdad, Esc cierra, el foco vuelve a su sitio
  var origen = null;
  function bloquear(si) {
    raiz.classList.toggle('bloqueado', si);
    if (lenis) { if (si) lenis.stop(); else lenis.start(); }
  }
  function abrir(id, desde) {
    var dlg = d.getElementById(id);
    if (!dlg) return;
    var abierto = d.querySelector('dialog[open]');
    if (!abierto) origen = desde || d.activeElement; // desde el menú, el foco volverá al botón «Menú»
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (abierto && abierto !== dlg) abierto.close();
    bloquear(true);
    var primero = dlg.querySelector('[data-cerrar]');
    if (primero) primero.focus();
  }
  d.querySelectorAll('[data-abrir]').forEach(function (b) {
    b.addEventListener('click', function () { abrir(b.getAttribute('data-abrir'), b); });
  });
  d.querySelectorAll('dialog').forEach(function (dlg) {
    dlg.addEventListener('close', function () {
      if (d.querySelector('dialog[open]')) return; // se ha abierto otro
      bloquear(false);
      if (origen && origen.offsetParent !== null) origen.focus();
    });
    // Clic fuera del panel (en el fondo oscuro) cierra
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.querySelectorAll('[data-cerrar]').forEach(function (b) {
      b.addEventListener('click', function () { dlg.close(); });
    });
    dlg.querySelectorAll('[data-cerrar-al-ir]').forEach(function (a) {
      a.addEventListener('click', function () { dlg.close(); });
    });
  });

  // 6. Scroll suave con Lenis (no con movimiento reducido)
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function desplazarA(destino) {
    var margen = (cabecera ? cabecera.offsetHeight : 0) + 24;
    if (lenis) lenis.scrollTo(destino, { offset: -margen });
    else destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('saltar')) return;
    var destino = d.getElementById(a.getAttribute('href').slice(1));
    if (!destino) return;
    e.preventDefault();
    desplazarA(destino);
    history.replaceState(null, '', a.getAttribute('href'));
  });

  if (!reducido) {
    var s = d.createElement('script');
    s.src = '../lib/lenis.min.js';
    s.async = true;
    s.onload = function () {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ autoRaf: true, lerp: 0.12 });
      if (d.querySelector('dialog[open]')) lenis.stop();
    };
    d.body.appendChild(s);
  }

  // 7. Todo listo. Si este archivo falla o no carga, el <head> quita la clase .js al terminar de cargar:
  //    las fotos se ven igual y los botones que dependen de JS se ocultan (ver «Sin JavaScript» en estilo.css).
  window.P4LISTO = true;
})();
