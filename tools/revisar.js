// Revisión automática de una página con Chrome (puppeteer), en móvil (390 px) con red 4G lenta y CPU ralentizada.
// Informa de: scroll horizontal (y qué elementos se salen), peticiones a terceros, peso total, LCP,
// imágenes sin alt / sin width-height / sin lazy, encabezados, enlaces vacíos, texto pequeño y errores de consola.
// Uso: node tools/revisar.js <url> [desktop]
const fs = require('fs');
const puppeteer = require('puppeteer');

const [,, url, modo = 'mobile'] = process.argv;
if (!url) { console.log('Uso: node tools/revisar.js <url> [desktop]'); process.exit(1); }

function chromeDelSistema() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  return ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe']
    .find((c) => fs.existsSync(c));
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: chromeDelSistema(), args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const movil = modo !== 'desktop';
  if (movil) {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  } else {
    await page.setViewport({ width: 1440, height: 900 });
  }
  await page.evaluateOnNewDocument(() => {
    window.__lcp = null;
    new PerformanceObserver((l) => {
      const e = l.getEntries().at(-1);
      window.__lcp = { t: Math.round(e.startTime), el: e.element ? (e.element.tagName + (e.element.className ? '.' + String(e.element.className).split(' ')[0] : '') + (e.element.currentSrc ? ' ' + e.element.currentSrc.split('/').pop() : '')) : null };
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  const origen = new URL(url).origin;
  const terceros = new Set();
  const avisos = [];
  let bytes = 0;
  let peticiones = 0;
  page.on('response', async (r) => {
    peticiones++;
    if (!r.url().startsWith(origen) && !r.url().startsWith('data:')) terceros.add(r.url().split('?')[0]);
    if (r.status() >= 400) avisos.push(r.status() + ' ' + r.url());
    try { const len = r.headers()['content-length']; bytes += len ? +len : (await r.buffer()).length; } catch (e) { /* redirecciones */ }
  });
  page.on('console', (m) => { if (['error', 'warn', 'warning'].includes(m.type())) avisos.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => avisos.push('pageerror: ' + e.message));

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  const cargaMs = Date.now() - t0;
  await new Promise((r) => setTimeout(r, 1500));
  // Bajar hasta el final para que carguen las imágenes diferidas y se vea si algo se sale al animar
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await new Promise((r) => setTimeout(r, 800));

  const info = await page.evaluate(() => {
    const vw = window.innerWidth;
    const fuera = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width && (r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed' && !el.closest('[aria-hidden="true"]')) {
        let p = el.parentElement; let recortado = false;
        while (p) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') { recortado = true; break; } p = p.parentElement; }
        if (!recortado) fuera.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + ` (${Math.round(r.left)}→${Math.round(r.right)})`);
      }
    });
    const imgs = [...document.images];
    const pliegue = window.innerHeight;
    const texto = [...document.querySelectorAll('p, li, a, span, td, th, dd, dt, label, button')].filter((e) => e.offsetParent && e.textContent.trim().length > 2);
    const pequenos = new Set(texto.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 14).map((e) => e.tagName.toLowerCase() + ' ' + parseFloat(getComputedStyle(e).fontSize) + 'px «' + e.textContent.trim().slice(0, 30) + '»'));
    return {
      scrollHorizontal: document.documentElement.scrollWidth > vw ? `SÍ: ancho ${document.documentElement.scrollWidth} > ${vw}` : 'no',
      elementosQueSeSalen: fuera.slice(0, 15),
      altoPagina: document.documentElement.scrollHeight,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '(falta)',
      robots: document.querySelector('meta[name="robots"]')?.content || '(sin meta robots)',
      lang: document.documentElement.lang,
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 80)),
      encabezados: [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ' ' + h.textContent.trim().slice(0, 50)),
      imagenesSinAlt: imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.src.split('/').pop()),
      imagenesSinTamano: imgs.filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).map((i) => i.src.split('/').pop()),
      imagenesBajoPliegueSinLazy: imgs.filter((i) => i.getBoundingClientRect().top > pliegue * 1.2 && i.loading !== 'lazy').map((i) => i.src.split('/').pop()),
      enlacesVacios: [...document.querySelectorAll('a')].filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').map((a) => a.textContent.trim().slice(0, 30) || a.outerHTML.slice(0, 60)),
      blankSinNoopener: [...document.querySelectorAll('a[target="_blank"]')].filter((a) => !/noopener/.test(a.rel)).map((a) => a.href),
      botonesSinNombre: [...document.querySelectorAll('a, button')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.querySelector('img[alt]:not([alt=""])')).map((b) => b.outerHTML.slice(0, 80)),
      textoMenorDe14px: [...pequenos].slice(0, 12),
      lcp: window.__lcp,
    };
  });
  console.log(JSON.stringify({ url, modo: movil ? 'móvil 390 px, 4G lenta, CPU x4' : 'escritorio 1440 px', cargaMs, peticiones, pesoKB: Math.round(bytes / 1024), terceros: [...terceros], avisos: avisos.slice(0, 20), ...info }, null, 2));
  await browser.close();
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
