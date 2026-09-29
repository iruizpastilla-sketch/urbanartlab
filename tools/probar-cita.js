// Prueba del selector «Pedir cita» y de la página sin JS / con movimiento reducido.
// Uso: node tools/probar-cita.js <url> [carpeta-capturas]
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const [,, url, carpeta = 'tools/capturas/revision'] = process.argv;
if (!url) { console.log('Uso: node tools/probar-cita.js <url> [carpeta]'); process.exit(1); }
fs.mkdirSync(carpeta, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((c) => fs.existsSync(c));

async function activo(page) {
  return page.evaluate(() => {
    const a = document.activeElement;
    if (!a) return null;
    const dentro = !!a.closest('dialog');
    const cs = getComputedStyle(a);
    return {
      tag: a.tagName.toLowerCase(),
      texto: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
      href: a.getAttribute('href'),
      enDialogo: dentro,
      foco: a.matches(':focus-visible') ? (cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor) : 'sin :focus-visible',
    };
  });
}
const abierto = (page) => page.evaluate(() => document.getElementById('cita').open);

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] });
  const res = {};

  for (const modo of ['mobile', 'desktop']) {
    const page = await browser.newPage();
    if (modo === 'mobile') await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    else await page.setViewport({ width: 1440, height: 900 });
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => { if (['error', 'warn'].includes(m.type())) errores.push(m.text()); });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await espera(500);
    const r = { errores };

    // 1. Teclado: Tab hasta el «Pedir cita» de la cabecera y Enter
    let enBoton = false;
    for (let i = 0; i < 12 && !enBoton; i++) {
      await page.keyboard.press('Tab');
      const a = await activo(page);
      if (a && a.texto === 'Pedir cita') enBoton = true;
    }
    r.tabHastaPedirCita = enBoton;
    await page.keyboard.press('Enter');
    await espera(500);
    r.abreConEnter = await abierto(page);
    r.focoAlAbrir = await activo(page);
    await page.screenshot({ path: path.join(carpeta, modo + '-cita-teclado.png') });

    // Recorrer el diálogo con Tab: ¿se queda dentro?
    const recorrido = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const a = await activo(page);
      recorrido.push((a && a.enDialogo ? 'dentro' : 'FUERA') + ' · ' + (a ? a.texto : 'null'));
    }
    r.recorridoTab = recorrido;
    await page.keyboard.press('Tab');
    await espera(200);
    await page.screenshot({ path: path.join(carpeta, modo + '-cita-foco.png') });

    // 2. Esc cierra y el foco vuelve al botón
    await page.keyboard.press('Escape');
    await espera(400);
    r.cierraConEsc = !(await abierto(page));
    r.focoTrasEsc = await activo(page);

    // 3. Ratón: abrir con el botón de la portada y cerrar con «Cerrar»
    await page.click('.hero__acciones [data-abre-cita]');
    await espera(500);
    r.abreConClic = await abierto(page);
    await page.screenshot({ path: path.join(carpeta, modo + '-cita-abierto.png') });
    r.enlaces = await page.evaluate(() => [...document.querySelectorAll('#cita a')].map((a) => a.textContent.trim().replace(/\s+/g, ' ') + ' → ' + a.href + (a.target ? ' [' + a.target + ' ' + a.rel + ']' : '')));
    await page.click('[data-cierra-cita]');
    await espera(400);
    r.cierraConBoton = !(await abierto(page));

    // 4. Clic en el fondo cierra
    await page.click('.hero__acciones [data-abre-cita]');
    await espera(500);
    await page.mouse.click(modo === 'mobile' ? 195 : 40, modo === 'mobile' ? 30 : 450);
    await espera(400);
    r.cierraConFondo = !(await abierto(page));

    // 5. Menú del móvil
    if (modo === 'mobile') {
      await page.click('[data-menu]');
      await espera(300);
      r.menuAbre = await page.evaluate(() => document.getElementById('menu').classList.contains('abierto'));
      await page.screenshot({ path: path.join(carpeta, 'mobile-menu.png') });
      await page.keyboard.press('Escape');
      await espera(200);
      r.menuCierraConEsc = await page.evaluate(() => !document.getElementById('menu').classList.contains('abierto'));
    }
    res[modo] = r;
    await page.close();
  }

  // 6. Sin JS: el contenido se ve y «Pedir cita» baja a #pide-cita
  {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: 'networkidle0' });
    res.sinJS = await page.evaluate(() => {
      const ocultos = [...document.querySelectorAll('[data-revela]')].filter((e) => getComputedStyle(e).opacity === '0').length;
      const cab = document.querySelector('.cabecera [data-abre-cita]');
      return { bloquesInvisibles: ocultos, pedirCitaHref: cab && cab.getAttribute('href'), destinoExiste: !!document.querySelector(cab.getAttribute('href')), horarioEnHTML: document.querySelector('.horario dl').textContent.replace(/\s+/g, ' ').trim() };
    });
    await page.screenshot({ path: path.join(carpeta, 'mobile-sin-js.png'), fullPage: true, captureBeyondViewport: false });
    await page.close();
  }

  // 7. Movimiento reducido: sin trazo animado, sin Lenis, apariciones solo con fundido
  {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport({ width: 1440, height: 900 });
    // Sin navigator.webdriver para que se active la aparición
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await espera(800);
    res.movimientoReducido = await page.evaluate(() => {
      const trazo = document.querySelector('.trazo path');
      const b = document.querySelector('.espacios [data-revela]');
      return {
        trazoAnimacion: getComputedStyle(trazo).animationName,
        trazoDibujado: getComputedStyle(trazo).strokeDashoffset,
        lenisCargado: !!window.Lenis,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        revelaTransform: getComputedStyle(b).transform,
        revelaTransicion: getComputedStyle(b).transitionProperty,
      };
    });
    await page.close();
  }

  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
