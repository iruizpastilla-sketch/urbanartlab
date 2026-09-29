#!/usr/bin/env node
// Descarga el icono que Google tiene guardado para un dominio (el que sale junto a los resultados de
// búsqueda y en el selector de propiedades de Search Console) y el icono que declara la propia web,
// para comparar a simple vista si Google ya se ha actualizado. Google tarda de días a semanas.
// Copiar a tools/ del proyecto. Sin dependencias. Uso:
//   node tools/icono-google.js dominio.com
// Guarda los PNG en tools/capturas/ y avisa si el de Google ha cambiado desde la última descarga.
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const dominio = (process.argv[2] || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
if (!dominio) { console.log('Uso: node icono-google.js dominio.com'); process.exit(1); }
const salida = process.env.CAPTURAS_DIR || path.join(__dirname, 'capturas');
fs.mkdirSync(salida, { recursive: true });

function bajar(url, redirecciones = 3) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirecciones > 0) {
        res.resume();
        resolve(bajar(new URL(res.headers.location, url).href, redirecciones - 1));
        return;
      }
      const t = [];
      res.on('data', (c) => t.push(c));
      res.on('end', () => resolve({ status: res.statusCode, tipo: res.headers['content-type'] || '', buf: Buffer.concat(t) }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}
const huella = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

(async () => {
  const sello = new Date().toLocaleString('sv-SE').replace(/\D/g, '').slice(0, 14); // hora local AAAAMMDDhhmmss
  // 1. Lo que tiene guardado Google
  const g = await bajar('https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://' + dominio + '&size=64&nc=' + Date.now());
  if (g.error || g.status !== 200) { console.log('Google no devuelve icono (' + (g.error || g.status) + ')'); }
  else {
    const nombre = 'icono-google-' + dominio + '-' + sello + '.png';
    const previos = fs.readdirSync(salida).filter((f) => f.startsWith('icono-google-' + dominio + '-') && f !== nombre).sort();
    const archivo = path.join(salida, nombre);
    fs.writeFileSync(archivo, g.buf);
    let comparacion = 'primera descarga';
    if (previos.length) {
      const anterior = fs.readFileSync(path.join(salida, previos[previos.length - 1]));
      comparacion = huella(anterior) === huella(g.buf) ? 'IGUAL que la descarga anterior (' + previos[previos.length - 1] + ')' : 'HA CAMBIADO desde ' + previos[previos.length - 1];
    }
    console.log('Icono guardado por Google: ' + archivo + ' (' + g.buf.length + ' bytes) — ' + comparacion);
  }
  // 2. Lo que declara la web
  const home = await bajar('https://' + dominio + '/');
  if (home.error || home.status !== 200) { console.log('No se puede leer la portada (' + (home.error || home.status) + ')'); return; }
  const html = home.buf.toString('utf8');
  const m = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
  if (!m) { console.log('La portada no declara <link rel="icon">'); return; }
  const url = new URL(m[1], 'https://' + dominio + '/').href;
  const w = await bajar(url);
  if (w.error || w.status !== 200) { console.log('El icono declarado no se descarga: ' + url + ' (' + (w.error || w.status) + ')'); return; }
  const ext = /svg/.test(w.tipo) ? '.svg' : /icon/.test(w.tipo) ? '.ico' : '.png';
  const archivoWeb = path.join(salida, 'icono-web-' + dominio + ext);
  fs.writeFileSync(archivoWeb, w.buf);
  console.log('Icono que declara la web: ' + url + ' → ' + archivoWeb);
  console.log('Abre los dos archivos para compararlos (Google lo recomprime, así que no coinciden byte a byte).');
})();
