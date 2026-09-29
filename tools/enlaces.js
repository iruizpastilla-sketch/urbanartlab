#!/usr/bin/env node
// Comprueba los enlaces internos de la web: cada href/src/srcset/poster que apunte a un archivo del
// propio sitio tiene que existir, y cada ancla (#id) tiene que estar en la página de destino.
// Copiar a tools/ del proyecto. Uso:  node tools/enlaces.js            (revisa la carpeta padre de tools/)
//                                     node tools/enlaces.js <carpeta>  (revisa otra carpeta)
// Recorre todos los .html del proyecto (menos tools/, node_modules/, .git/, .github/, .claude/).
// Sale con código 1 si hay algo roto: ejecutarlo antes de cada publicación.
const fs = require('fs');
const path = require('path');

const RAIZ = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const IGNORAR = new Set(['tools', 'node_modules', '.git', '.github', '.claude']);

function paginasHtml(dir, rel = '') {
  let lista = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(e.name)) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) lista = lista.concat(paginasHtml(path.join(dir, e.name), r));
    else if (e.name.endsWith('.html') && !/^google[0-9a-f]+\.html$/.test(e.name)) lista.push(r);
  }
  return lista;
}

const paginas = paginasHtml(RAIZ);
const externo = /^(https?:|mailto:|tel:|sms:|data:|javascript:|\/\/|#$)/i;
const cacheIds = {};
function idsDe(rel) {
  if (!cacheIds[rel]) {
    const s = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    cacheIds[rel] = new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  }
  return cacheIds[rel];
}

const rotos = [];
const absolutas = new Set(); // rutas que empiezan por "/": valen en el dominio, pero se rompen en github.io/<repo>/
let total = 0;
for (const pag of paginas) {
  const html = fs.readFileSync(path.join(RAIZ, pag), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const refs = [];
  for (const m of html.matchAll(/\s(?:href|src|poster|data-src)="([^"]*)"/g)) refs.push(m[1]);
  for (const m of html.matchAll(/\s(?:srcset|data-srcset)="([^"]*)"/g)) {
    m[1].split(',').forEach((x) => refs.push(x.trim().split(/\s+/)[0]));
  }
  for (const ref of refs) {
    if (!ref || externo.test(ref)) continue;
    total++;
    const [ruta, ancla] = ref.split('#');
    const limpia = ruta.split('?')[0];
    if (limpia.startsWith('/') && pag !== '404.html') absolutas.add(pag + ' → ' + ref);
    let destino = pag;
    if (limpia) {
      const abs = limpia.startsWith('/') ? path.join(RAIZ, limpia) : path.resolve(RAIZ, path.dirname(pag), limpia);
      let fichero = abs;
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) fichero = path.join(abs, 'index.html');
      if (!fs.existsSync(fichero)) { rotos.push(pag + ' → ' + ref + ' (no existe)'); continue; }
      destino = path.relative(RAIZ, fichero).split(path.sep).join('/');
    }
    if (ancla && destino.endsWith('.html') && !idsDe(destino).has(ancla)) {
      rotos.push(pag + ' → ' + ref + ' (falta el id #' + ancla + ' en ' + destino + ')');
    }
  }
}

console.log(paginas.length + ' páginas, ' + total + ' referencias internas comprobadas');
if (absolutas.size) {
  console.log('AVISO: ' + absolutas.size + ' rutas absolutas (empiezan por "/"). En el dominio funcionan, pero en la dirección de pruebas (github.io/<repo>/) se rompen; mejor relativas:\n  ' + [...absolutas].slice(0, 15).join('\n  ') + (absolutas.size > 15 ? '\n  …' : ''));
}
if (rotos.length) {
  console.log('ROTOS (' + rotos.length + '):\n  ' + rotos.join('\n  '));
  process.exit(1);
}
console.log('Todo correcto: ningún enlace interno roto.');
