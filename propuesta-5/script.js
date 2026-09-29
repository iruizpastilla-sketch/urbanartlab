// Propuesta 5 · «Gigante y en relieve». Sin dependencias salvo Lenis (scroll suave) y lib/datos.js.
(function () {
  'use strict';
  var d = document;
  var html = d.documentElement;
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenis = null;

  function cada(sel, fn, raiz) { Array.prototype.forEach.call((raiz || d).querySelectorAll(sel), fn); }
  function seguro(nombre, fn) { try { fn(); } catch (e) { console.error('[propuesta-5] ' + nombre, e); } }

  // 1 · Datos del negocio desde lib/datos.js (el HTML ya los lleva escritos; esto solo los mantiene iguales)
  seguro('datos', function () {
    var U = window.UAL;
    if (!U) return;
    cada('[data-ual="booksy"]', function (a) { a.href = U.booksy; });
    cada('[data-ual-wa]', function (a) { a.href = U.whatsapp(a.getAttribute('data-ual-wa'), 'es'); });
  });

  // 2 · Intro: se salta tocando la pantalla o con una tecla; al terminar se quita del todo
  seguro('intro', function () {
    var intro = d.querySelector('.intro');
    if (!intro || !html.classList.contains('con-intro')) return;
    function quitar() { intro.style.display = 'none'; html.classList.remove('con-intro'); }
    function saltar() {
      if (intro.classList.contains('fuera')) return;
      intro.classList.add('fuera');
      setTimeout(quitar, 220);
    }
    intro.addEventListener('pointerdown', saltar);
    d.addEventListener('keydown', saltar, { once: true });
    intro.addEventListener('animationend', function (e) { if (e.target === intro) quitar(); });
    setTimeout(quitar, 1600); // por si el navegador no lanza animationend
  });

  // 3 · Scroll suave (Lenis). Con movimiento reducido, scroll normal.
  seguro('lenis', function () {
    if (reducido || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    function bucle(t) { lenis.raf(t); requestAnimationFrame(bucle); }
    requestAnimationFrame(bucle);
  });

  // Enlaces a secciones de esta página: bajan con suavidad y dejan el foco en el destino
  function alturaCabecera() {
    var c = d.getElementById('cabecera');
    return c ? c.getBoundingClientRect().height : 0;
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var destino = d.getElementById(id.slice(1));
    if (!destino) return;
    e.preventDefault();
    cerrarMenu();
    var extra = destino.classList.contains('corte') ? -Math.round(window.innerWidth * 0.04) : 0;
    if (lenis) {
      lenis.scrollTo(destino, { offset: -alturaCabecera() - extra, duration: 1.1 });
    } else {
      var y = destino.getBoundingClientRect().top + window.pageYOffset - alturaCabecera() - extra;
      window.scrollTo({ top: y, behavior: reducido ? 'auto' : 'smooth' });
    }
    if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
    destino.focus({ preventScroll: true });
    if (history.pushState) history.pushState(null, '', id);
  });

  // 4 · Menú del móvil
  var botonMenu = d.querySelector('.cab-menu');
  var menu = d.getElementById('menu-movil');
  function cerrarMenu(devolverFoco) {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    botonMenu.setAttribute('aria-expanded', 'false');
    botonMenu.querySelector('.cab-menu-txt').textContent = 'Menú';
    botonMenu.removeAttribute('aria-label');
    if (devolverFoco) botonMenu.focus();
  }
  seguro('menu', function () {
    if (!botonMenu || !menu) return;
    botonMenu.addEventListener('click', function () {
      var abrir = menu.hidden;
      menu.hidden = !abrir;
      botonMenu.setAttribute('aria-expanded', String(abrir));
      botonMenu.querySelector('.cab-menu-txt').textContent = abrir ? 'Cerrar' : 'Menú';
      if (abrir) botonMenu.setAttribute('aria-label', 'Cerrar menú'); else botonMenu.removeAttribute('aria-label');
      if (abrir) { var primero = menu.querySelector('a'); if (primero) primero.focus(); }
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(true); });
    d.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && !botonMenu.contains(e.target)) cerrarMenu();
    });
  });

  // 5 · Selector «Pedir cita» (dialog nativo: Esc cierra, el foco queda dentro y vuelve al botón).
  // En el HTML, «Pedir cita» es un enlace a ../contacto/: si el JS no llega, sigue llevando a pedir cita.
  // Con JS se convierte en botón que abre el selector.
  seguro('cita', function () {
    var dialogo = d.getElementById('cita');
    if (!dialogo || typeof dialogo.showModal !== 'function') return;
    var origen = null;
    cada('[data-abre-cita]', function (b) {
      b.setAttribute('role', 'button');
      b.setAttribute('aria-haspopup', 'dialog');
      b.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); b.click(); }
      });
      b.addEventListener('click', function (e) {
        e.preventDefault();
        origen = b;
        cerrarMenu();
        dialogo.showModal();
        if (lenis) lenis.stop();
        var primero = dialogo.querySelector('.cita-op .btn');
        if (primero) primero.focus();
      });
    });
    cada('[data-cierra-cita]', function (b) { b.addEventListener('click', function () { dialogo.close(); }); });
    // Tocar fuera del panel también cierra
    dialogo.addEventListener('click', function (e) {
      if (e.target !== dialogo) return;
      var r = dialogo.getBoundingClientRect();
      var dentro = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!dentro) dialogo.close();
    });
    dialogo.addEventListener('close', function () {
      if (lenis) lenis.start();
      if (origen) origen.focus();
    });
  });

  // 6 · Palabras gigantes: del 90 % al 100 % y de transparente a opaca al entrar (600 ms, una vez)
  // (Si este archivo no llega, el CSS las muestra solas a los 4 s: ver .revela en estilo.css)
  seguro('revela', function () {
    var elementos = d.querySelectorAll('.revela');
    if (!('IntersectionObserver' in window)) { cada('.revela', function (el) { el.classList.add('visible'); }); html.classList.add('revela-lista'); return; }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -3% 0px', threshold: 0.01 });
    Array.prototype.forEach.call(elementos, function (el) { io.observe(el); });
    html.classList.add('revela-lista');
  });

  // 7 · Relieve 3D de las tarjetas: como mucho 6°, solo con ratón (pointer: fine); en el móvil, quietas
  seguro('relieve', function () {
    if (reducido || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var MAX = 6;
    cada('.tarjeta', function (t) {
      var pendiente = 0;
      t.addEventListener('pointermove', function (e) {
        var r = t.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(pendiente);
        pendiente = requestAnimationFrame(function () {
          t.classList.add('inclinando');
          t.style.setProperty('--rx', (-y * 2 * MAX).toFixed(2) + 'deg');
          t.style.setProperty('--ry', (x * 2 * MAX).toFixed(2) + 'deg');
          t.style.setProperty('--sx', (-x * 22).toFixed(1) + 'px');
          t.style.setProperty('--sy', (-y * 14 + 6).toFixed(1) + 'px');
        });
      });
      t.addEventListener('pointerleave', function () {
        cancelAnimationFrame(pendiente);
        t.classList.remove('inclinando');
        t.style.setProperty('--rx', '0deg');
        t.style.setProperty('--ry', '0deg');
        t.style.setProperty('--sx', '0px');
        t.style.setProperty('--sy', '0px');
      });
    });
  });

  // 8 · Carrusel manual del Tattoo Box (sin pase automático)
  seguro('carrusel', function () {
    var lista = d.getElementById('carrusel');
    if (!lista) return;
    var botones = d.querySelectorAll('.carrusel-btn');
    function paso() {
      var li = lista.querySelector('li');
      var gap = parseFloat(getComputedStyle(lista).columnGap) || 14;
      return li ? li.getBoundingClientRect().width + gap : lista.clientWidth * 0.8;
    }
    function estado() {
      var max = lista.scrollWidth - lista.clientWidth - 2;
      botones[0].setAttribute('aria-disabled', String(lista.scrollLeft <= 2));
      botones[1].setAttribute('aria-disabled', String(lista.scrollLeft >= max));
    }
    Array.prototype.forEach.call(botones, function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        lista.scrollBy({ left: Number(b.getAttribute('data-dir')) * paso(), behavior: reducido ? 'auto' : 'smooth' });
      });
    });
    lista.addEventListener('scroll', function () { requestAnimationFrame(estado); }, { passive: true });
    window.addEventListener('resize', estado);
    estado();
  });

  // 9 · «Abierto ahora» de Beauty Box y Barber Box (Tattoo Box va con cita)
  seguro('horario', function () {
    var U = window.UAL;
    if (!U) return;
    var dias = ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'];
    function min(h) { var p = h.split(':'); return +p[0] * 60 + +p[1]; }
    function bonita(h) { return h.replace(/^0/, ''); }
    // Hora de Lleida (Europe/Madrid), no la del móvil de quien mira: si está de viaje, el estado sigue siendo el del local
    function ahoraEnLleida() {
      try {
        var partes = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
        var o = {};
        partes.forEach(function (p) { o[p.type] = p.value; });
        var n = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
        if (n === undefined) throw new Error('día');
        return { dia: n, min: (+o.hour % 24) * 60 + +o.minute };
      } catch (e) {
        var f = new Date();
        return { dia: f.getDay(), min: f.getHours() * 60 + f.getMinutes() };
      }
    }
    var ahora = ahoraEnLleida();
    var hoy = ahora.dia;
    var m = ahora.min;
    cada('[data-estado]', function (el) {
      var box = U.boxes[el.getAttribute('data-estado')];
      if (!box || !box.horario) return;
      var tramos = box.horario[hoy] || [];
      for (var i = 0; i < tramos.length; i++) {
        if (m >= min(tramos[i][0]) && m < min(tramos[i][1])) {
          el.textContent = 'Abierto ahora · cierra a las ' + bonita(tramos[i][1]);
          el.classList.add('abierto');
          return;
        }
        if (m < min(tramos[i][0])) { el.textContent = 'Cerrado ahora · abre a las ' + bonita(tramos[i][0]); return; }
      }
      for (var k = 1; k <= 7; k++) {
        var dia = (hoy + k) % 7;
        var t = box.horario[dia] || [];
        if (t.length) { el.textContent = 'Cerrado ahora · abre ' + dias[dia] + ' a las ' + bonita(t[0][0]); return; }
      }
    });
  });
})();
