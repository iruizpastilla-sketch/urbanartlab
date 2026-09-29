// Propuesta 1 · «Negro y cobre». Sin librerías.
// Lee los datos de ../lib/datos.js (window.UAL): WhatsApp con mensaje y horarios para «abierto ahora».
(function () {
  'use strict';
  var U = window.UAL || null;
  var raiz = document.documentElement;
  var menosMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Enlaces de WhatsApp con el mensaje ya escrito (un solo sitio para cambiarlo: datos.js)
  if (U && typeof U.whatsapp === 'function') {
    document.querySelectorAll('[data-wa]').forEach(function (a) {
      try { a.href = U.whatsapp(a.getAttribute('data-wa'), 'es'); } catch (e) { /* se queda el enlace escrito en el HTML */ }
    });
  }

  // 2. Selector «Pedir cita» (dialog nativo: Esc cierra y el resto de la página queda inerte)
  var dlg = document.getElementById('cita');
  var abridor = null;
  document.querySelectorAll('[data-abrir-cita]').forEach(function (b) {
    b.addEventListener('click', function () {
      // Sin <dialog> (navegadores muy antiguos): el selector se muestra como sección y se baja a él
      if (!dlg || typeof dlg.showModal !== 'function') { raiz.classList.add('sin-dialogo'); location.hash = 'cita'; return; }
      abridor = b;
      cerrarMenu();
      dlg.showModal();
    });
  });
  if (dlg) {
    dlg.querySelectorAll('[data-cerrar-cita]').forEach(function (b) {
      b.addEventListener('click', function () { dlg.close(); });
    });
    // Clic fuera del panel (en el fondo oscuro) también cierra
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (abridor) abridor.focus(); });
  }

  // 3. Menú del móvil
  var botonMenu = document.querySelector('.boton-menu');
  var menu = document.getElementById('menu');
  function cerrarMenu() {
    if (!botonMenu || !menu) return;
    botonMenu.setAttribute('aria-expanded', 'false');
    botonMenu.textContent = 'Menú';
    menu.classList.remove('abierto');
  }
  if (botonMenu && menu) {
    botonMenu.addEventListener('click', function () {
      var abrir = botonMenu.getAttribute('aria-expanded') !== 'true';
      botonMenu.setAttribute('aria-expanded', String(abrir));
      botonMenu.textContent = abrir ? 'Cerrar menú' : 'Menú';
      menu.classList.toggle('abierto', abrir);
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) cerrarMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('abierto')) { cerrarMenu(); botonMenu.focus(); }
    });
  }

  // 4. «Abierto ahora» por box, con la hora de Lleida
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function ahora() {
    try {
      var partes = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      var o = {};
      partes.forEach(function (p) { o[p.type] = p.value; });
      var d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
      if (d < 0) throw new Error('día');
      return { d: d, m: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) {
      var n = new Date();
      return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() };
    }
  }
  function minutos(h) { var a = h.split(':'); return (+a[0]) * 60 + (+a[1]); }
  function hora(h) { return h.replace(/^0/, ''); }
  function estado(horario, t) {
    var hoy = horario[t.d] || [];
    var i;
    for (i = 0; i < hoy.length; i++) {
      if (t.m >= minutos(hoy[i][0]) && t.m < minutos(hoy[i][1])) {
        return { abierto: true, texto: 'Abierto ahora · cierra a las ' + hora(hoy[i][1]) };
      }
    }
    for (i = 0; i < hoy.length; i++) {
      if (t.m < minutos(hoy[i][0])) return { abierto: false, texto: 'Cerrado ahora · abre a las ' + hora(hoy[i][0]) };
    }
    for (i = 1; i <= 7; i++) {
      var d = (t.d + i) % 7;
      var tramos = horario[d];
      if (tramos && tramos.length) {
        return { abierto: false, texto: 'Cerrado ahora · abre el ' + DIAS[d] + ' a las ' + hora(tramos[0][0]) };
      }
    }
    return null;
  }
  if (U && U.boxes) {
    var t = ahora();
    document.querySelectorAll('[data-estado]').forEach(function (el) {
      var box = U.boxes[el.getAttribute('data-estado')];
      if (!box || !box.horario) return; // Tattoo Box: «Con cita» (ya escrito en el HTML)
      var e = estado(box.horario, t);
      if (!e) return;
      el.textContent = e.texto;
      el.classList.add(e.abierto ? 'abierto' : 'cerrado');
      el.hidden = false;
    });
    // Marca el día de hoy en la tabla de horarios
    document.querySelectorAll('[data-dias]').forEach(function (fila) {
      var dias = fila.getAttribute('data-dias').split(',').map(Number);
      if (dias.indexOf(t.d) > -1) fila.classList.add('hoy');
    });
  }

  // 5. Aparición al entrar en pantalla (una sola vez)
  var aparecen = document.querySelectorAll('.revela');
  if ('IntersectionObserver' in window && aparecen.length) {
    raiz.classList.add('revela-on');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    aparecen.forEach(function (el) { io.observe(el); });
  }

  // 6. Fila de trabajos: se mueve con el dedo; con ratón, también con las flechas
  var fila = document.querySelector('.fila');
  document.querySelectorAll('[data-fila]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!fila) return;
      var item = fila.querySelector('.fila__item');
      var paso = item ? item.getBoundingClientRect().width + 20 : 320;
      var dir = b.getAttribute('data-fila') === 'sig' ? 1 : -1;
      fila.scrollBy({ left: dir * paso * 2, behavior: menosMovimiento ? 'auto' : 'smooth' });
    });
  });
})();
