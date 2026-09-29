#!/usr/bin/env node
// Revisa una web publicada a partir de su sitemap: que cada página responda 200, sin noindex y con la
// canonical correcta; los recursos básicos (robots, sitemap, favicon.ico, iconos, imagen para compartir,
// página 404); que los archivos internos no se sirvan; las redirecciones de http y www; y las cabeceras
// de seguridad de la portada.
// Copiar a tools/ del proyecto. Sin dependencias. Uso:
//   node tools/comprobar-lanzamiento.js https://dominio.com
//   node tools/comprobar-lanzamiento.js https://usuario.github.io/repo     (ensayo en la dirección de pruebas)
// En la dirección de pruebas, la canonical tiene que apuntar al dominio real (el de las <loc> del sitemap) y los
// recursos que la web declara con el dominio real o con ruta absoluta se buscan dentro de la dirección de pruebas.
const https = require('https');
const http = require('http');
const zlib = require('zlib');

const BASE = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(BASE)) {
  console.log('Uso: node comprobar-lanzamiento.js https://dominio.com');
  process.exit(1);
}
const ES_PRUEBAS = /\.github\.io$/i.test(new URL(BASE).hostname);

function pedir(url) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch (e) { resolve({ error: 'URL mal formada' }); return; }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.request(u, {
      method: 'GET',
      headers: { 'Accept-Encoding': 'br, gzip', 'User-Agent': 'Mozilla/5.0 (compatible; comprobar-lanzamiento/1.1)' },
      timeout: 20000,
    }, (res) => {
      const trozos = [];
      res.on('data', (c) => trozos.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(trozos);
        const enc = res.headers['content-encoding'];
        let cuerpo;
        try {
          if (enc === 'br') cuerpo = zlib.brotliDecompressSync(buf).toString('utf8');
          else if (enc === 'gzip') cuerpo = zlib.gunzipSync(buf).toString('utf8');
          else cuerpo = buf.toString('utf8');
        } catch (e) { cuerpo = buf.toString('utf8'); }
        resolve({ status: res.statusCode, headers: res.headers, cuerpo, bytes: buf.length });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'tiempo agotado' }); });
    req.end();
  });
}

// Sigue redirecciones (máximo 5) y devuelve el primer código, el destino final y cuántos saltos hubo
async function seguir(url) {
  let actual = url;
  let primero = null;
  for (let saltos = 0; saltos <= 5; saltos++) {
    const r = await pedir(actual);
    if (r.error) return { error: r.error };
    if (primero === null) primero = r.status;
    if (r.status >= 300 && r.status < 400 && r.headers.location) { actual = new URL(r.headers.location, actual).href; continue; }
    return { primero, final: actual, status: r.status, saltos };
  }
  return { error: 'demasiadas redirecciones (¿bucle?)' };
}

const sinIndex = (u) => u.replace(/index\.html$/, '');
const corto = (v, n) => { v = v == null ? '-' : String(v); return v.length > n ? v.slice(0, n - 1) + '~' : v; };
let fallos = 0;
const mal = (msg) => { fallos++; console.log('  ✗ ' + msg); };

