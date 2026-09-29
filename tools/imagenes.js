// Prepara las imágenes de la web desde imagenes/origen/ (no se publica) a imagenes/web/.
// WebP calidad 80 en varios anchos (sin ampliar nunca) y un manifiesto con tamaños y textos alternativos.
// Uso: node tools/imagenes.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const raiz = path.join(__dirname, '..');
const origen = path.join(raiz, 'imagenes', 'origen');
const destino = path.join(raiz, 'imagenes', 'web');
fs.mkdirSync(destino, { recursive: true });

// nombre final, archivo de origen, anchos deseados, texto alternativo (es / ca), box
const LISTA = [
  ['local-rotulo', 'booksy/b02-biz_photo.jpeg', [800, 1200], 'Rótulo de Urban Art Lab en relieve sobre pared de papel kraft', 'Rètol d\'Urban Art Lab en relleu sobre paret de paper kraft', 'local'],
  ['unas-blancas', 'booksy/b04-inspiration.jpeg', [480, 800, 1200], 'Manicura en tono blanco lechoso, uñas cortas y redondeadas', 'Manicura en to blanc lletós, ungles curtes i arrodonides', 'beauty'],
  ['unas-francesa-colores', 'booksy/b05-inspiration.jpeg', [480, 800, 1200], 'Manicura francesa con puntas de colores y flores pequeñas', 'Manicura francesa amb puntes de colors i flors petites', 'beauty'],
  ['unas-colores', 'booksy/b07-inspiration.jpeg', [480, 800, 1200], 'Uñas pintadas cada una de un color, con cuadros y lunares', 'Ungles pintades cadascuna d\'un color, amb quadres i pics', 'beauty'],
  ['unas-decoracion', 'booksy/b08-inspiration.jpeg', [480, 800, 1200], 'Uñas con decoración en relieve dorada y de colores', 'Ungles amb decoració en relleu daurada i de colors', 'beauty'],
  ['unas-rosa', 'booksy/b10-inspiration.jpeg', [480, 800, 1099], 'Manicura rosa en dos manos con pequeños tatuajes en la muñeca', 'Manicura rosa en dues mans amb petits tatuatges al canell', 'beauty'],
  ['manicura', 'web-actual/manicura.webp', [450], 'Manicura en tono nude con anillos dorados', 'Manicura en to nude amb anells daurats', 'beauty'],
  ['pedicura', 'web-actual/pedicura.webp', [499], 'Pedicura con esmalte blanco', 'Pedicura amb esmalt blanc', 'beauty'],
  ['depilacion-cejas', 'web-actual/Depilacio-celles.webp', [480, 800], 'Ceja antes y después de la depilación', 'Cella abans i després de la depilació', 'beauty'],
  ['tattoo-mano-alzada', 'web-actual/Disenos-a-mano-alzada.webp', [527], 'Tatuaje de dragón a mano alzada en el antebrazo', 'Tatuatge de drac a mà alçada a l\'avantbraç', 'tattoo'],
  ['tattoo-personalizado', 'web-actual/disenos-personalizados.webp', [532], 'Tatuaje personalizado de un ángel en la pierna', 'Tatuatge personalitzat d\'un àngel a la cama', 'tattoo'],
  ['tattoo-cover', 'web-actual/Cover-con-tattoo.webp', [526], 'Cover: flor en negro que tapa un tatuaje antiguo en el codo', 'Cover: flor en negre que tapa un tatuatge antic al colze', 'tattoo'],
  ['tattoo-arreglo', 'web-actual/Arreglo-de-tatuajes-2.webp', [379], 'Arreglo de tatuajes en los dedos, antes y después', 'Arranjament de tatuatges als dits, abans i després', 'tattoo'],
  ['tattoo-mini', 'web-actual/Mini-tattoos.webp', [559], 'Dos mini tattoos de mariposas geométricas a juego', 'Dos mini tattoos de papallones geomètriques a joc', 'tattoo'],
  ['tattoo-grupo', 'web-actual/Tattoos-en-grupo.webp', [523], 'Tatuajes en grupo: tres muñecas con el mismo diseño', 'Tatuatges en grup: tres canells amb el mateix disseny', 'tattoo'],
];

async function logo() {
  // El logo de Booksy (500x500 con fondo blanco): recortamos el círculo y dejamos fuera transparente.
  const src = path.join(origen, 'booksy', 'b01-logo.jpeg');
  const meta = await sharp(src).metadata();
  const d = Math.min(meta.width, meta.height);
  const mascara = Buffer.from(`<svg width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2 - 2}" fill="#fff"/></svg>`);
  const redondo = await sharp(src).resize(d, d).ensureAlpha().composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();
  const salidas = [];
  for (const w of [160, 320, 500]) {
    const f = `logo-${w}.webp`;
    await sharp(redondo).resize(w, w).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(destino, f));
    salidas.push({ archivo: f, ancho: w, alto: w });
  }
  await sharp(redondo).resize(500, 500).png().toFile(path.join(destino, 'logo-500.png'));
  return salidas;
}

(async () => {
  const manifiesto = { _nota: 'Generado por tools/imagenes.js. Rutas relativas a la raíz de la web.', imagenes: {} };
  for (const [nombre, archivo, anchos, altEs, altCa, box] of LISTA) {
    const src = path.join(origen, archivo);
    const base = sharp(src).rotate();
    const meta = await base.metadata();
    const ancho0 = meta.autoOrient ? meta.autoOrient.width : meta.width;
    const alto0 = meta.autoOrient ? meta.autoOrient.height : meta.height;
    const variantes = [];
    for (const w of [...new Set(anchos.map((a) => Math.min(a, ancho0)))]) {
      const h = Math.round((alto0 * w) / ancho0);
      const f = `${nombre}-${w}.webp`;
      await sharp(src).rotate().resize(w).webp({ quality: 80 }).toFile(path.join(destino, f));
      variantes.push({ archivo: `imagenes/web/${f}`, ancho: w, alto: h, kb: Math.round(fs.statSync(path.join(destino, f)).size / 1024) });
    }
    manifiesto.imagenes[nombre] = { box, alt_es: altEs, alt_ca: altCa, proporcion: `${ancho0}:${alto0}`, variantes };
  }
  manifiesto.logo = (await logo()).map((v) => ({ ...v, archivo: `imagenes/web/${v.archivo}` }));
  manifiesto.logo_png = 'imagenes/web/logo-500.png';
  fs.writeFileSync(path.join(destino, 'manifiesto.json'), JSON.stringify(manifiesto, null, 2));
  let total = 0;
  for (const f of fs.readdirSync(destino)) total += fs.statSync(path.join(destino, f)).size;
  console.log(`${Object.keys(manifiesto.imagenes).length} imágenes + logo · ${Math.round(total / 1024)} KB en imagenes/web/`);
})();
