// Capturas de la web con Chrome sin interfaz (puppeteer) para revisar el diseño.
// Copiar a tools/ del proyecto; puppeteer se instala en tools/ con:
//   cd tools && PUPPETEER_SKIP_DOWNLOAD=1 npm i
// Usa el Chrome del sistema (el que descarga puppeteer lo bloquea el Control de aplicaciones de Windows).
// Otra ruta de Chrome: variable PUPPETEER_EXECUTABLE_PATH.
//
// Uso: node tools/capturas.js <url> <desktop|mobile> <prefijo> paso paso ...
//   paso = nombre:y=1234      desplazarse a esa altura
//          nombre:y=+600      desplazarse 600 px más
//          nombre:.selector   llevar ese elemento arriba
//          nombre:hover=.sel  pasar el ratón por encima
//          nombre:full        página entera
// Guarda los PNG en tools/capturas/ (o en CAPTURAS_DIR) y escribe en consola los errores y avisos de la página.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const [,, url, modo = 'desktop', prefijo = 'captura', ...pasos] = process.argv;
if (!url) {
  console.log('Uso: node capturas.js <url> <desktop|mobile> <prefijo> nombre:y=0 nombre:.selector nombre:full');
  process.exit(1);
}
const salida = process.env.CAPTURAS_DIR || path.join(__dirname, 'capturas');
fs.mkdirSync(salida, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function chromeDelSistema() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidatos = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ];
  return candidatos.find((c) => fs.existsSync(c));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromeDelSistema(),
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  if (modo === 'mobile') {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  } else {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  }
  const avisos = [];
  // 'warn' en puppeteer actual ('warning' en versiones viejas): los try/catch que solo avisan también cuentan
  page.on('console', (m) => { if (['error', 'warn', 'warning'].includes(m.type())) avisos.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => avisos.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => avisos.push('falló: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) avisos.push(r.status() + ': ' + r.url()); });

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await espera(1500);
  const hechas = [];
  for (const paso of (pasos.length ? pasos : ['inicio:y=0'])) {
    const i = paso.indexOf(':');
    const nombre = paso.slice(0, i);
    const objetivo = paso.slice(i + 1);
    const archivo = path.join(salida, prefijo + '-' + nombre + '.png');
    if (objetivo === 'full') {
      await page.screenshot({ path: archivo, fullPage: true, captureBeyondViewport: false });
      hechas.push(archivo);
      continue;
    }
    if (objetivo.startsWith('hover=')) {
      await page.hover(objetivo.slice(6));
      await espera(500);
    } else if (objetivo.startsWith('y=+')) {
      await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'instant' }), +objetivo.slice(3));
    } else if (objetivo.startsWith('y=')) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), +objetivo.slice(2));
    } else {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, objetivo);
    }
    await espera(1300);
    await page.screenshot({ path: archivo, captureBeyondViewport: false });
    hechas.push(archivo);
  }
  const alto = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(JSON.stringify({ capturas: hechas, altoPagina: alto, avisos: avisos.slice(0, 20) }, null, 2));
  await browser.close();
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