(async () => {
  console.log('Web: ' + BASE + (ES_PRUEBAS ? '  (dirección de pruebas)' : ''));

  // 1. Sitemap
  const sm = await pedir(BASE + '/sitemap.xml');
  if (sm.error || sm.status !== 200) { console.log('No se puede leer el sitemap (' + (sm.error || sm.status) + ')'); process.exit(1); }
  const locs = [...sm.cuerpo.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (!locs.length) { console.log('El sitemap no tiene ninguna <loc>'); process.exit(1); }
  const origenReal = new URL(locs[0]).origin;
  console.log('Sitemap: ' + locs.length + ' páginas; dominio real según el sitemap: ' + origenReal + '\n');

  // Traduce una dirección de un recurso declarado en la web a donde hay que pedirlo ahora
  const resolver = (href, paginaUrl) => {
    let abs;
    if (/^https?:/i.test(href)) abs = href;
    else if (href.startsWith('/')) abs = BASE + href; // en pruebas, la raíz del sitio es BASE, no la de github.io
    else abs = new URL(href, paginaUrl).href;
    return abs.replace(origenReal, BASE);
  };

  // 2. Páginas
  console.log(['Página', 'Código', 'Content-Type', 'Comp.', 'Cache-Control', 'noindex', 'canonical'].join(' | '));
  let portada = null;
  for (const loc of locs) {
    const ruta = new URL(loc).pathname;
    const url = BASE + ruta;
    const r = await pedir(url);
    if (r.error) { console.log(ruta + ' | ERROR ' + r.error); fallos++; continue; }
    const h = r.headers;
    const esHtml = /text\/html/.test(h['content-type'] || '');
    let noindex = '-';
    let canon = '-';
    if (esHtml && r.status === 200) {
      const m = r.cuerpo.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
      noindex = (m && /noindex/i.test(m[0])) || /noindex/i.test(h['x-robots-tag'] || '') ? 'SÍ' : 'no';
      const c = r.cuerpo.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
        || r.cuerpo.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
      canon = !c ? 'SIN canonical' : (sinIndex(c[1]) === sinIndex(loc) ? 'ok' : 'NO → ' + c[1]);
      if (ruta === '/' || ruta === '') portada = { url, cuerpo: r.cuerpo, headers: h };
    }
    const loc3xx = r.status >= 300 && r.status < 400 ? ' → ' + h.location : '';
    console.log([ruta, r.status + loc3xx, corto(h['content-type'], 26), corto(h['content-encoding'], 5), corto(h['cache-control'], 30), noindex, canon].join(' | '));
    if (r.status !== 200) fallos++;
    else if (esHtml && (noindex !== 'no' || canon !== 'ok')) fallos++;
  }
  if (!portada) {
    const r = await pedir(BASE + '/');
    if (!r.error && r.status === 200) portada = { url: BASE + '/', cuerpo: r.cuerpo, headers: r.headers };
  }

  // 3. Recursos básicos
  console.log('\nRecursos:');
  const recursos = [
    ['/robots.txt', /text\/plain/, (r) => /Sitemap:/i.test(r.cuerpo) || 'sin línea Sitemap:'],
    ['/sitemap.xml', /xml/, null],
    ['/favicon.ico', /image\//, null],
  ];
  if (portada) {
    const deCabecera = (re) => { const m = portada.cuerpo.match(re); return m ? resolver(m[1], portada.url) : null; };
    const icono = deCabecera(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    const apple = deCabecera(/<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    const og = deCabecera(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (icono) recursos.push([icono, /image\//, null]); else mal('la portada no declara <link rel="icon">');
    if (apple) recursos.push([apple, /image\//, null]); else mal('la portada no declara apple-touch-icon');
    if (og) recursos.push([og, /image\//, null]); else mal('la portada no tiene og:image');
  }
  for (const [ruta, tipo, extra] of recursos) {
    const url = /^https?:/.test(ruta) ? ruta : BASE + ruta;
    const r = await pedir(url);
    const ok = !r.error && r.status === 200 && tipo.test(r.headers['content-type'] || '');
    const nota = ok && extra ? extra(r) : true;
    console.log('  ' + (ok && nota === true ? '✓' : '✗') + ' ' + url.replace(BASE, '') + ' → ' + (r.error || r.status + ' ' + (r.headers['content-type'] || '')) + (nota !== true ? ' (' + nota + ')' : ''));
    if (!ok || nota !== true) fallos++;
  }
  const r404 = await pedir(BASE + '/no-existe-' + Date.now() + '.html');
  console.log('  ' + (r404.status === 404 ? '✓' : '✗') + ' página inexistente → ' + (r404.error || r404.status) + (r404.status === 404 && /text\/html/.test(r404.headers['content-type'] || '') ? ' (con página 404 propia)' : ''));
  if (r404.status !== 404) fallos++;

  // 4. Archivos internos que no se deben servir
  console.log('\nArchivos internos (tienen que dar 404):');
  for (const ruta of ['/.ftp-deploy-sync-state.json', '/.git/HEAD', '/tools/', '/tools/package.json']) {
    const r = await pedir(BASE + ruta);
    const ok = !r.error && (r.status === 404 || r.status === 403);
    console.log('  ' + (ok ? '✓' : '✗') + ' ' + ruta + ' → ' + (r.error || r.status));
    if (!ok) fallos++;
  }

  // 5. Redirecciones (solo en el dominio real)
  if (!ES_PRUEBAS) {
    console.log('\nRedirecciones (tienen que acabar en la portada con https y sin www):');
    const host = new URL(BASE).hostname.replace(/^www\./, '');
    const destino = 'https://' + host + '/';
    for (const origen of ['http://' + host + '/', 'https://www.' + host + '/', 'http://www.' + host + '/']) {
      const s = await seguir(origen);
      const ok = !s.error && s.primero === 301 && s.final === destino && s.status === 200;
      console.log('  ' + (ok ? '✓' : '✗') + ' ' + origen + ' → ' + (s.error || s.primero + ' … ' + s.final + ' (' + s.status + ', ' + s.saltos + (s.saltos === 1 ? ' salto' : ' saltos') + ')'));
      if (!ok) fallos++;
    }
    const interior = locs.map((l) => new URL(l).pathname).find((p) => /\.html$/.test(p) && p !== '/index.html');
    if (interior) {
      const sinExt = interior.replace(/\.html$/, '');
      const r = await pedir(BASE + sinExt);
      const loc = (r.headers && r.headers.location) || '';
      const ok = (r.status === 301 && loc.indexOf(interior) >= 0) || r.status === 200;
      console.log('  ' + (ok ? '✓' : '·') + ' ' + sinExt + ' (sin .html) → ' + (r.error || r.status + ' ' + loc));
    }
  }

  // 6. Cabeceras de seguridad de la portada
  if (portada) {
    console.log('\nCabeceras de la portada' + (ES_PRUEBAS ? ' (GitHub Pages no permite las propias: es normal que falten)' : '') + ':');
    for (const k of ['strict-transport-security', 'x-frame-options', 'content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'x-powered-by']) {
      console.log('  ' + k + ': ' + (portada.headers[k] || '(ausente)'));
    }
    if (!ES_PRUEBAS) console.log('  (HSTS por fases: 300 el día del lanzamiento → 86400 al día siguiente → 31536000 al mes)');
  }

  console.log('\n' + (fallos === 0 ? 'RESULTADO: todo correcto' : 'RESULTADO: ' + fallos + ' comprobaciones fuera de lo esperado (revisar las marcadas con ✗)'));
  process.exit(fallos === 0 ? 0 : 1);
})();
